import type { Pool } from "pg";
import { enqueue } from "../lib/queue.ts";
import type { Enqueued, ServiceContext } from "./base_service.ts";

/**
 * Runs a service inside a transaction, writing its enqueued jobs in that same
 * transaction.
 *
 * This is the payoff of a Postgres-backed queue. With an external broker you
 * have to choose between enqueueing before the commit (a fast worker can start
 * before the row is visible) and after it (a crash in between loses the job).
 * Writing the job row transactionally removes the choice: the job and the data
 * it refers to become visible at the same instant, or neither does.
 */
export async function runService<T>(
  pool: Pool,
  body: (ctx: ServiceContext) => Promise<T>,
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
    await enqueue(client, jobs);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
