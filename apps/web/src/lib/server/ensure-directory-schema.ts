import { getPool } from "@connectpro/common";

/**
 * Bring the connected database up to what the member directory needs
 * (supabase/migrations/012_directory.sql), idempotently, on first use.
 *
 * The hosted database is migrated by hand, so a deploy can land ahead of its
 * migration — and when it does, every directory and profile query fails on a
 * missing column. Applying the additive DDL lazily, the same way
 * ensureAuthSchema() already does for auth, keeps that from taking the site
 * down. Memoised per process, so it costs one round-trip per cold start.
 */

let ready: Promise<void> | null = null;

export function ensureDirectorySchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();

    await pool.query(`
      ALTER TABLE users.profiles
        ADD COLUMN IF NOT EXISTS visible_in_directory BOOLEAN NOT NULL DEFAULT true
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users.directory_saves (
        user_id       UUID NOT NULL,
        saved_user_id UUID NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, saved_user_id)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_directory_saves_user
        ON users.directory_saves (user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users.profile_views (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL,
        viewer_id  UUID NOT NULL,
        viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_views_profile
        ON users.profile_views (profile_id, viewed_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_role ON users.profiles (role)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_city_state ON users.profiles (city, state)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_updated ON users.profiles (updated_at DESC)
    `);
  })();

  // A failed attempt shouldn't be cached — the next request should retry.
  ready.catch(() => {
    ready = null;
  });

  return ready;
}
