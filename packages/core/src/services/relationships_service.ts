import { BaseService, type ServiceContext } from "./base_service.ts";
import type { Relationship } from "../policies/profile_policy.ts";

/**
 * Given N profile IDs, return the viewer's relationship to each — in one query.
 *
 * Without this, a directory page showing 30 profiles fires 30 requests just to
 * decide which button to render on each card, and every list view in the
 * product reinvents the same N+1. It is a small endpoint that changes the shape
 * of the whole client.
 *
 * This is also the "crutches" idea generalised: when filtering or rendering a
 * batch against per-viewer relationship state, load that state once in bulk and
 * work from memory. It applies far beyond feeds.
 */

export type RelationshipsArgs = {
  ctx: ServiceContext;
  viewerProfileId: string | null;
  profileIds: string[];
};

export type RelationshipMap = Record<
  string,
  Relationship & {
    connected: boolean;
    pendingIncoming: boolean;
    pendingOutgoing: boolean;
    following: boolean;
    followedBy: boolean;
    muting: boolean;
  }
>;

const EMPTY = {
  degree: null,
  blockedByTarget: false,
  blockingTarget: false,
  connected: false,
  pendingIncoming: false,
  pendingOutgoing: false,
  following: false,
  followedBy: false,
  muting: false,
} as const;

export class RelationshipsService extends BaseService<RelationshipsArgs, RelationshipMap> {
  async call({ ctx, viewerProfileId, profileIds }: RelationshipsArgs): Promise<RelationshipMap> {
    const map: RelationshipMap = {};
    for (const id of profileIds) map[id] = { ...EMPTY };

    if (!viewerProfileId || profileIds.length === 0) return map;

    // One round trip. Each branch is a small indexed lookup, unioned so the
    // planner can use a different index per relation rather than joining five
    // tables together.
    const result = await ctx.db.query<{
      other: string;
      relation: string;
      detail: string | null;
    }>(
      `WITH targets AS (SELECT unnest($2::bigint[]) AS id)
       SELECT CASE WHEN c.profile_id = $1 THEN c.target_profile_id ELSE c.profile_id END::text AS other,
              'connection' AS relation,
              (c.state::text || ':' || c.requested_by::text) AS detail
       FROM brigade.connections c
       JOIN targets t ON t.id = CASE WHEN c.profile_id = $1 THEN c.target_profile_id ELSE c.profile_id END
       WHERE c.profile_id = $1 OR c.target_profile_id = $1

       UNION ALL
       SELECT f.target_profile_id::text, 'following', NULL
       FROM brigade.follows f JOIN targets t ON t.id = f.target_profile_id
       WHERE f.profile_id = $1

       UNION ALL
       SELECT f.profile_id::text, 'followed_by', NULL
       FROM brigade.follows f JOIN targets t ON t.id = f.profile_id
       WHERE f.target_profile_id = $1

       UNION ALL
       SELECT b.target_profile_id::text, 'blocking', NULL
       FROM brigade.blocks b JOIN targets t ON t.id = b.target_profile_id
       WHERE b.profile_id = $1

       UNION ALL
       SELECT b.profile_id::text, 'blocked_by', NULL
       FROM brigade.blocks b JOIN targets t ON t.id = b.profile_id
       WHERE b.target_profile_id = $1

       UNION ALL
       SELECT m.target_profile_id::text, 'muting', NULL
       FROM brigade.mutes m JOIN targets t ON t.id = m.target_profile_id
       WHERE m.profile_id = $1 AND (m.expires_at IS NULL OR m.expires_at > now())

       UNION ALL
       SELECT d.target_profile_id::text, 'degree', d.degree::text
       FROM brigade.connection_degrees d JOIN targets t ON t.id = d.target_profile_id
       WHERE d.profile_id = $1`,
      [viewerProfileId, profileIds],
    );

    for (const row of result.rows) {
      const entry = map[row.other];
      if (!entry) continue;

      switch (row.relation) {
        case "connection": {
          const [state, requestedBy] = (row.detail ?? "").split(":");
          if (state === "accepted") {
            entry.connected = true;
            entry.degree = 1;
          } else if (state === "pending") {
            if (requestedBy === viewerProfileId) entry.pendingOutgoing = true;
            else entry.pendingIncoming = true;
          }
          break;
        }
        case "following":
          entry.following = true;
          break;
        case "followed_by":
          entry.followedBy = true;
          break;
        case "blocking":
          entry.blockingTarget = true;
          break;
        case "blocked_by":
          entry.blockedByTarget = true;
          break;
        case "muting":
          entry.muting = true;
          break;
        case "degree": {
          // A direct connection always wins over a materialised degree, which
          // may be a recompute behind.
          const degree = Number(row.detail);
          if (!entry.connected && (degree === 2 || degree === 3)) entry.degree = degree;
          break;
        }
      }
    }

    return map;
  }
}
