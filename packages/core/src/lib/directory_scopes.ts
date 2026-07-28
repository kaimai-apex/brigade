/**
 * Composable directory scopes.
 *
 * Each filter is an independent fragment merged into one query. The
 * alternative — a single function that grows a branch per filter — is how a
 * directory ends up as a 600-line query builder nobody will touch. Brigade
 * will have fifteen filters; this is the only shape that survives that.
 *
 * Adding a filter means adding one entry to SCOPES. Nothing else changes.
 */

export type DirectoryParams = {
  q?: string;
  skills?: string[];
  industries?: string[];
  companies?: string[];
  jobTitles?: string[];
  countryCode?: string;
  city?: string;
  remoteOnly?: boolean;
  willingToRelocate?: boolean;
  seniority?: string;
  minYears?: number;
  maxYears?: number;
  educationInstitutions?: string[];
  openTo?: string[];
  /** The most valuable filter in the product. */
  verifiedOnly?: boolean;
  languages?: string[];
  connectionDegree?: 1 | 2 | 3;
  activeWithinDays?: number;
  hasPhoto?: boolean;
  sort?: DirectorySort;
  limit?: number;
  offset?: number;
};

export type DirectorySort =
  | "relevance"
  | "active"
  | "new"
  | "connections"
  | "completeness";

export type Scope = {
  where: string;
  values: unknown[];
};

type ScopeBuilder = (params: DirectoryParams, viewerProfileId: string | null) => Scope | null;

/**
 * Placeholders are written as `$$` and renumbered when the query is assembled,
 * so a scope never has to know how many parameters came before it. That is what
 * makes them genuinely independent.
 */
const SCOPES: Record<string, ScopeBuilder> = {
  // Always applied. Directory listing is opt-in, and suspended or silenced
  // profiles leave discovery entirely.
  discoverable: () => ({
    where:
      "p.discoverable = true AND p.deleted_at IS NULL AND p.suspended_at IS NULL AND p.silenced_at IS NULL",
    values: [],
  }),

  // People only. Company pages have their own surface.
  people: () => ({ where: "p.type = 'person'", values: [] }),

  q: (p) =>
    p.q?.trim()
      ? {
          // websearch_to_tsquery handles quoted phrases and negation the way a
          // user expects; the trigram clause catches misspellings the tsquery
          // misses.
          where:
            "(p.search_vector @@ websearch_to_tsquery('simple', unaccent($$)) OR p.display_name % $$)",
          values: [p.q.trim(), p.q.trim()],
        }
      : null,

  skills: (p) =>
    p.skills?.length
      ? {
          where:
            "EXISTS (SELECT 1 FROM brigade.profile_skills ps WHERE ps.profile_id = p.id AND ps.skill_id = ANY($$::bigint[]))",
          values: [p.skills],
        }
      : null,

  companies: (p) =>
    p.companies?.length
      ? {
          where:
            "EXISTS (SELECT 1 FROM brigade.experiences e WHERE e.profile_id = p.id AND e.company_id = ANY($$::bigint[]))",
          values: [p.companies],
        }
      : null,

  jobTitles: (p) =>
    p.jobTitles?.length
      ? {
          where:
            "EXISTS (SELECT 1 FROM brigade.experiences e WHERE e.profile_id = p.id AND e.job_title_id = ANY($$::bigint[]))",
          values: [p.jobTitles],
        }
      : null,

  educationInstitutions: (p) =>
    p.educationInstitutions?.length
      ? {
          where:
            "EXISTS (SELECT 1 FROM brigade.educations ed WHERE ed.profile_id = p.id AND ed.institution_id = ANY($$::bigint[]))",
          values: [p.educationInstitutions],
        }
      : null,

  countryCode: (p) =>
    p.countryCode ? { where: "p.country_code = $$", values: [p.countryCode] } : null,

  city: (p) => (p.city ? { where: "p.city ILIKE $$", values: [p.city] } : null),

  remoteOnly: (p) => (p.remoteOnly ? { where: "p.remote_only = true", values: [] } : null),

  willingToRelocate: (p) =>
    p.willingToRelocate ? { where: "p.willing_to_relocate = true", values: [] } : null,

  seniority: (p) => (p.seniority ? { where: "p.seniority = $$", values: [p.seniority] } : null),

  minYears: (p) =>
    typeof p.minYears === "number" ? { where: "p.years_experience >= $$", values: [p.minYears] } : null,

  maxYears: (p) =>
    typeof p.maxYears === "number" ? { where: "p.years_experience <= $$", values: [p.maxYears] } : null,

  openTo: (p) => (p.openTo?.length ? { where: "p.open_to && $$::text[]", values: [p.openTo] } : null),

  languages: (p) =>
    p.languages?.length
      ? {
          where:
            "EXISTS (SELECT 1 FROM brigade.profile_languages pl WHERE pl.profile_id = p.id AND pl.language_code = ANY($$::text[]))",
          values: [p.languages],
        }
      : null,

  // Verified employment. Expiry is checked here rather than trusting
  // verified_at, so a lapsed badge stops matching immediately instead of
  // waiting for the nightly sweep.
  verifiedOnly: (p) =>
    p.verifiedOnly
      ? {
          where: `EXISTS (
            SELECT 1 FROM brigade.experiences e
            WHERE e.profile_id = p.id
              AND e.verified_at IS NOT NULL
              AND (e.verification_expires_at IS NULL OR e.verification_expires_at > now())
          )`,
          values: [],
        }
      : null,

  hasPhoto: (p) => (p.hasPhoto ? { where: "p.avatar_url IS NOT NULL", values: [] } : null),

  activeWithin: (p) =>
    typeof p.activeWithinDays === "number"
      ? {
          where: "p.last_active_at > now() - make_interval(days => $$)",
          values: [p.activeWithinDays],
        }
      : null,

  // Reads the materialised table rather than walking the graph live. At 500k
  // profiles the live version is a full-table self-join.
  connectionDegree: (p, viewer) => {
    if (!p.connectionDegree || !viewer) return null;
    if (p.connectionDegree === 1) {
      return {
        where: `EXISTS (
          SELECT 1 FROM brigade.connections c
          WHERE c.state = 'accepted'
            AND ((c.profile_id = $$ AND c.target_profile_id = p.id)
              OR (c.target_profile_id = $$ AND c.profile_id = p.id))
        )`,
        values: [viewer, viewer],
      };
    }
    return {
      where: `EXISTS (
        SELECT 1 FROM brigade.connection_degrees d
        WHERE d.profile_id = $$ AND d.target_profile_id = p.id AND d.degree <= $$
      )`,
      values: [viewer, p.connectionDegree],
    };
  },

  // A viewer never sees anyone they have blocked or been blocked by.
  excludeBlocked: (_p, viewer) =>
    viewer
      ? {
          where: `NOT EXISTS (
            SELECT 1 FROM brigade.blocks b
            WHERE (b.profile_id = $$ AND b.target_profile_id = p.id)
               OR (b.target_profile_id = $$ AND b.profile_id = p.id)
          )`,
          values: [viewer, viewer],
        }
      : null,

  excludeSelf: (_p, viewer) => (viewer ? { where: "p.id <> $$", values: [viewer] } : null),
};

