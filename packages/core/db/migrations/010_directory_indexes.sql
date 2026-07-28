-- 010 — Directory, search and graph indexes
--
-- Split out from the table definitions because these are the ones tuned against
-- query plans rather than implied by a constraint.
--
-- NOTE ON `CONCURRENTLY`: these run as plain CREATE INDEX because the tables are
-- empty and CONCURRENTLY cannot run inside a transaction block. Against a
-- populated database every one of these must be re-issued as
-- CREATE INDEX CONCURRENTLY, outside a transaction — see docs/MIGRATIONS.md.
--
-- Rollback: DROP INDEX on each name below.

-- Directory browse: the highest-volume read in the product. Partial on the
-- suspended check so the index only holds rows that can actually be returned.
CREATE INDEX IF NOT EXISTS profiles_directory_browse
  ON brigade.profiles (discoverable, last_active_at DESC)
  WHERE suspended_at IS NULL AND silenced_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS profiles_directory_new
  ON brigade.profiles (discoverable, id DESC)
  WHERE suspended_at IS NULL AND silenced_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS profiles_completeness
  ON brigade.profiles (discoverable, completeness DESC)
  WHERE suspended_at IS NULL AND deleted_at IS NULL;

-- Forgiving name search. unaccent is not immutable by default, so the trigram
-- index goes on the raw column and the query normalises on both sides.
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm
  ON brigade.profiles USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS profiles_username_trgm
  ON brigade.profiles USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS profiles_location
  ON brigade.profiles (country_code, city)
  WHERE discoverable = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS profiles_open_to
  ON brigade.profiles USING gin (open_to)
  WHERE discoverable = true;

-- "Who else works here" — the query that makes company pages worth having.
CREATE INDEX IF NOT EXISTS experiences_company_current
  ON brigade.experiences (company_id, is_current)
  WHERE company_id IS NOT NULL;

-- Alumni: same company, overlapping dates. Also the strongest suggestion source.
CREATE INDEX IF NOT EXISTS experiences_company_dates
  ON brigade.experiences (company_id, start_date, end_date)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS experiences_profile_current
  ON brigade.experiences (profile_id, is_current);

-- The verified_only filter — the most valuable filter in the product, so it
-- gets its own partial index rather than riding on a scan.
CREATE INDEX IF NOT EXISTS experiences_verified
  ON brigade.experiences (profile_id)
  WHERE verified_at IS NOT NULL;

-- Re-verification sweep: find current roles whose verification has lapsed.
CREATE INDEX IF NOT EXISTS experiences_verification_expiry
  ON brigade.experiences (verification_expires_at)
  WHERE verified_at IS NOT NULL AND is_current = true;

CREATE INDEX IF NOT EXISTS educations_institution_dates
  ON brigade.educations (institution_id, start_date, end_date)
  WHERE institution_id IS NOT NULL;

-- Skill filtering, ordered so the most-endorsed profiles come first.
CREATE INDEX IF NOT EXISTS profile_skills_lookup
  ON brigade.profile_skills (skill_id, endorsement_count DESC);
