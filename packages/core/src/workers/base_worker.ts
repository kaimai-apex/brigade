import type { QueueName } from "../services/base_service.js";

/**
 * A worker is a retry envelope around a service, and nothing more.
 *
 * The four rules, all of which exist because retries are guaranteed:
 *   1. no business logic — call a service
 *   2. idempotent — running twice must be safe
 *   3. take IDs, not objects — load fresh inside; the row may have changed or
 *      been deleted between enqueue and run
 *   4. handle the deleted case — return quietly rather than throwing
 */
export abstract class BaseWorker<Args extends Record<string, unknown>> {
  abstract readonly queue: QueueName;
  /** Retries before the job is dead-lettered. */
  readonly maxAttempts: number = 5;

  abstract perform(args: Args): Promise<void>;

  /**
   * Exponential backoff with jitter. The jitter matters: without it, a batch of
   * jobs that failed together retries together and reproduces the outage that
   * failed them.
   */
  backoffMs(attempt: number): number {
    const base = Math.min(2 ** attempt * 1000, 5 * 60_000);
    return base + Math.floor(Math.random() * 1000);
  }
}

/**
 * Queue weights, mirroring config/queues.yml.
 *
 * The weights are the whole point. Without them a 50,000-row import starves
 * every notification in the system and users think the site is broken.
 */
export const QUEUE_WEIGHTS: Record<QueueName, number> = {
  default: 8, // user-visible: notifications, feed inserts
  push: 6, // outbound: email, webhooks, push
  ingress: 4, // inbound: uploads, imports, link crawling
  mailers: 2,
  pull: 1, // reindexing, backfills, degree recomputation
  scheduler: 1, // cron
};
