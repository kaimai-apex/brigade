import { BaseService, type ServiceContext } from "./base_service.ts";
import {
  FeedManager,
  buildCrutches,
  resolveAudience,
  shouldFilter,
  type FeedPost,
  type RedisLike,
} from "../lib/feed_manager.ts";

/**
 * Push a new post into every recipient's precomputed feed.
 *
 * The threshold is the interesting part. Small audiences are cheaper to handle
 * inline than to pay job overhead for; large ones must be chunked, or one job
 * runs for minutes and occupies a worker the whole time while notifications
 * queue behind it.
 */

/** Above this, the work is split into chunks rather than done in one pass. */
export const INLINE_AUDIENCE_LIMIT = 1000;
export const CHUNK_SIZE = 500;

export type FanOutArgs = {
  ctx: ServiceContext;
  redis: RedisLike;
  postId: string;
  /** When set, only these receivers are processed — a chunk of a large fan-out. */
  receiverIds?: string[];
};

export type FanOutResult = { delivered: number; chunked: boolean; audience: number };

export class FanOutOnWriteService extends BaseService<FanOutArgs, FanOutResult> {
  async call({ ctx, redis, postId, receiverIds }: FanOutArgs): Promise<FanOutResult> {
    const { db } = ctx;

    const result = await db.query<{
      id: string;
      profile_id: string;
      visibility: string;
      in_reply_to_id: string | null;
      in_reply_to_profile_id: string | null;
      reblog_of_id: string | null;
    }>(
      `SELECT p.id::text, p.profile_id::text, p.visibility::text, p.in_reply_to_id::text,
              parent.profile_id::text AS in_reply_to_profile_id, p.reblog_of_id::text
       FROM brigade.posts p
       LEFT JOIN brigade.posts parent ON parent.id = p.in_reply_to_id
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [postId],
    );

    const row = result.rows[0];
    // Deleted between enqueue and run. Expected, not an error.
    if (!row) return { delivered: 0, chunked: false, audience: 0 };

    const post: FeedPost = {
      id: row.id,
      profileId: row.profile_id,
      visibility: row.visibility as FeedPost["visibility"],
      inReplyToId: row.in_reply_to_id,
      inReplyToProfileId: row.in_reply_to_profile_id,
      reblogOfId: row.reblog_of_id,
    };

    const audience = receiverIds ?? [
      post.profileId, // the author's own feed
      ...(await resolveAudience(db, post.profileId)),
    ];

    if (!receiverIds && audience.length > INLINE_AUDIENCE_LIMIT) {
      for (let i = 0; i < audience.length; i += CHUNK_SIZE) {
        ctx.enqueue({
          queue: "default",
          worker: "FeedInsertWorker",
          args: { postId, receiverIds: audience.slice(i, i + CHUNK_SIZE) },
        });
      }
      return { delivered: 0, chunked: true, audience: audience.length };
    }

    const feeds = new FeedManager(redis, db);
    let delivered = 0;

    for (const receiverId of audience) {
      // Crutches are per receiver: this is the one place fan-out cost is
      // genuinely linear in audience size, and it is why large fan-outs chunk.
      const crutches = await buildCrutches(db, receiverId);
      if (shouldFilter(post, receiverId, crutches)) continue;

      if (await feeds.pushToHome(receiverId, post)) {
        delivered += 1;
        // Write to the feed FIRST, then publish. A client reconnecting between
        // the two re-reads the feed and still sees the post; reversed, it can
        // miss it entirely.
        await redis.publish(
          `timeline:${receiverId}`,
          JSON.stringify({ event: "update", postId: post.id }),
        );
      }
    }

    return { delivered, chunked: false, audience: audience.length };
  }
}

/**
 * Seed a brand-new member's feed so they never see an empty app.
 *
 * Ordered by signal strength — a colleague at the same employer is worth far
 * more than a geographic near-miss. Day-one feed quality decides whether there
 * is a day two, which makes this the highest-ROI work in the feed phase.
 */
export class BootstrapFeedService extends BaseService<
  { ctx: ServiceContext; redis: RedisLike; profileId: string; limit?: number },
  { suggested: number; posts: number }
> {
  async call({
    ctx,
    redis,
    profileId,
    limit = 50,
  }: { ctx: ServiceContext; redis: RedisLike; profileId: string; limit?: number }) {
    const { db } = ctx;

    const candidates = await db.query<{ id: string; source: string; score: number }>(
      `WITH me AS (SELECT id, country_code, city FROM brigade.profiles WHERE id = $1),
       current_employers AS (
         SELECT company_id FROM brigade.experiences
         WHERE profile_id = $1 AND is_current AND company_id IS NOT NULL
       ),
       schools AS (
         SELECT institution_id FROM brigade.educations
         WHERE profile_id = $1 AND institution_id IS NOT NULL
       )
       SELECT p.id::text, source, score FROM (
         SELECT e.profile_id AS id, 'same_employer' AS source, 100 AS score
         FROM brigade.experiences e
         WHERE e.company_id IN (SELECT company_id FROM current_employers) AND e.is_current
         UNION ALL
         SELECT ed.profile_id, 'same_school', 60
         FROM brigade.educations ed
         WHERE ed.institution_id IN (SELECT institution_id FROM schools)
         UNION ALL
         SELECT p2.id, 'same_city', 30
         FROM brigade.profiles p2, me
         WHERE p2.city IS NOT NULL AND p2.city = me.city
       ) candidates
       JOIN brigade.profiles p ON p.id = candidates.id
       WHERE p.id <> $1 AND p.discoverable AND p.deleted_at IS NULL
         AND p.suspended_at IS NULL AND p.silenced_at IS NULL
       ORDER BY score DESC, p.completeness DESC
       LIMIT $2`,
      [profileId, limit],
    );

    for (const row of candidates.rows) {
      await db.query(
        `INSERT INTO brigade.suggestions (profile_id, suggested_id, source, score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (profile_id, suggested_id) DO UPDATE
           SET score = GREATEST(brigade.suggestions.score, EXCLUDED.score), computed_at = now()`,
        [profileId, row.id, row.source, row.score],
      );
    }

    // Editorial floor: even with no matches at all, the feed shows recent
    // activity from complete, verified profiles rather than nothing.
    const seedAuthors = candidates.rows.slice(0, 20).map((r) => r.id);
    let posts = 0;

    if (seedAuthors.length > 0) {
      const recent = await db.query<{ id: string }>(
        `SELECT id::text FROM brigade.posts
         WHERE profile_id = ANY($1::bigint[]) AND deleted_at IS NULL AND visibility = 'public'
         ORDER BY id DESC LIMIT 100`,
        [seedAuthors],
      );
      if (recent.rows.length > 0) {
        await redis.zAdd(
          `feed:home:${profileId}`,
          recent.rows.map((r) => ({ score: Number(r.id), value: r.id })),
        );
        posts = recent.rows.length;
      }
    }

    return { suggested: candidates.rows.length, posts };
  }
}
