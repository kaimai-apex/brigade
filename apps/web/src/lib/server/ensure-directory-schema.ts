import { getPool } from "@connectpro/common";

/**
 * Bring the connected database up to what the member directory needs
 * (supabase/migrations/012_directory.sql + 017_onboarding_intent.sql),
 * idempotently, on first use.
 *
 * The hosted database is migrated by hand, so a deploy can land ahead of its
 * migration — and when it does, every directory and profile query fails on a
 * missing column. Applying the additive DDL lazily, the same way
 * ensureAuthSchema() already does for auth, keeps that from taking the site
 * down. Memoised per process, so it costs one round-trip per cold start.
 *
 * Production connects as a limited role that can DML but not ALTER. Probe
 * columns first and treat insufficient-privilege as "managed elsewhere".
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
        `[ensure-directory-schema] skip ${label}:`,
        error instanceof Error ? error.message : error,
      );
      return;
    }
    throw error;
  }
}

export function ensureDirectorySchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();

    const columns = await pool.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'users'
          AND table_name = 'profiles'`,
    );
    const have = new Set(columns.rows.map((row) => row.column_name as string));

    // Sentinel for the full directory + onboarding-intent shape. Checking only
    // `visible_in_directory` (012) used to skip migration 017 columns and then
    // every profile SELECT that named them failed.
    const required = [
      "visible_in_directory",
      "preferred_name",
      "skills_wanted",
      "help_wanted",
      "interest_industries",
    ] as const;
    if (required.every((name) => have.has(name))) {
      return;
    }

    if (!have.has("visible_in_directory")) {
      await tryDdl(
        pool,
        `
      ALTER TABLE users.profiles
        ADD COLUMN IF NOT EXISTS visible_in_directory BOOLEAN NOT NULL DEFAULT true
    `,
        "profiles.visible_in_directory",
      );
    }

    // Migration 017 — what a member is actually here for. The mentee half of
    // every matching pair; the mentor half lives in ensure-mentorship-schema.
    for (const [name, definition] of [
      ["preferred_name", "TEXT"],
      ["pronouns", "TEXT"],
      ["timezone", "TEXT"],
      ["languages", "TEXT[] NOT NULL DEFAULT '{}'"],
      ["experience_level", "TEXT"],
      ["workplace_type", "TEXT"],
      ["interest_industries", "TEXT[] NOT NULL DEFAULT '{}'"],
      ["skills_wanted", "TEXT[] NOT NULL DEFAULT '{}'"],
      ["goals", "TEXT[] NOT NULL DEFAULT '{}'"],
      ["help_wanted", "TEXT[] NOT NULL DEFAULT '{}'"],
      ["biggest_challenge", "TEXT"],
      ["preferred_session_minutes", "INT"],
      ["preferred_mentor_experience", "TEXT"],
    ] as const) {
      if (have.has(name)) continue;
      await tryDdl(
        pool,
        `ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS ${name} ${definition}`,
        `profiles.${name}`,
      );
    }
    await tryDdl(
      pool,
      "ALTER TABLE users.profiles DROP CONSTRAINT IF EXISTS profiles_session_minutes_check",
      "drop profiles_session_minutes_check",
    );
    await tryDdl(
      pool,
      `
      ALTER TABLE users.profiles ADD CONSTRAINT profiles_session_minutes_check
        CHECK (preferred_session_minutes IS NULL OR preferred_session_minutes BETWEEN 15 AND 480)
    `,
      "constraint profiles_session_minutes_check",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_profiles_skills_wanted
        ON users.profiles USING GIN (skills_wanted)
    `,
      "idx_profiles_skills_wanted",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_profiles_interest_industries
        ON users.profiles USING GIN (interest_industries)
    `,
      "idx_profiles_interest_industries",
    );

    await tryDdl(
      pool,
      `
      CREATE TABLE IF NOT EXISTS users.directory_saves (
        user_id       UUID NOT NULL,
        saved_user_id UUID NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, saved_user_id)
      )
    `,
      "table directory_saves",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_directory_saves_user
        ON users.directory_saves (user_id, created_at DESC)
    `,
      "idx_directory_saves_user",
    );

    await tryDdl(
      pool,
      `
      CREATE TABLE IF NOT EXISTS users.profile_views (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL,
        viewer_id  UUID NOT NULL,
        viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `,
      "table profile_views",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_profile_views_profile
        ON users.profile_views (profile_id, viewed_at DESC)
    `,
      "idx_profile_views_profile",
    );

    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_profiles_role ON users.profiles (role)
    `,
      "idx_profiles_role",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_profiles_city_state ON users.profiles (city, state)
    `,
      "idx_profiles_city_state",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_profiles_updated ON users.profiles (updated_at DESC)
    `,
      "idx_profiles_updated",
    );
  })();

  // A failed attempt shouldn't be cached — the next request should retry.
  ready.catch(() => {
    ready = null;
  });

  return ready;
}