const ORDER_BY: Record<DirectorySort, string> = {
  active: "p.last_active_at DESC NULLS LAST, p.id DESC",
  new: "p.id DESC",
  connections: "s.connections_count DESC, p.id DESC",
  completeness: "p.completeness DESC, p.id DESC",
  // Weighted rather than learned, and deliberately inspectable: this ordering
  // affects who gets found in a hiring context, so it has to be explainable and
  // auditable. Verification and completeness dominate; recency breaks ties.
  relevance: `(
      (CASE WHEN EXISTS (
        SELECT 1 FROM brigade.experiences e
        WHERE e.profile_id = p.id AND e.verified_at IS NOT NULL
          AND (e.verification_expires_at IS NULL OR e.verification_expires_at > now())
      ) THEN 40 ELSE 0 END)
      + (p.completeness * 0.4)
      + (LEAST(s.connections_count, 50) * 0.2)
      + (CASE WHEN p.last_active_at > now() - interval '30 days' THEN 10 ELSE 0 END)
    ) DESC, p.id DESC`,
};

export type BuiltQuery = { sql: string; values: unknown[]; countSql: string };

export function buildDirectoryQuery(
  params: DirectoryParams,
  viewerProfileId: string | null,
): BuiltQuery {
  const clauses: string[] = [];
  const values: unknown[] = [];

  for (const build of Object.values(SCOPES)) {
    const scope = build(params, viewerProfileId);
    if (!scope) continue;

    // Renumber this scope's placeholders against the running parameter list.
    let i = 0;
    const where = scope.where.replace(/\$\$/g, () => {
      values.push(scope.values[i]);
      i += 1;
      return `$${values.length}`;
    });
    clauses.push(where);
  }

  const where = clauses.join("\n  AND ");
  const sort = params.sort ?? "relevance";
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 48);
  const offset = Math.max(params.offset ?? 0, 0);

  const from = `
    FROM brigade.profiles p
    JOIN brigade.profile_stats s ON s.profile_id = p.id
    WHERE ${where}`;

  return {
    // Offset paging is acceptable here specifically: directory results are
    // ordered by activity rather than id, bounded, and cached. Everything
    // realtime uses cursors instead.
    sql: `SELECT p.*, s.connections_count, s.followers_count, s.following_count, s.posts_count
          ${from}
          ORDER BY ${ORDER_BY[sort]}
          LIMIT ${limit} OFFSET ${offset}`,
    countSql: `SELECT count(*)::int AS total ${from}`,
    values,
  };
}
