import pg from "pg";
import { runService } from "../services/run_service.ts";
import { ExpireEmploymentVerificationsService } from "../services/verify_employment_service.ts";
import { log } from "../lib/log.ts";

/**
 * Scheduled maintenance.
 *
 * Deliberately a separate process from the worker: these must keep running
 * during a worker deploy, and a scheduler that shares a process with the queue
 * stops firing exactly when a rollout is in progress — which is when you most
 * want the reaper.
 *
 * Every task is idempotent and safe to run twice, so two schedulers racing
 * after a bad deploy is untidy rather than dangerous.
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  log.error("scheduler.boot", { message: "DATABASE_URL is required" });
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });

type Task = {
  name: string;
  everyMs: number;
  run: () => Promise<Record<string, unknown>>;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const TASKS: Task[] = [
  {
    // A worker killed mid-job leaves the row locked. Nothing else frees it.
    name: "reap_stalled_jobs",
    everyMs: 5 * MINUTE,
    run: async () => {
      const result = await pool.query<{ reap_stalled_jobs: number }>(
        `SELECT brigade.reap_stalled_jobs($1)`,
        [Number(process.env.JOB_STALL_SECONDS ?? 300)],
      );
      return { reaped: result.rows[0]?.reap_stalled_jobs ?? 0 };
    },
  },
  {
    // Finished jobs are dead weight, and some of them carried a live
    // verification token in their args until they ran.
    name: "purge_finished_jobs",
    everyMs: HOUR,
    run: async () => {
      const result = await pool.query(
        `DELETE FROM brigade.jobs
         WHERE state IN ('succeeded', 'dead') AND finished_at < now() - interval '24 hours'`,
      );
      return { deleted: result.rowCount ?? 0 };
    },
  },
  {
    name: "purge_rate_limits",
    everyMs: 6 * HOUR,
    run: async () => {
      const result = await pool.query<{ purge_rate_limits: number }>(
        `SELECT brigade.purge_rate_limits(48)`,
      );
      return { deleted: result.rows[0]?.purge_rate_limits ?? 0 };
    },
  },
  {
    // A badge that never lapses is a claim about the past presented as a claim
    // about the present.
    name: "expire_employment_verifications",
    everyMs: 12 * HOUR,
    run: async () => {
      const result = await runService(pool, (ctx) =>
        new ExpireEmploymentVerificationsService().call({ ctx }),
      );
      return { expired: result.expired };
    },
  },
  {
    // Degrees drift as the graph changes underneath the materialised table.
    // Recomputed in batches so one run cannot lock the whole table.
    name: "recompute_connection_degrees",
    everyMs: 24 * HOUR,
    run: async () => {
      const stale = await pool.query<{ id: string }>(
        `SELECT p.id::text FROM brigade.profiles p
         WHERE p.deleted_at IS NULL AND p.suspended_at IS NULL
           AND EXISTS (
             SELECT 1 FROM brigade.connections c
             WHERE c.state = 'accepted' AND (c.profile_id = p.id OR c.target_profile_id = p.id)
           )
         ORDER BY p.last_active_at DESC NULLS LAST
         LIMIT $1`,
        [Number(process.env.DEGREE_BATCH ?? 500)],
      );
      for (const row of stale.rows) {
        await pool.query(
          `INSERT INTO brigade.jobs (queue, worker, args, dedupe_key)
           VALUES ('pull', 'RecomputeConnectionDegreesWorker', $1::jsonb, $2)
           ON CONFLICT DO NOTHING`,
          [JSON.stringify({ profileIds: [row.id] }), `degrees:${row.id}`],
        );
      }
      return { enqueued: stale.rows.length };
    },
  },
];

const timers: NodeJS.Timeout[] = [];

async function runTask(task: Task) {
  const started = Date.now();
  try {
    const result = await task.run();
    log.info("scheduler.task", { task: task.name, ms: Date.now() - started, ...result });
  } catch (error) {
    // One failing task must never stop the others.
    log.error("scheduler.task_failed", { task: task.name, error: String(error) });
  }
}

for (const task of TASKS) {
  void runTask(task);
  timers.push(setInterval(() => void runTask(task), task.everyMs));
}

log.info("scheduler.started", { tasks: TASKS.map((t) => t.name), pid: process.pid });

async function shutdown() {
  for (const timer of timers) clearInterval(timer);
  await pool.end().catch(() => undefined);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
