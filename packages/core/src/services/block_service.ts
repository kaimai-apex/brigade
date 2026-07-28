import { BaseService, ForbiddenError, ServiceError, type ServiceContext } from "./base_service.js";

/**
 * BlockService is the one that is easy to get half-right, and a leaky block is
 * a trust incident rather than a bug. A block must do all five of these:
 *
 *   1. record the block
 *   2. sever any connection, in whichever direction it is stored
 *   3. remove follows both ways
 *   4. purge each party's posts from the other's feed
 *   5. cancel pending notifications between them
 *
 * Steps 1–3 and 5 are in the transaction because they are state. Step 4 is a
 * job because it touches Redis, which cannot participate in a Postgres
 * transaction — and because the feed is a cache that is always rebuildable.
 */
export type BlockArgs = {
  actorProfileId: string;
  targetProfileId: string;
};

export type BlockResult = {
  blockId: string;
  severedConnection: boolean;
  removedFollows: number;
};

export class BlockService extends BaseService<
  BlockArgs & { ctx: ServiceContext },
  BlockResult
> {
  async call({ ctx, actorProfileId, targetProfileId }: BlockArgs & { ctx: ServiceContext }) {
    if (actorProfileId === targetProfileId) {
      throw new ForbiddenError("You cannot block yourself");
    }

    const { db } = ctx;

    const block = await db.query<{ id: string }>(
      `INSERT INTO brigade.blocks (profile_id, target_profile_id)
       VALUES ($1, $2)
       ON CONFLICT (profile_id, target_profile_id) DO UPDATE SET created_at = brigade.blocks.created_at
       RETURNING id::text`,
      [actorProfileId, targetProfileId],
    );

    // Connections are stored one row, canonically ordered (migration 006), so
    // the delete has to match either arrangement of the pair.
    const severed = await db.query(
      `DELETE FROM brigade.connections
       WHERE (profile_id = $1 AND target_profile_id = $2)
          OR (profile_id = $2 AND target_profile_id = $1)`,
      [actorProfileId, targetProfileId],
    );

    const follows = await db.query(
      `DELETE FROM brigade.follows
       WHERE (profile_id = $1 AND target_profile_id = $2)
          OR (profile_id = $2 AND target_profile_id = $1)`,
      [actorProfileId, targetProfileId],
    );

    await db.query(
      `DELETE FROM brigade.notifications
       WHERE (profile_id = $1 AND from_profile_id = $2)
          OR (profile_id = $2 AND from_profile_id = $1)`,
      [actorProfileId, targetProfileId],
    );

    // Both directions: blocking someone must also stop their feed showing you.
    ctx.enqueue({
      queue: "default",
      worker: "ClearFeedWorker",
      args: { profileId: actorProfileId, targetProfileId },
    });
    ctx.enqueue({
      queue: "default",
      worker: "ClearFeedWorker",
      args: { profileId: targetProfileId, targetProfileId: actorProfileId },
    });

    // Degrees are recomputed rather than patched — a severed connection can
    // change 2nd/3rd degree for many pairs, not just this one.
    ctx.enqueue({
      queue: "pull",
      worker: "RecomputeConnectionDegreesWorker",
      args: { profileIds: [actorProfileId, targetProfileId] },
    });

    const row = block.rows[0];
    if (!row) throw new ServiceError("Could not record the block", "block_failed");

    return {
      blockId: row.id,
      severedConnection: (severed.rowCount ?? 0) > 0,
      removedFollows: follows.rowCount ?? 0,
    };
  }
}
