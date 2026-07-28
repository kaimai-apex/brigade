import type { Pool, PoolClient } from "pg";

/**
 * Precomputed home feeds — fan-out on write.
 *
 * Fan-out on READ (query everyone you follow at page load) is simpler and dies
 * at scale: someone following 500 people triggers a 500-author query on every
 * refresh. Fan-out on WRITE pushes a post id into each follower's precomputed
 * list when it is created, so reading a feed is one Redis range query.
 *
 * The trade is that writes get expensive in proportion to audience size, which
 * is why fan-out happens in background workers and the poster's request returns
 * as soon as the row is committed. For a professional network this is clearly
 * the right side of the trade: people read daily and post weekly.
 *
 * FEEDS ARE A CACHE. Every feed must be rebuildable from Postgres — the moment
 * a feed is the only place a piece of state lives, a Redis failover becomes
 * data loss.
 */

/** Bounds memory: 800 ids × N users is predictable and budgetable. Nobody
 *  scrolls past 800; anyone who does falls through to a database query. */
export const MAX_ITEMS = 800;

/** Within the most recent 80 entries, a reshare of a post already present
 *  updates that entry instead of adding a row. Professional feeds are
 *  reshare-heavy and "12 people in your network shared this" is the feature,
 *  not a workaround. */
export const RESHARE_FALLOFF = 80;

