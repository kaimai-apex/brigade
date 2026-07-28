import type { PoolClient } from "pg";

/**
 * Every state change in Brigade goes through exactly one service.
 *
 * The rule is absolute rather than a guideline: the moment one controller is
 * allowed to write directly "because it's simple", the boundary stops existing
 * and there is no way to answer "where does the logic for X live".
 *
 * A service:
 *   1. exposes exactly one public method, `call`
 *   2. is named for what it does — VerbNounService
 *   3. owns its transaction: it fully succeeds or fully rolls back
 *   4. ENQUEUES side effects rather than performing them — fan-out,
 *      notifications, indexing, email and webhooks are always jobs
 *   5. is callable from anywhere: route handler, worker, CLI, test, admin
 *   6. returns the created or modified record, never an HTTP response
 *
 * Rule 4 is the one that keeps requests fast. The user's request returns as
 * soon as the row is committed; everything else happens on a queue.
 */
export abstract class BaseService<Args, Result> {
  abstract call(args: Args): Promise<Result>;
}

/**
 * Side effects a service wants to happen after its transaction commits.
 *
 * Collected during `call` and handed to the queue by `runService`, so a
 * rolled-back transaction can never leave a job enqueued for a row that does
 * not exist — the single most common source of "the worker says the record is
 * missing" bugs.
 */
export type Enqueued = {
  queue: QueueName;
  worker: string;
  args: Record<string, unknown>;
};

export type QueueName =
  | "default"
  | "push"
  | "ingress"
  | "mailers"
  | "pull"
  | "scheduler";

export interface ServiceContext {
  /** The transaction the service runs inside. */
  db: PoolClient;
  /** Enqueue a job to run after the transaction commits. */
  enqueue(job: Enqueued): void;
}

export class ServiceError extends Error {
  // Written out rather than declared as constructor parameter properties: those
  // need a TypeScript transform, and this package runs directly under Node's
  // type stripping with no build step.
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    code: string,
    status = 422,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class NotFoundError extends ServiceError {
  constructor(message = "Record not found") {
    super(message, "not_found", 404);
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = "Not allowed") {
    super(message, "forbidden", 403);
  }
}
