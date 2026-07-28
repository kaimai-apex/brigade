import type { Pool } from "pg";
import type { WorkerRegistry } from "../lib/queue.ts";
import { runService } from "../services/run_service.ts";
import { ComputeProfileCompletenessService } from "../services/compute_profile_completeness_service.ts";
import { RecomputeConnectionDegreesService } from "../services/recompute_connection_degrees_service.ts";
import { ScoreProfileRiskService } from "../services/moderation_services.ts";
import {
  BootstrapFeedService,
  FanOutOnWriteService,
} from "../services/fan_out_on_write_service.ts";
import { FeedManager, homeKey, type RedisLike } from "../lib/feed_manager.ts";

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

export type RegistryOptions = {
  /** Feed workers need Redis. Without it they are skipped rather than failing
   *  loudly on every job — a deployment with no Redis should still run. */
  redis?: RedisLike | null;
};

export function buildRegistry(pool: Pool, options: RegistryOptions = {}): WorkerRegistry {
  const redis = options.redis ?? null;

  const registry: WorkerRegistry = {
    ProfileCompletenessWorker: {
      async perform(args) {
        const profileId = String(args.profileId ?? "");
        if (!profileId) return;
        await runService(pool, async (ctx) => {
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

    ScoreProfileRiskWorker: {
      async perform(args) {
        const profileId = String(args.profileId ?? "");
        if (!profileId) return;
        await runService(pool, (ctx) => new ScoreProfileRiskService().call({ ctx, profileId }));
      },
    },

    DeliverNotificationWorker: {
      async perform(args) {
        const notificationId = String(args.notificationId ?? "");
        if (!notificationId) return;
        // Email, push and the websocket publish hang off here. Until those
        // channels exist the in-app row IS the delivery, so this is a no-op
        // rather than a failure — the notification is already readable.
        const exists = await pool.query(`SELECT 1 FROM brigade.notifications WHERE id = $1`, [
          notificationId,
        ]);
        if (!exists.rowCount) return;
      },
    },
  };

  if (redis) {
    registry.FanOutOnWriteWorker = {
      async perform(args) {
        const postId = String(args.postId ?? "");
        if (!postId) return;
        await runService(pool, (ctx) =>
          new FanOutOnWriteService().call({ ctx, redis, postId }),
        );
      },
    };

    registry.FeedInsertWorker = {
      async perform(args) {
        const postId = String(args.postId ?? "");
        const receiverIds = Array.isArray(args.receiverIds) ? args.receiverIds.map(String) : [];
        if (!postId || receiverIds.length === 0) return;
        await runService(pool, (ctx) =>
          new FanOutOnWriteService().call({ ctx, redis, postId, receiverIds }),
        );
      },
    };

    registry.BootstrapFeedWorker = {
      async perform(args) {
        const profileId = String(args.profileId ?? "");
        if (!profileId) return;
        await runService(pool, (ctx) =>
          new BootstrapFeedService().call({ ctx, redis, profileId }),
        );
      },
    };

    registry.MergeFeedWorker = {
      async perform(args) {
        const into = String(args.intoProfileId ?? "");
        const from = String(args.fromProfileId ?? "");
        if (!into || !from) return;
        await new FeedManager(redis, pool).mergeIntoHome(into, from);
      },
    };

    registry.UnmergeFeedWorker = {
      async perform(args) {
        const into = String(args.intoProfileId ?? "");
        const from = String(args.fromProfileId ?? "");
        if (!into || !from) return;
        await new FeedManager(redis, pool).unmergeFromHome(into, from);
      },
    };

    registry.ClearFeedWorker = {
      async perform(args) {
        const profileId = String(args.profileId ?? "");
        const targetProfileId = String(args.targetProfileId ?? "");
        if (!profileId || !targetProfileId) return;
        await new FeedManager(redis, pool).clearFromHome(profileId, targetProfileId);
      },
    };

    registry.RemoveFromFeedsWorker = {
      async perform(args) {
        const postId = String(args.postId ?? "");
        if (!postId) return;
        // Scoped to the audience rather than every feed in the system: a
        // wildcard scan over feed:home:* is O(users) for one deleted post.
        const audience = await pool.query<{ id: string }>(
          `SELECT DISTINCT CASE WHEN c.profile_id = p.profile_id THEN c.target_profile_id
                                ELSE c.profile_id END::text AS id
           FROM brigade.posts p
           JOIN brigade.connections c
             ON (c.profile_id = p.profile_id OR c.target_profile_id = p.profile_id)
           WHERE p.id = $1 AND c.state = 'accepted'
           UNION
           SELECT f.profile_id::text FROM brigade.posts p
           JOIN brigade.follows f ON f.target_profile_id = p.profile_id
           WHERE p.id = $1`,
          [postId],
        );
        for (const row of audience.rows) {
          await redis.zRem(homeKey(String(row.id)), [postId]);
        }
      },
    };
  }

  // Phases that are not built yet fail fast and loudly with a single attempt,
  // rather than retrying five times or — worse — silently succeeding. A job
  // that quietly does nothing leaves the system subtly wrong with no signal.
  const deferred: [string, string][] = [
    ["ProfileIndexWorker", "Phase 5 (search indexing)"],
    ["SendVerificationEmailWorker", "outbound email is not wired up"],
    ["RevokeSessionsWorker", "session revocation needs the OAuth provider decision"],
    ["PurgeProfileWorker", "GDPR erasure pipeline"],
  ];

  if (!redis) {
    deferred.push(
      ["FanOutOnWriteWorker", "no Redis configured"],
      ["FeedInsertWorker", "no Redis configured"],
      ["BootstrapFeedWorker", "no Redis configured"],
      ["MergeFeedWorker", "no Redis configured"],
      ["UnmergeFeedWorker", "no Redis configured"],
      ["ClearFeedWorker", "no Redis configured"],
      ["RemoveFromFeedsWorker", "no Redis configured"],
    );
  }

  for (const [name, phase] of deferred) {
    registry[name] = {
      maxAttempts: 1,
      async perform() {
        throw new NotImplementedWorker(name, phase);
      },
    };
  }

  return registry;
}
