import { BaseService, ForbiddenError, NotFoundError, ServiceError, type ServiceContext } from "./base_service.ts";
import { NotifyService } from "./notify_service.ts";

/**
 * The connection graph.
 *
 * Connections are stored as ONE canonically-ordered row (migration 006), so
 * every query here sorts the pair before touching the table. The alternative —
 * a row per direction — makes a connection able to exist half-way, which is a
 * state no amount of application code reliably prevents.
 */

function canonical(a: string, b: string): [string, string] {
  return BigInt(a) < BigInt(b) ? [a, b] : [b, a];
}

export type ConnectionArgs = {
  ctx: ServiceContext;
  actorProfileId: string;
  targetProfileId: string;
  message?: string | null;
};

export type ConnectionResult = { connectionId: string; state: string };

export class RequestConnectionService extends BaseService<ConnectionArgs, ConnectionResult> {
  async call({ ctx, actorProfileId, targetProfileId, message = null }: ConnectionArgs) {
    const { db } = ctx;
    if (actorProfileId === targetProfileId) {
      throw new ForbiddenError("You cannot connect to yourself");
    }

    const target = await db.query<{ id: string; suspended_at: Date | null; type: string }>(
      `SELECT id::text, suspended_at, type::text FROM brigade.profiles
       WHERE id = $1 AND deleted_at IS NULL`,
      [targetProfileId],
    );
    const targetRow = target.rows[0];
    if (!targetRow || targetRow.suspended_at) throw new NotFoundError("Profile not found");

    // Company pages are followed, not connected to. Connections are between
    // people; conflating the two is what makes degree-of-separation meaningless.
    if (targetRow.type === "company") {
      throw new ServiceError("Company pages are followed, not connected to", "follow_instead", 422);
    }

    const blocked = await db.query(
      `SELECT 1 FROM brigade.blocks
       WHERE (profile_id = $1 AND target_profile_id = $2)
          OR (profile_id = $2 AND target_profile_id = $1) LIMIT 1`,
      [actorProfileId, targetProfileId],
    );
    // Same error as "not found": confirming a block tells the blocked party
    // they were blocked.
    if (blocked.rowCount) throw new NotFoundError("Profile not found");

    const [low, high] = canonical(actorProfileId, targetProfileId);

    const existing = await db.query<{ id: string; state: string }>(
      `SELECT id::text, state::text FROM brigade.connections
       WHERE profile_id = $1 AND target_profile_id = $2`,
      [low, high],
    );

    const found = existing.rows[0];
    if (found?.state === "accepted") {
      return { connectionId: found.id, state: "accepted" };
    }

    // A re-request after a rejection reopens the same row rather than creating
    // a second one — the unique constraint would refuse it anyway.
    const upserted = await db.query<{ id: string; state: string }>(
      `INSERT INTO brigade.connections (profile_id, target_profile_id, requested_by, state, message)
       VALUES ($1, $2, $3, 'pending', $4)
       ON CONFLICT (profile_id, target_profile_id) DO UPDATE
         SET state = 'pending', requested_by = $3, message = $4,
             requested_at = now(), responded_at = NULL
       RETURNING id::text, state::text`,
      [low, high, actorProfileId, message],
    );

    const row = upserted.rows[0];
    if (!row) throw new ServiceError("Could not create the request", "connection_failed");

    await new NotifyService().call({
      ctx,
      profileId: targetProfileId,
      fromProfileId: actorProfileId,
      type: "connection_request",
      payload: { connectionId: row.id, message },
    });

    return { connectionId: row.id, state: row.state };
  }
}

/**
 * Accepting is where the work is: the relationship becomes mutual, both
 * counters move, and each party's existing feed has to be backfilled with the
 * other's recent posts. That last part is the one people forget — a new
 * connection whose posts only appear going forward feels broken.
 */
export class AcceptConnectionService extends BaseService<ConnectionArgs, ConnectionResult> {
  async call({ ctx, actorProfileId, targetProfileId }: ConnectionArgs) {
    const { db } = ctx;
    const [low, high] = canonical(actorProfileId, targetProfileId);

    const pending = await db.query<{ id: string; requested_by: string }>(
      `SELECT id::text, requested_by::text FROM brigade.connections
       WHERE profile_id = $1 AND target_profile_id = $2 AND state = 'pending'`,
      [low, high],
    );
    const row = pending.rows[0];
    if (!row) throw new NotFoundError("No pending request");

    // Only the recipient may accept — the requester accepting their own request
    // would be a one-sided connection.
    if (row.requested_by === actorProfileId) {
      throw new ForbiddenError("You cannot accept your own request");
    }

    await db.query(
      `UPDATE brigade.connections SET state = 'accepted', responded_at = now() WHERE id = $1`,
      [row.id],
    );

    await db.query(
      `UPDATE brigade.profile_stats SET connections_count = connections_count + 1, updated_at = now()
       WHERE profile_id = ANY($1::bigint[])`,
      [[actorProfileId, targetProfileId]],
    );

    await new NotifyService().call({
      ctx,
      profileId: row.requested_by,
      fromProfileId: actorProfileId,
      type: "connection_accepted",
      payload: { connectionId: row.id },
    });

    // Backfill in both directions, retroactively.
    ctx.enqueue({
      queue: "default",
      worker: "MergeFeedWorker",
      args: { intoProfileId: actorProfileId, fromProfileId: targetProfileId },
    });
    ctx.enqueue({
      queue: "default",
      worker: "MergeFeedWorker",
      args: { intoProfileId: targetProfileId, fromProfileId: actorProfileId },
    });

    // A new edge changes 2nd/3rd degree for many pairs, not just this one, so
    // the whole neighbourhood is recomputed rather than patched.
    ctx.enqueue({
      queue: "pull",
      worker: "RecomputeConnectionDegreesWorker",
      args: { profileIds: [actorProfileId, targetProfileId] },
    });

    return { connectionId: row.id, state: "accepted" };
  }
}

export class RemoveConnectionService extends BaseService<ConnectionArgs, { removed: boolean }> {
  async call({ ctx, actorProfileId, targetProfileId }: ConnectionArgs) {
    const { db } = ctx;
    const [low, high] = canonical(actorProfileId, targetProfileId);

    const deleted = await db.query(
      `DELETE FROM brigade.connections
       WHERE profile_id = $1 AND target_profile_id = $2 AND state = 'accepted'`,
      [low, high],
    );
    if (!deleted.rowCount) return { removed: false };

    await db.query(
      `UPDATE brigade.profile_stats
       SET connections_count = GREATEST(connections_count - 1, 0), updated_at = now()
       WHERE profile_id = ANY($1::bigint[])`,
      [[actorProfileId, targetProfileId]],
    );

    // Removal is retroactive too: their posts come out of my feed.
    ctx.enqueue({
      queue: "default",
      worker: "UnmergeFeedWorker",
      args: { intoProfileId: actorProfileId, fromProfileId: targetProfileId },
    });
    ctx.enqueue({
      queue: "default",
      worker: "UnmergeFeedWorker",
      args: { intoProfileId: targetProfileId, fromProfileId: actorProfileId },
    });
    ctx.enqueue({
      queue: "pull",
      worker: "RecomputeConnectionDegreesWorker",
      args: { profileIds: [actorProfileId, targetProfileId] },
    });

    return { removed: true };
  }
}