export type RedisLike = {
  zAdd(key: string, members: { score: number; value: string }[]): Promise<unknown>;
  zRem(key: string, members: string[]): Promise<unknown>;
  zRange(key: string, start: number, stop: number, opts?: { REV?: boolean }): Promise<string[]>;
  zCard(key: string): Promise<number>;
  zRemRangeByRank(key: string, start: number, stop: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  exists(key: string): Promise<number>;
  publish(channel: string, message: string): Promise<unknown>;
};

export const homeKey = (profileId: string) => `feed:home:${profileId}`;
export const listKey = (listId: string) => `feed:list:${listId}`;

/**
 * Everything needed to filter a batch of posts for one receiver, loaded in a
 * handful of bulk queries instead of per post.
 *
 * This is the single most valuable idea in the reference feed implementation:
 * filtering 800 posts naively means hundreds of queries, so the relationship
 * state is preloaded into memory once and the filter runs against that. It
 * generalises far past feeds — the directory does the same thing.
 */
export type Crutches = {
  blocking: Set<string>;
  blockedBy: Set<string>;
  muting: Set<string>;
  following: Set<string>;
  connected: Set<string>;
};

export async function buildCrutches(
  db: Pool | PoolClient,
  receiverId: string,
): Promise<Crutches> {
  const result = await db.query<{ relation: string; other: string }>(
    `SELECT 'blocking' AS relation, target_profile_id::text AS other FROM brigade.blocks WHERE profile_id = $1
     UNION ALL
     SELECT 'blocked_by', profile_id::text FROM brigade.blocks WHERE target_profile_id = $1
     UNION ALL
     SELECT 'muting', target_profile_id::text FROM brigade.mutes
       WHERE profile_id = $1 AND (expires_at IS NULL OR expires_at > now())
     UNION ALL
     SELECT 'following', target_profile_id::text FROM brigade.follows WHERE profile_id = $1
     UNION ALL
     SELECT 'connected',
            CASE WHEN profile_id = $1 THEN target_profile_id ELSE profile_id END::text
       FROM brigade.connections
       WHERE state = 'accepted' AND (profile_id = $1 OR target_profile_id = $1)`,
    [receiverId],
  );

  const crutches: Crutches = {
    blocking: new Set(),
    blockedBy: new Set(),
    muting: new Set(),
    following: new Set(),
    connected: new Set(),
  };

  for (const row of result.rows) {
    switch (row.relation) {
      case "blocking":
        crutches.blocking.add(row.other);
        break;
      case "blocked_by":
        crutches.blockedBy.add(row.other);
        break;
      case "muting":
        crutches.muting.add(row.other);
        break;
      case "following":
        crutches.following.add(row.other);
        break;
      case "connected":
        crutches.connected.add(row.other);
        break;
    }
  }

  return crutches;
}

export type FeedPost = {
  id: string;
  profileId: string;
  visibility: "public" | "connections" | "unlisted" | "direct";
  inReplyToId: string | null;
  inReplyToProfileId: string | null;
  reblogOfId: string | null;
};

/**
 * Should this post enter this receiver's feed? Runs entirely against the
 * preloaded crutches — no queries.
 */
export function shouldFilter(post: FeedPost, receiverId: string, c: Crutches): boolean {
  if (post.profileId === receiverId) return false; // your own posts always land

  if (c.blocking.has(post.profileId)) return true;
  if (c.blockedBy.has(post.profileId)) return true;
  if (c.muting.has(post.profileId)) return true;

  // Direct messages are not feed content.
  if (post.visibility === "direct") return true;

  // Connections-only posts require an accepted connection, not a follow.
  if (post.visibility === "connections" && !c.connected.has(post.profileId)) return true;

  // A reply only belongs in the feed if the receiver has a relationship with
  // the person being replied to — otherwise every feed fills with halves of
  // conversations between strangers.
  if (post.inReplyToId && post.inReplyToProfileId) {
    const known =
      post.inReplyToProfileId === receiverId ||
      c.connected.has(post.inReplyToProfileId) ||
      c.following.has(post.inReplyToProfileId);
    if (!known) return true;
  }

  return false;
}

export class FeedManager {
  // Fields written out rather than declared as constructor parameter
  // properties: those need a TypeScript transform, and this package runs
  // directly under Node's type stripping with no build step.
  private readonly redis: RedisLike;
  private readonly db: Pool | PoolClient;

  constructor(redis: RedisLike, db: Pool | PoolClient) {
    this.redis = redis;
    this.db = db;
  }

  /**
   * Insert one post. The score IS the id — snowflake ids sort by time, so the
   * sorted set is chronological for free.
   *
   * Ranking, when it arrives, must stay a re-scoring pass over the retrieved
   * ids at read time. Putting a ranking score in the sorted set means changing
   * the ranking function requires rewriting every feed, and the whole point of
   * a ranking function is that you change it weekly.
   */
  async pushToHome(receiverId: string, post: FeedPost): Promise<boolean> {
    const key = homeKey(receiverId);

    if (post.reblogOfId) {
      const recent = await this.redis.zRange(key, 0, RESHARE_FALLOFF - 1, { REV: true });
      // The original is already visible nearby — do not stack a duplicate.
      if (recent.includes(post.reblogOfId)) return false;
    }

    await this.redis.zAdd(key, [{ score: Number(post.id), value: post.id }]);
    await this.trim(key);
    return true;
  }

  async unpushFromHome(receiverId: string, postId: string): Promise<void> {
    await this.redis.zRem(homeKey(receiverId), [postId]);
  }

  /**
   * Backfill someone's recent posts into an existing feed, on connect.
   *
   * The pair people forget. A new connection whose posts only appear going
   * forward looks broken — you connect with a colleague and their profile shows
   * activity your feed does not.
   */
  async mergeIntoHome(receiverId: string, authorId: string): Promise<number> {
    const crutches = await buildCrutches(this.db, receiverId);
    const posts = await this.recentPostsBy(authorId);

    let inserted = 0;
    for (const post of posts) {
      if (shouldFilter(post, receiverId, crutches)) continue;
      if (await this.pushToHome(receiverId, post)) inserted += 1;
    }
    return inserted;
  }

  /** Remove someone's posts retroactively, on disconnect. */
  async unmergeFromHome(receiverId: string, authorId: string): Promise<number> {
    const posts = await this.recentPostsBy(authorId);
    if (posts.length === 0) return 0;
    await this.redis.zRem(
      homeKey(receiverId),
      posts.map((p) => p.id),
    );
    return posts.length;
  }

  /**
   * Purge everything by one profile, in one direction, on block. Called for
   * both directions by BlockService — a leaky block is a trust incident.
   */
  async clearFromHome(receiverId: string, targetId: string): Promise<number> {
    return this.unmergeFromHome(receiverId, targetId);
  }

  /**
   * Rebuild a feed from Postgres. The recovery path: on a cache miss, or after
   * a Redis failover, or when a fan-out worker has been down long enough to
   * leave a feed wrong.
   */
  async populateHome(receiverId: string): Promise<number> {
    const key = homeKey(receiverId);
    await this.redis.del(key);

    const crutches = await buildCrutches(this.db, receiverId);
    const authors = [...crutches.connected, ...crutches.following, receiverId];
    if (authors.length === 0) return 0;

    const result = await this.db.query<PostRow>(
      `SELECT p.id::text, p.profile_id::text, p.visibility::text, p.in_reply_to_id::text,
              parent.profile_id::text AS in_reply_to_profile_id, p.reblog_of_id::text
       FROM brigade.posts p
       LEFT JOIN brigade.posts parent ON parent.id = p.in_reply_to_id
       WHERE p.profile_id = ANY($1::bigint[]) AND p.deleted_at IS NULL
       ORDER BY p.id DESC
       LIMIT $2`,
      [authors, MAX_ITEMS],
    );

    let inserted = 0;
    for (const post of result.rows.map(toFeedPost)) {
      if (shouldFilter(post, receiverId, crutches)) continue;
      if (await this.pushToHome(receiverId, post)) inserted += 1;
    }
    return inserted;
  }

  /** Read a page. Ids only — hydration is the caller's job, and the read path
   *  must tolerate ids whose posts have since been deleted. */
  async getHome(receiverId: string, limit = 20, maxId?: string): Promise<string[]> {
    const key = homeKey(receiverId);
    if ((await this.redis.exists(key)) === 0) {
      await this.populateHome(receiverId);
    }

    const ids = await this.redis.zRange(key, 0, -1, { REV: true });
    const filtered = maxId ? ids.filter((id) => BigInt(id) < BigInt(maxId)) : ids;
    return filtered.slice(0, limit);
  }

  private async trim(key: string): Promise<void> {
    const size = await this.redis.zCard(key);
    if (size > MAX_ITEMS) {
      // Sorted ascending, so the oldest entries are at the low end.
      await this.redis.zRemRangeByRank(key, 0, size - MAX_ITEMS - 1);
    }
  }

  private async recentPostsBy(authorId: string): Promise<FeedPost[]> {
    const result = await this.db.query<PostRow>(
      `SELECT p.id::text, p.profile_id::text, p.visibility::text, p.in_reply_to_id::text,
              parent.profile_id::text AS in_reply_to_profile_id, p.reblog_of_id::text
       FROM brigade.posts p
       LEFT JOIN brigade.posts parent ON parent.id = p.in_reply_to_id
       WHERE p.profile_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.id DESC LIMIT $2`,
      [authorId, RESHARE_FALLOFF],
    );
    return result.rows.map(toFeedPost);
  }
}

type PostRow = {
  id: string;
  profile_id: string;
  visibility: string;
  in_reply_to_id: string | null;
  in_reply_to_profile_id: string | null;
  reblog_of_id: string | null;
};

function toFeedPost(row: PostRow): FeedPost {
  return {
    id: row.id,
    profileId: row.profile_id,
    visibility: row.visibility as FeedPost["visibility"],
    inReplyToId: row.in_reply_to_id,
    inReplyToProfileId: row.in_reply_to_profile_id,
    reblogOfId: row.reblog_of_id,
  };
}

/**
 * Resolve who should receive a post: accepted connections plus followers,
 * minus anyone blocked in either direction.
 */
export async function resolveAudience(
  db: Pool | PoolClient,
  authorId: string,
): Promise<string[]> {
  const result = await db.query<{ id: string }>(
    `SELECT DISTINCT id FROM (
       SELECT CASE WHEN profile_id = $1 THEN target_profile_id ELSE profile_id END AS id
       FROM brigade.connections
       WHERE state = 'accepted' AND (profile_id = $1 OR target_profile_id = $1)
       UNION
       SELECT profile_id FROM brigade.follows WHERE target_profile_id = $1
     ) audience
     WHERE id <> $1
       AND NOT EXISTS (
         SELECT 1 FROM brigade.blocks b
         WHERE (b.profile_id = audience.id AND b.target_profile_id = $1)
            OR (b.profile_id = $1 AND b.target_profile_id = audience.id)
       )`,
    [authorId],
  );
  return result.rows.map((r) => String(r.id));
}
