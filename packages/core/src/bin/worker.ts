import pg from "pg";
import { createClient } from "redis";
import { drain, runOneJob } from "../lib/queue.ts";
import { buildRegistry } from "../workers/registry.ts";
import { log } from "../lib/log.ts";

/**
 * The worker process.
 *
 * Same image as the web process, different entrypoint — so a deploy ships one
 * artifact — but it scales on queue depth rather than request rate, which is
 * why it gets its own autoscaling policy and its own process.
 */

const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;
const IDLE_SLEEP_MS = Number(process.env.WORKER_IDLE_SLEEP_MS ?? 1000);

if (!DATABASE_URL) {
  // Fail at boot rather than on the first job. A worker that starts and then
  // silently processes nothing is worse than one that refuses to start.
  log.error("worker.boot", { message: "DATABASE_URL is required" });
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: Number(process.env.PG_POOL_MAX ?? 10) });
const redis = REDIS_URL ? createClient({ url: REDIS_URL }) : null;

let running = true;
let inFlight = false;

async function main() {
  if (redis) {
    redis.on("error", (error) => log.error("worker.redis", { error: String(error) }));
    await redis.connect();
  } else {
    log.warn("worker.boot", {
      message: "no REDIS_URL — feed jobs will dead-letter with an explicit reason",
    });
  }

  const registry = buildRegistry(pool, {
    redis: redis as never,
    appUrl: process.env.APP_URL,
  });

  log.info("worker.started", { workers: Object.keys(registry).length, pid: process.pid });

  while (running) {
    inFlight = true;
    let worked = false;
    try {
      worked = await runOneJob(pool, registry);
    } catch (error) {
      // runOneJob already records per-job failures; reaching here means the
      // queue itself is unreachable, so back off rather than spin.
      log.error("worker.loop", { error: String(error) });
      await sleep(5000);
    } finally {
      inFlight = false;
    }
    if (!worked) await sleep(IDLE_SLEEP_MS);
  }

  log.info("worker.stopped", {});
  await shutdown();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shutdown() {
  await redis?.quit().catch(() => undefined);
  await pool.end().catch(() => undefined);
}

/**
 * Graceful stop: finish the job in hand, then exit. A worker killed mid-job
 * leaves the row locked, and the reaper only frees it after the stall timeout —
 * so the job is delayed by minutes rather than seconds.
 */
async function handleSignal(signal: string) {
  log.info("worker.signal", { signal });
  running = false;
  for (let i = 0; i < 100 && inFlight; i += 1) await sleep(100);
  await shutdown();
  process.exit(0);
}

process.on("SIGTERM", () => void handleSignal("SIGTERM"));
process.on("SIGINT", () => void handleSignal("SIGINT"));

// `--once` drains and exits: useful in CI, in tests, and for a one-shot
// container run after a deploy.
if (process.argv.includes("--once")) {
  const registry = buildRegistry(pool, { redis: redis as never });
  if (redis) await redis.connect();
  const count = await drain(pool, registry);
  log.info("worker.drained", { count });
  await shutdown();
  process.exit(0);
} else {
  await main();
}
