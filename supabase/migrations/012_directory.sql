-- Member directory support for the hosted (Supabase) database.
-- Brings prod to parity with infra/postgres/migrations/011_directory.sql.
-- Safe to re-run.

-- 1. Directory opt-out. Default on so no existing member silently disappears.
ALTER TABLE users.profiles
  ADD COLUMN IF NOT EXISTS visible_in_directory BOOLEAN NOT NULL DEFAULT true;

-- 2. Saved-member shortlist ("Saved" in marketplace terms).
CREATE TABLE IF NOT EXISTS users.directory_saves (
  user_id       UUID NOT NULL,
  saved_user_id UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, saved_user_id)
);
CREATE INDEX IF NOT EXISTS idx_directory_saves_user
  ON users.directory_saves (user_id, created_at DESC);

-- 3. Profile views (present locally, missing in prod — the profile page records these).
CREATE TABLE IF NOT EXISTS users.profile_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  viewer_id  UUID NOT NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile
  ON users.profile_views (profile_id, viewed_at DESC);

-- 4. Indexes that keep filtered/sorted directory queries fast.
CREATE INDEX IF NOT EXISTS idx_profiles_expertise
  ON users.profiles USING gin (expertise_areas);
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON users.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_city_state
  ON users.profiles (city, state);
CREATE INDEX IF NOT EXISTS idx_profiles_updated
  ON users.profiles (updated_at DESC);

-- 5. Trigram index for forgiving name/city search. Best-effort: directory search
--    uses ILIKE and stays correct without it, so never fail the migration if the
--    pg_trgm extension isn't installable or lives outside the search_path.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_search_trgm
           ON users.profiles USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops, city gin_trgm_ops)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm index skipped: %', SQLERRM;
END $$;
