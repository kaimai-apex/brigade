-- 012 — Employment verification and rate limiting
--
-- Verification is the differentiator: everything else in a professional
-- network is a commodity, verified employment is not. Rate limiting is what
-- keeps the directory from being downloaded, and the directory is the asset.
--
-- Rollback: DROP TABLE brigade.{rate_limits,employment_verifications} CASCADE;
--           DROP TYPE brigade.verification_state;

CREATE TYPE brigade.verification_state AS ENUM (
  'pending', 'verified', 'failed', 'expired', 'revoked'
);

-- ---------------------------------------------------------------------------
-- One row per verification attempt against one experience.
--
-- Kept separate from experiences.verified_at (migration 005) on purpose: that
-- column is the current answer, this table is how it was reached and every
-- attempt that came before. When someone disputes a badge — or when a company
-- asks how a claim was checked — the audit trail is the product.
-- ---------------------------------------------------------------------------
CREATE TABLE brigade.employment_verifications (
  id              BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  experience_id   BIGINT      NOT NULL REFERENCES brigade.experiences(id) ON DELETE CASCADE,
  profile_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  method          brigade.verification_method NOT NULL,
  state           brigade.verification_state  NOT NULL DEFAULT 'pending',

  -- Tier 1: the corporate address the challenge was sent to. Stored hashed —
  -- a work email is personal data and this table has no reason to hold it in
  -- the clear once the token is issued.
  email_domain    CITEXT,
  email_hash      TEXT,
  token_hash      TEXT,
  expires_at      TIMESTAMPTZ,
  attempts        SMALLINT    NOT NULL DEFAULT 0,

  -- Tier 2: the page that was fetched and what was found on it.
  source_url      TEXT,
  evidence        JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Tier 3: which company admin confirmed it.
  confirmed_by_profile_id BIGINT REFERENCES brigade.profiles(id) ON DELETE SET NULL,

  failure_reason  TEXT,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON brigade.employment_verifications (experience_id, created_at DESC);
CREATE INDEX ON brigade.employment_verifications (profile_id, state);
CREATE UNIQUE INDEX employment_verifications_active_token
  ON brigade.employment_verifications (token_hash)
  WHERE token_hash IS NOT NULL AND state = 'pending';

CREATE TRIGGER touch_employment_verifications
  BEFORE UPDATE ON brigade.employment_verifications
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Rate limits.
--
-- Postgres-backed rather than Redis: one fewer system to run, and the limits
-- that matter here (signups per IP per day, connection requests per day) are
-- low-frequency enough that the write cost is irrelevant. The high-frequency
-- read limits can move to Redis behind the same interface when they need to.
--
-- Fixed windows rather than a sliding log: a sliding window needs one row per
-- request, which turns the rate limiter into the busiest table in the database.
-- ---------------------------------------------------------------------------
CREATE TABLE brigade.rate_limits (
  bucket        TEXT        NOT NULL,
  subject       TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject, window_start)
);

CREATE INDEX ON brigade.rate_limits (window_start);

-- Consume one unit from a bucket and report what is left. Returns the count
-- AFTER the increment, so the caller compares against its own limit and the
-- policy stays in application code where it can be read.
CREATE OR REPLACE FUNCTION brigade.consume_rate_limit(
  p_bucket TEXT,
  p_subject TEXT,
  p_window_seconds INT
) RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  w TIMESTAMPTZ;
  c INT;
BEGIN
  -- Truncate now() to the window so every request in the same period lands on
  -- the same row and the upsert stays contention-free.
  w := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO brigade.rate_limits (bucket, subject, window_start, count)
  VALUES (p_bucket, p_subject, w, 1)
  ON CONFLICT (bucket, subject, window_start)
    DO UPDATE SET count = brigade.rate_limits.count + 1
  RETURNING count INTO c;

  RETURN c;
END;
$$;

-- Old windows are dead weight; dropping them is a scheduler job, not a cascade.
CREATE OR REPLACE FUNCTION brigade.purge_rate_limits(older_than_hours INT DEFAULT 48)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  removed INT;
BEGIN
  WITH gone AS (
    DELETE FROM brigade.rate_limits
    WHERE window_start < now() - make_interval(hours => older_than_hours)
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM gone;
  RETURN removed;
END;
$$;

-- ---------------------------------------------------------------------------
-- Search vector.
--
-- Postgres carries six figures of profiles comfortably; Elasticsearch is a
-- whole additional system to run, monitor and keep in sync, and it is a
-- step-change in cost. The search service is behind an interface so the
-- backend can be swapped without touching a route.
-- ---------------------------------------------------------------------------
ALTER TABLE brigade.profiles
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION brigade.profiles_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
      setweight(to_tsvector('simple', unaccent(coalesce(NEW.display_name, ''))), 'A')
    || setweight(to_tsvector('simple', unaccent(coalesce(NEW.username, ''))), 'A')
    || setweight(to_tsvector('simple', unaccent(coalesce(NEW.headline, ''))), 'B')
    || setweight(to_tsvector('simple', unaccent(coalesce(NEW.city, ''))), 'C')
    || setweight(to_tsvector('simple', unaccent(coalesce(NEW.bio, ''))), 'D');
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_search_vector
  BEFORE INSERT OR UPDATE OF display_name, username, headline, city, bio
  ON brigade.profiles
  FOR EACH ROW EXECUTE FUNCTION brigade.profiles_search_vector();

CREATE INDEX IF NOT EXISTS profiles_search_vector_idx
  ON brigade.profiles USING gin (search_vector);

UPDATE brigade.profiles SET display_name = display_name;
