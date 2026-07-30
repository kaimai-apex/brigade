import { getPool } from "@connectpro/common";

/**
 * Named teams built from a member's accepted connections.
 *
 * Direct-Postgres for the same reason as the directory and mentorship: only
 * apps/web is deployed to the hosted site.
 */

function pool() {
  return getPool();
}

let ready: Promise<void> | null = null;

/** Idempotent DDL, applied lazily — the hosted database is migrated by hand. */
export function ensureBrigadeTeamsSchema() {
  if (ready) return ready;

  ready = (async () => {
    await pool().query(`
      CREATE TABLE IF NOT EXISTS connections.brigade_teams (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id   UUID        NOT NULL,
        name       TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool().query(`
      CREATE INDEX IF NOT EXISTS idx_brigade_teams_owner
        ON connections.brigade_teams (owner_id, created_at DESC)
    `);
    await pool().query(`
      CREATE TABLE IF NOT EXISTS connections.brigade_team_members (
        team_id   UUID NOT NULL REFERENCES connections.brigade_teams (id) ON DELETE CASCADE,
        member_id UUID NOT NULL,
        added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (team_id, member_id)
      )
    `);
    await pool().query(`
      CREATE INDEX IF NOT EXISTS idx_brigade_team_members_member
        ON connections.brigade_team_members (member_id)
    `);
  })();

  ready.catch(() => {
    ready = null;
  });

  return ready;
}

export interface BrigadeTeam {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

export async function dbListTeams(ownerId: string): Promise<BrigadeTeam[]> {
  await ensureBrigadeTeamsSchema();
  // One query with an aggregate rather than N+1 member lookups.
  const res = await pool().query(
    `SELECT t.id, t.name, t.created_at,
            COALESCE(
              array_agg(m.member_id ORDER BY m.added_at) FILTER (WHERE m.member_id IS NOT NULL),
              '{}'
            ) AS member_ids
     FROM connections.brigade_teams t
     LEFT JOIN connections.brigade_team_members m ON m.team_id = t.id
     WHERE t.owner_id = $1
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [ownerId],
  );
  return res.rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    memberIds: (r.member_ids as string[]) ?? [],
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

/**
 * Create a team.
 *
 * Members are intersected with the owner's accepted connections in SQL rather
 * than trusted from the request — otherwise anyone could assemble a "team" of
 * strangers and the page would render their names as if they had agreed to it.
 */
export async function dbCreateTeam(
  ownerId: string,
  name: string,
  memberIds: string[],
): Promise<BrigadeTeam> {
  await ensureBrigadeTeamsSchema();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Give the Brigade a name");
  if (trimmed.length > 80) throw new Error("That name is too long");

  const unique = [...new Set(memberIds)];

  let teamId: string;
  const client = await pool().connect();
  try {
    await client.query("BEGIN");

    const team = await client.query(
      `INSERT INTO connections.brigade_teams (owner_id, name) VALUES ($1, $2)
       RETURNING id, name, created_at`,
      [ownerId, trimmed],
    );
    teamId = team.rows[0].id as string;

    if (unique.length > 0) {
      await client.query(
        `INSERT INTO connections.brigade_team_members (team_id, member_id)
         SELECT $1, c.other
         FROM (
           SELECT CASE WHEN sender_id = $2 THEN receiver_id ELSE sender_id END AS other
           FROM connections.connections
           WHERE (sender_id = $2 OR receiver_id = $2) AND status = 'accepted'
         ) c
         WHERE c.other = ANY($3::uuid[])
         ON CONFLICT DO NOTHING`,
        [teamId, ownerId, unique],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // By id, not by name — two teams may legitimately share one.
  const teams = await dbListTeams(ownerId);
  const created = teams.find((t) => t.id === teamId);
  if (!created) throw new Error("Could not read the Brigade back after creating it");
  return created;
}

export async function dbDeleteTeam(id: string, ownerId: string): Promise<void> {
  await ensureBrigadeTeamsSchema();
  // Ownership in the WHERE clause; members cascade.
  await pool().query(
    "DELETE FROM connections.brigade_teams WHERE id = $1 AND owner_id = $2",
    [id, ownerId],
  );
}
