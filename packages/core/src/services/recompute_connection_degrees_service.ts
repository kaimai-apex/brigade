import { BaseService, type ServiceContext } from "./base_service.ts";

/**
 * Materialises 2nd-degree connections for the given profiles.
 *
 * Degree-of-separation is the single most expensive query in a professional
 * network and the one the reference architecture gives no help with, because a
 * microblog has no equivalent. At 10k profiles a live self-join is fine; at
 * 500k it is a full-table join that takes the database down mid-demo. So it is
 * computed on a schedule into connection_degrees and read from there.
 *
 * Scoped to a neighbourhood rather than the whole graph: one new edge only
 * changes degrees for the two endpoints and the people they already know.
 */

export type RecomputeArgs = { ctx: ServiceContext; profileIds: string[] };
export type RecomputeResult = { profilesProcessed: number; pairsWritten: number };

export class RecomputeConnectionDegreesService extends BaseService<
  RecomputeArgs,
  RecomputeResult
> {
  async call({ ctx, profileIds }: RecomputeArgs): Promise<RecomputeResult> {
    const { db } = ctx;
    if (profileIds.length === 0) return { profilesProcessed: 0, pairsWritten: 0 };

    // Connections are one canonically-ordered row, so "my connections" is a
    // union over both columns. Expanded into a view-like CTE once, then joined
    // to itself to reach second degree.
    const written = await db.query<{ count: string }>(
      `WITH edges AS (
         SELECT profile_id AS a, target_profile_id AS b FROM brigade.connections WHERE state = 'accepted'
         UNION ALL
         SELECT target_profile_id AS a, profile_id AS b FROM brigade.connections WHERE state = 'accepted'
       ),
       seeds AS (SELECT unnest($1::bigint[]) AS id),
       second AS (
         SELECT e1.a AS profile_id, e2.b AS target_profile_id, count(*)::int AS path_count
         FROM edges e1
         JOIN edges e2 ON e2.a = e1.b
         JOIN seeds s ON s.id = e1.a
         WHERE e2.b <> e1.a
           -- exclude anyone already a direct connection
           AND NOT EXISTS (
             SELECT 1 FROM edges direct WHERE direct.a = e1.a AND direct.b = e2.b
           )
         GROUP BY e1.a, e2.b
       ),
       cleared AS (
         DELETE FROM brigade.connection_degrees d
         WHERE d.profile_id = ANY($1::bigint[]) AND d.degree = 2
         RETURNING 1
       ),
       inserted AS (
         INSERT INTO brigade.connection_degrees (profile_id, target_profile_id, degree, path_count, computed_at)
         SELECT profile_id, target_profile_id, 2, path_count, now() FROM second
         ON CONFLICT (profile_id, target_profile_id)
           DO UPDATE SET degree = 2, path_count = EXCLUDED.path_count, computed_at = now()
         RETURNING 1
       )
       SELECT count(*)::text AS count FROM inserted`,
      [profileIds],
    );

    return {
      profilesProcessed: profileIds.length,
      pairsWritten: Number(written.rows[0]?.count ?? 0),
    };
  }
}
