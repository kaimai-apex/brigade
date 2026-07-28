import type { Pool } from "pg";
import type { WorkerRegistry } from "../lib/queue.ts";
import { runService } from "../services/run_service.ts";
import { ComputeProfileCompletenessService } from "../services/compute_profile_completeness_service.ts";
import { RecomputeConnectionDegreesService } from "../services/recompute_connection_degrees_service.ts";

/**
 * Workers are retry envelopes: each one loads by ID, calls a service, and
 * tolerates the record having been deleted since it was enqueued.
 */

export class NotImplementedWorker extends Error {
  constructor(name: string, phase: string) {
    super(`${name} is not implemented yet — ${phase}. The job was enqueued by design.`);
    this.name = "NotImplementedWorker";
  }
}

export function buildRegistry(pool: Pool): WorkerRegistry {
  const registry: WorkerRegistry = {
    ProfileCompletenessWorker: {
      async perform(args) {
        const profileId = String(args.profileId ?? "");
        if (!profileId) return;
        await runService(pool, async (ctx) => {
          // The profile may have been deleted between enqueue and run; that is
          // an expected outcome, not a failure.
          const exists = await ctx.db.query(
            `SELECT 1 FROM brigade.profiles WHERE id = $1 AND deleted_at IS NULL`,
            [profileId],
          );
          if (!exists.rowCount) return;
          await new ComputeProfileCompletenessService().call({ ctx, profileId });
        });
      },
    },

    RecomputeConnectionDegreesWorker: {
      async perform(args) {
        const ids = Array.isArray(args.profileIds) ? args.profileIds.map(String) : [];
        if (ids.length === 0) return;
        await runService(pool, (ctx) =>
          new RecomputeConnectionDegreesService().call({ ctx, profileIds: ids }),
        );
      },
    },

    DeliverNotificationWorker: {
      async perform(args) {
        const notificationId = String(args.notificationId ?? "");
        if (!notificationId) return;
        // Fan-out to email, push and the websocket happens here. Until those
        // channels exist the in-app notification row IS the delivery, so this
        // is a no-op rather than a failure — the notification is already
        // readable in /notifications.
        const exists = await pool.query(
          `SELECT 1 FROM brigade.notifications WHERE id = $1`,
          [notificationId],
        );
        if (!exists.rowCount) return;
      },
    },
  };

  // Feed workers belong to Phase 4 and are not built. They fail fast and
  // loudly with a single attempt rather than retrying five times or, worse,
  // silently succeeding — a feed job that quietly does nothing would leave
  // feeds subtly wrong with no signal.
  for (const name of [
    "BootstrapFeedWorker",
    "MergeFeedWorker",
    "UnmergeFeedWorker",
    "ClearFeedWorker",
    "FeedInsertWorker",
  ]) {
    registry[name] = {
      maxAttempts: 1,
      async perform() {
        throw new NotImplementedWorker(name, "Phase 4 (feeds & timelines)");
      },
    };
  }

  for (const name of ["ProfileIndexWorker"]) {
    registry[name] = {
      maxAttempts: 1,
      async perform() {
        throw new NotImplementedWorker(name, "Phase 5 (search indexing)");
      },
    };
  }

  return registry;
}
