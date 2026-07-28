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
import {
  IndexProfileService,
  PurgeProfileService,
  RevokeSessionsService,
  logOnlyTransport,
  type EmailTransport,
} from "../services/maintenance_services.ts";

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
  /** Feed workers need Redis. Without it they dead-letter with an explicit
   *  reason rather than silently doing nothing. */
  redis?: RedisLike | null;
  /** Outbound mail. Defaults to logging, so a missing provider is visible
   *  rather than a silent drop. */
  email?: EmailTransport;
  /** Where verification links point. */
  appUrl?: string;
};

export function buildRegistry(pool: Pool, options: RegistryOptions = {}): WorkerRegistry {
  const redis = options.redis ?? null;
  const sendEmail = options.email ?? logOnlyTransport;
  const appUrl = options.appUrl ?? "https://joinbrigade.co";

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

  registry.ProfileIndexWorker = {
    async perform(args) {
      const profileId = String(args.profileId ?? "");
      if (!profileId) return;
      await runService(pool, (ctx) => new IndexProfileService().call({ ctx, profileId }));
    },
  };

  registry.RevokeSessionsWorker = {
    async perform(args) {
      const profileId = String(args.profileId ?? "");
      if (!profileId) return;
      await runService(pool, (ctx) => new RevokeSessionsService().call({ ctx, profileId }));
    },
  };

  registry.PurgeProfileWorker = {
    async perform(args) {
      const profileId = String(args.profileId ?? "");
      if (!profileId) return;
      await runService(pool, async (ctx) => {
        const exists = await ctx.db.query(`SELECT 1 FROM brigade.profiles WHERE id = $1`, [
          profileId,
        ]);
        if (!exists.rowCount) return;
        await new PurgeProfileService().call({ ctx, profileId });
      });
    },
  };

  registry.SendVerificationEmailWorker = {
    async perform(args) {
      const verificationId = String(args.verificationId ?? "");
      if (!verificationId) return;

      // The token is never persisted in the clear, so it cannot be recovered
      // here — the service that issued it passes it through the job. A job
      // enqueued without one is from an older code path and is dropped rather
      // than sending a link that cannot work.
      const token = typeof args.token === "string" ? args.token : null;
      if (!token) return;

      const found = await pool.query<{ email: string; state: string }>(
        `SELECT coalesce(v.email_domain, '') AS email, v.state::text
         FROM brigade.employment_verifications v WHERE v.id = $1`,
        [verificationId],
      );
      const row = found.rows[0];
      if (!row || row.state !== "pending") return;

      const to = typeof args.workEmail === "string" ? args.workEmail : null;
      if (!to) return;

      await sendEmail({
        to,
        subject: "Confirm your work email for Brigade",
        text:
          `Confirm that you work where your Brigade profile says you do:\n\n` +
          `${appUrl}/verify/employment?id=${verificationId}&token=${token}\n\n` +
          `This link expires in 24 hours. If you did not request it, ignore this email.`,
      });
    },
  };

  // Phases that are not built yet fail fast and loudly with a single attempt,
  // rather than retrying five times or — worse — silently succeeding. A job
  // that quietly does nothing leaves the system subtly wrong with no signal.
  const deferred: [string, string][] = [];

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
