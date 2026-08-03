import { getAuthSchema, getPool } from "@connectpro/common";

/**
 * Throwaway personas for walking the product without using a real account.
 *
 * Exists because demoing the become-a-mentor flow otherwise means either
 * signing in as yourself — and permanently turning your own profile into a
 * mentor — or hand-crafting a user every time. Neither is something you want to
 * do in front of someone.
 *
 * Every caller is gated on NODE_ENV !== "production". This module does not
 * check that itself: it is a data layer, and a guard buried three files deep is
 * a guard nobody can see. The check lives at each entry point, where it is
 * obvious.
 */

/** Personas are tagged by email so they can be found and cleared as a set. */
export const DEV_PERSONA_DOMAIN = "persona.brigade.local";

export function isDevPersonaEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${DEV_PERSONA_DOMAIN}`);
}

/** A fresh address each time, so every run starts from a genuinely blank slate. */
export function newPersonaEmail(kind: string): string {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 6);
  return `${kind}.${stamp}${noise}@${DEV_PERSONA_DOMAIN}`;
}

/**
 * Put a persona back to the moment after signup.
 *
 * Deletes their mentor setup and blanks every onboarding answer, so the same
 * login can walk either flow again from step one. Bookings they made are
 * removed too — otherwise the mentor row cannot be deleted, and a half-cleared
 * persona is worse than none.
 *
 * Refuses anything that is not a persona. Pointing this at a real account would
 * silently destroy somebody's profile.
 */
export async function resetDevPersona(userId: string): Promise<boolean> {
  const pool = getPool();

  const who = await pool.query(
    `SELECT email FROM ${getAuthSchema()}.users WHERE id = $1`,
    [userId],
  );
  const email = who.rows[0]?.email as string | undefined;
  if (!email || !isDevPersonaEmail(email)) return false;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM mentorship.bookings WHERE mentor_user_id = $1 OR mentee_user_id = $1",
      [userId],
    );
    // session_types and availability cascade from the mentor row.
    await client.query("DELETE FROM mentorship.mentors WHERE user_id = $1", [userId]);
    await client.query(
      `UPDATE users.profiles SET
         headline = NULL, about = NULL, role = NULL, city = NULL, country = NULL,
         preferred_name = NULL, pronouns = NULL, timezone = NULL,
         languages = '{}', experience_level = NULL, workplace_type = NULL,
         interest_industries = '{}', skills_wanted = '{}', goals = '{}',
         help_wanted = '{}', biggest_challenge = NULL,
         preferred_session_minutes = NULL, preferred_mentor_experience = NULL,
         current_position = NULL, current_employer = NULL,
         linkedin_url = NULL, instagram_url = NULL, website = NULL,
         onboarding_completed = false, onboarding_step = 0,
         updated_at = now()
       WHERE user_id = $1`,
      [userId],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export interface DevPersonaSummary {
  userId: string;
  email: string;
  name: string;
  isPersona: boolean;
  /** Where they are in each flow, so the console can say what a reset would undo. */
  onboardingCompleted: boolean;
  mentorStatus: string | null;
}

/** Who the current session is, and how far through each flow. */
export async function describeCurrentUser(userId: string): Promise<DevPersonaSummary | null> {
  const res = await getPool().query(
    `SELECT u.email,
            trim(concat_ws(' ', p.first_name, p.last_name)) AS name,
            COALESCE(p.onboarding_completed, false) AS onboarding_completed,
            m.status AS mentor_status
       FROM ${getAuthSchema()}.users u
       LEFT JOIN users.profiles p     ON p.user_id = u.id
       LEFT JOIN mentorship.mentors m ON m.user_id = u.id
      WHERE u.id = $1`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) return null;

  return {
    userId,
    email: row.email as string,
    name: (row.name as string) || "Unnamed",
    isPersona: isDevPersonaEmail(row.email as string),
    onboardingCompleted: Boolean(row.onboarding_completed),
    mentorStatus: (row.mentor_status as string) ?? null,
  };
}

/** Every persona created so far, newest first — the console lists them to switch back. */
export async function listDevPersonas(limit = 12): Promise<DevPersonaSummary[]> {
  const res = await getPool().query(
    `SELECT u.id, u.email,
            trim(concat_ws(' ', p.first_name, p.last_name)) AS name,
            COALESCE(p.onboarding_completed, false) AS onboarding_completed,
            m.status AS mentor_status
       FROM ${getAuthSchema()}.users u
       LEFT JOIN users.profiles p     ON p.user_id = u.id
       LEFT JOIN mentorship.mentors m ON m.user_id = u.id
      WHERE u.email LIKE $1
      ORDER BY u.created_at DESC
      LIMIT $2`,
    [`%@${DEV_PERSONA_DOMAIN}`, limit],
  );
  return res.rows.map((row) => ({
    userId: row.id as string,
    email: row.email as string,
    name: (row.name as string) || "Unnamed",
    isPersona: true,
    onboardingCompleted: Boolean(row.onboarding_completed),
    mentorStatus: (row.mentor_status as string) ?? null,
  }));
}
