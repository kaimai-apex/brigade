import { getPool } from "@connectpro/common";

/**
 * Bring the connected database up to what the long-form resume needs
 * (supabase/migrations/020_profile_resume.sql), idempotently, on first use.
 *
 * Same reasoning as ensureDirectorySchema(): the hosted database is migrated by
 * hand, so a deploy can land ahead of its migration — and profile reads name
 * `resume_text` in an explicit column list, so a missing column fails every
 * profile query rather than just the new field. Memoised per process.
 */

let ready: Promise<void> | null = null;

function isPrivilegeError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "42501";
}

async function tryDdl(
  pool: ReturnType<typeof getPool>,
  sql: string,
  label: string,
): Promise<void> {
  try {
    await pool.query(sql);
  } catch (error) {
    if (isPrivilegeError(error)) {
      console.warn(
        `[ensure-resume-schema] skip ${label}:`,
        error instanceof Error ? error.message : error,
      );
      return;
    }
    throw error;
  }
}

export function ensureResumeSchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();

    const columns = await pool.query(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'users'
          AND (
            (table_name = 'profiles'   AND column_name = 'resume_text') OR
            (table_name = 'experience' AND column_name IN ('highlights', 'employment_type'))
          )`,
    );
    const have = new Set(
      columns.rows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    if (
      have.has("profiles.resume_text") &&
      have.has("experience.highlights") &&
      have.has("experience.employment_type")
    ) {
      return;
    }

    await tryDdl(
      pool,
      "ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS resume_text TEXT",
      "profiles.resume_text",
    );
    await tryDdl(
      pool,
      "ALTER TABLE users.experience ADD COLUMN IF NOT EXISTS highlights TEXT",
      "experience.highlights",
    );
    await tryDdl(
      pool,
      "ALTER TABLE users.experience ADD COLUMN IF NOT EXISTS employment_type TEXT",
      "experience.employment_type",
    );
    await tryDdl(
      pool,
      `CREATE INDEX IF NOT EXISTS idx_experience_user_dates
         ON users.experience (user_id, start_date DESC NULLS LAST)`,
      "idx_experience_user_dates",
    );

    // Production talks as brigade_app, which can DML but not ALTER. A skipped
    // ADD COLUMN used to look like success, then every profile SELECT named
    // resume_text and 500'd. Surface that so the next miss shows up in logs
    // instead of as a silent 5xx spike.
    const after = await pool.query(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'users'
          AND (
            (table_name = 'profiles'   AND column_name = 'resume_text') OR
            (table_name = 'experience' AND column_name IN ('highlights', 'employment_type'))
          )`,
    );
    const present = new Set(
      after.rows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    const missing = [
      "profiles.resume_text",
      "experience.highlights",
      "experience.employment_type",
    ].filter((name) => !present.has(name));
    if (missing.length > 0) {
      console.error(
        "[ensure-resume-schema] migration 020 columns still missing after ensure; profile lookups will 500 until a privileged role applies the ALTER:",
        missing.join(", "),
      );
    }
  })();

  // A failed attempt shouldn't be cached — the next request should retry.
  ready.catch(() => {
    ready = null;
  });

  return ready;
}
