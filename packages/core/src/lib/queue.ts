import type { Pool, PoolClient } from "pg";
import type { Enqueued } from "../services/base_service.ts";

/**
 * The job queue. Postgres-backed, so enqueueing can share a transaction with
 * the write it follows from.
 *
 * Weights live in the claim_job SQL function (migration 011) rather than here,
 * so a worker process cannot accidentally drain queues in the wrong order.
 */

export type JobRow = {
  id: string;
  queue: string;
  worker: string;
  args: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

export async function enqueue(
  db: Pool | PoolClient,
  jobs: Enqueued[],
  options: { runAt?: Date; dedupeKey?: string } = {},
): Promise<void> {
  if (jobs.length === 0) return;

  for (const job of jobs) {
    await db.query(
      `INSERT INTO brigade.jobs (queue, worker, args, run_at, dedupe_key)
       VALUES ($1, $2, $3::jsonb, COALESCE($4, now()), $5)
       ON CONFLICT DO NOTHING`,
      [
        job.queue,
        job.worker,
        JSON.stringify(job.args),
        options.runAt ?? null,
        options.dedupeKey ?? null,
      ],
    );
  }
}

/** A worker registry: name → handler. Handlers take IDs and load fresh. */
export type WorkerRegistry = Record<
  string,
  { perform(args: Record<string, unknown>): Promise<void>; maxAttempts?: number; backoffMs?(attempt: number): number }
>;

function defaultBackoff(attempt: number): number {
  // Exponential with jitter. The jitter matters: without it a batch that failed
  // together retries together and reproduces the outage that failed it.
  const base = Math.min(2 ** attempt * 1000, 5 * 60_000);
  return base + Math.floor(Math.random() * 1000);
}

/**
 * Claim and run a single job. Returns false when the queue is empty, so a
 * caller can poll or sleep. Kept as one step rather than a loop so tests can
 * drain the queue deterministically.
 */
export async function runOneJob(
  pool: Pool,
  registry: WorkerRegistry,
  workerName = `worker-${process.pid}`,
): Promise<boolean> {
  const claimed = await pool.query<JobRow>("SELECT * FROM brigade.claim_job($1)", [workerName]);
  const job = claimed.rows[0];
  if (!job) return false;

  const handler = registry[job.worker];

  if (!handler) {
    await pool.query(
      `UPDATE brigade.jobs SET state = 'dead', last_error = $2, finished_at = now() WHERE id = $1`,
      [job.id, `No handler registered for "${job.worker}"`],
    );
    return true;
  }

  try {
    await handler.perform(job.args);
    await pool.query(
      `UPDATE brigade.jobs SET state = 'succeeded', finished_at = now(), last_error = NULL WHERE id = $1`,
      [job.id],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const maxAttempts = handler.maxAttempts ?? job.max_attempts;
    const exhausted = job.attempts >= maxAttempts;

    if (exhausted) {
      await pool.query(
        `UPDATE brigade.jobs SET state = 'dead', last_error = $2, finished_at = now() WHERE id = $1`,
        [job.id, message],
      );
    } else {
      const delay = (handler.backoffMs ?? defaultBackoff)(job.attempts);
      await pool.query(
        `UPDATE brigade.jobs
         SET state = 'queued', last_error = $2, run_at = now() + make_interval(secs => $3)
         WHERE id = $1`,
        [job.id, message, delay / 1000],
      );
    }
  }

  return true;
}

/** Drain the queue. Used by tests and by the one-shot CLI. */
export async function drain(pool: Pool, registry: WorkerRegistry, limit = 1000): Promise<number> {
  let done = 0;
  while (done < limit && (await runOneJob(pool, registry))) done += 1;
  return done;
}
