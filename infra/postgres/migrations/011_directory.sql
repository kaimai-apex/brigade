-- Member directory: opt-out flag, fuzzy search, faceted-query indexes, saved members.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Per-member opt-out. Default on so nobody disappears silently.
ALTER TABLE users.profiles
  ADD COLUMN IF NOT EXISTS visible_in_directory BOOLEAN NOT NULL DEFAULT true;

-- Keep filtered/sorted directory queries fast as signups grow.
CREATE INDEX IF NOT EXISTS idx_profiles_expertise
  ON users.profiles USING gin (expertise_areas);
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON users.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_city_state
  ON users.profiles (city, state);
CREATE INDEX IF NOT EXISTS idx_profiles_updated
  ON users.profiles (updated_at DESC);
-- Trigram index powers forgiving ILIKE search on name + city.
CREATE INDEX IF NOT EXISTS idx_profiles_search_trgm
  ON users.profiles USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops, city gin_trgm_ops);

-- Personal shortlist of members ("Saved" in marketplace terms).
CREATE TABLE IF NOT EXISTS users.directory_saves (
  user_id       UUID NOT NULL,
  saved_user_id UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, saved_user_id)
);
CREATE INDEX IF NOT EXISTS idx_directory_saves_user
  ON users.directory_saves (user_id, created_at DESC);
