import type { Pool } from "pg";
import type { Enqueued, ServiceContext } from "./base_service.js";

/**
 * Runs a service inside a transaction and flushes its enqueued jobs only after
 * that transaction commits.
 *
 * The ordering is the point. Enqueue inside the transaction and a rollback
 * leaves a job pointing at a row that was never created; enqueue before the
 * commit and a fast worker can start before the row is visible. Collecting the
 * jobs and flushing them afterwards removes both failure modes.
 */
export async function runService<T>(
  pool: Pool,
  body: (ctx: ServiceContext) => Promise<T>,
  flush: (jobs: Enqueued[]) => Promise<void>,
): Promise<T> {
  const client = await pool.connect();
  const jobs: Enqueued[] = [];

  try {
    await client.query("BEGIN");
    const result = await body({
      db: client,
      enqueue: (job) => {
        jobs.push(job);
      },
    });
    await client.query("COMMIT");

    // A failure here must not undo committed work — the jobs are recoverable
    // (workers are idempotent and schedulers reconcile), the transaction is not.
    await flush(jobs).catch((error) => {
      console.error("[core] failed to flush jobs after commit", { error, jobs });
    });

    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
