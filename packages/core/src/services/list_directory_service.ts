import { BaseService, type ServiceContext } from "./base_service.ts";
import { buildDirectoryQuery, type DirectoryParams } from "../lib/directory_scopes.ts";
import { RelationshipsService } from "./relationships_service.ts";
import type { ProfileRecord } from "../serializers/profile_serializer.ts";
import type { RelationshipMap } from "./relationships_service.ts";

/**
 * The directory read path.
 *
 * Two things it does deliberately:
 *
 *   1. Loads every viewer relationship for the whole page in ONE query
 *      (RelationshipsService) rather than per card. This is the same
 *      preload-the-batch idea that keeps feed filtering off the N+1 path.
 *   2. Reports whether the response is cacheable. An anonymous request is
 *      identical for everyone and can sit on a CDN; an authenticated one
 *      excludes blocked profiles and carries relationship state, so it cannot.
 *      Splitting those two paths is most of the directory's scaling story.
 */

export type ListDirectoryArgs = {
  ctx: ServiceContext;
  params: DirectoryParams;
  viewerProfileId: string | null;
};

export type ListDirectoryResult = {
  profiles: ProfileRecord[];
  relationships: RelationshipMap;
  total: number;
  limit: number;
  offset: number;
  cacheable: boolean;
};

type Row = Record<string, unknown>;

function toProfileRecord(row: Row): ProfileRecord {
  return {
    id: String(row.id),
    type: row.type as "person" | "company",
    username: String(row.username),
    displayName: String(row.display_name ?? ""),
    headline: (row.headline as string) ?? null,
    bio: (row.bio as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    headerUrl: (row.header_url as string) ?? null,
    countryCode: (row.country_code as string) ?? null,
    city: (row.city as string) ?? null,
    region: (row.region as string) ?? null,
    openTo: (row.open_to as string[]) ?? [],
    openToVisibility: String(row.open_to_visibility ?? "connections"),
    completeness: Number(row.completeness ?? 0),
    lastActiveAt: (row.last_active_at as Date) ?? null,
    createdAt: (row.created_at as Date) ?? new Date(),
    discoverable: Boolean(row.discoverable),
    suspendedAt: (row.suspended_at as Date) ?? null,
    silencedAt: (row.silenced_at as Date) ?? null,
    deletedAt: (row.deleted_at as Date) ?? null,
    stats: {
      connectionsCount: Number(row.connections_count ?? 0),
      followersCount: Number(row.followers_count ?? 0),
      followingCount: Number(row.following_count ?? 0),
      postsCount: Number(row.posts_count ?? 0),
    },
  };
}

export class ListDirectoryService extends BaseService<ListDirectoryArgs, ListDirectoryResult> {
  async call({ ctx, params, viewerProfileId }: ListDirectoryArgs): Promise<ListDirectoryResult> {
    const { sql, countSql, values } = buildDirectoryQuery(params, viewerProfileId);

    const [rows, count] = await Promise.all([
      ctx.db.query<Row>(sql, values),
      ctx.db.query<{ total: number }>(countSql, values),
    ]);

    const profiles = rows.rows.map(toProfileRecord);

    const relationships = await new RelationshipsService().call({
      ctx,
      viewerProfileId,
      profileIds: profiles.map((p) => p.id),
    });

    return {
      profiles,
      relationships,
      total: count.rows[0]?.total ?? 0,
      limit: Math.min(Math.max(params.limit ?? 24, 1), 48),
      offset: Math.max(params.offset ?? 0, 0),
      cacheable: viewerProfileId === null,
    };
  }
}

/**
 * Facet counts for the filter rail.
 *
 * Deliberately a separate query from the listing: facets are the same for
 * everyone with the same filters, so they cache independently and on a longer
 * horizon than the page itself.
 */
export type FacetResult = {
  roles: { value: string; count: number }[];
  cities: { value: string; count: number }[];
  countries: { value: string; count: number }[];
};

export class DirectoryFacetsService extends BaseService<
  { ctx: ServiceContext; params: DirectoryParams; viewerProfileId: string | null },
  FacetResult
> {
  async call({
    ctx,
    params,
    viewerProfileId,
  }: {
    ctx: ServiceContext;
    params: DirectoryParams;
    viewerProfileId: string | null;
  }): Promise<FacetResult> {
    // Facets are computed against the filters MINUS pagination, so the counts
    // describe the whole result set rather than the current page.
    const { countSql, values } = buildDirectoryQuery(
      { ...params, limit: undefined, offset: undefined },
      viewerProfileId,
    );
    const from = countSql.slice(countSql.indexOf("FROM"));

    const [cities, countries, titles] = await Promise.all([
      ctx.db.query<{ value: string; count: number }>(
        `SELECT p.city AS value, count(*)::int AS count ${from}
           AND p.city IS NOT NULL GROUP BY p.city ORDER BY count DESC, value LIMIT 20`,
        values,
      ),
      ctx.db.query<{ value: string; count: number }>(
        `SELECT p.country_code AS value, count(*)::int AS count ${from}
           AND p.country_code IS NOT NULL GROUP BY p.country_code ORDER BY count DESC, value LIMIT 20`,
        values,
      ),
      ctx.db.query<{ value: string; count: number }>(
        `SELECT e.title AS value, count(DISTINCT p.id)::int AS count ${from}
           AND EXISTS (SELECT 1 FROM brigade.experiences x WHERE x.profile_id = p.id AND x.is_current)
         AND EXISTS (SELECT 1 FROM brigade.experiences e2 WHERE e2.profile_id = p.id)
         GROUP BY e.title ORDER BY count DESC, value LIMIT 20`.replace(
          "FROM brigade.profiles p",
          "FROM brigade.profiles p JOIN brigade.experiences e ON e.profile_id = p.id AND e.is_current",
        ),
        values,
      ),
    ]);

    return {
      roles: titles.rows,
      cities: cities.rows,
      countries: countries.rows,
    };
  }
}
