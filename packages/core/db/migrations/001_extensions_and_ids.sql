-- 001 — Extensions and time-sortable IDs
--
-- The new Brigade domain model lives in its own `brigade` schema. The live
-- application still runs on the legacy `users`/`posts`/`connections` schemas;
-- keeping them side by side means this can be built and tested against a real
-- database without touching production data. Porting is a later, explicit step.
--
-- Rollback: DROP SCHEMA brigade CASCADE;

CREATE SCHEMA IF NOT EXISTS brigade;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Time-sortable IDs (Snowflake-style)
--
-- A 64-bit integer whose high bits are a millisecond timestamp. Three things
-- fall out of this, all of which the architecture depends on:
--   * sorting by id sorts by time, so a Redis feed score is just the id
--   * cursor pagination (max_id/min_id) needs no separate timestamp index
--   * ids are not enumerable, which is a scraping defence we get for free
--
-- Layout: [ 41 bits ms since epoch | 16 bits sequence | 6 bits shard ]
-- Good until ~2090 with the epoch below.
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS brigade.id_sequence;

CREATE OR REPLACE FUNCTION brigade.snowflake_id(shard_id INT DEFAULT 0)
RETURNS BIGINT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  -- 2026-01-01T00:00:00Z, so ids stay comfortably inside 63 bits.
  epoch_ms   BIGINT := 1767225600000;
  now_ms     BIGINT;
  seq        BIGINT;
BEGIN
  now_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  seq := nextval('brigade.id_sequence') % 65536;

  RETURN ((now_ms - epoch_ms) << 22)
       | (seq << 6)
       | (shard_id % 64);
END;
$$;

COMMENT ON FUNCTION brigade.snowflake_id IS
  'Time-sortable, non-enumerable 64-bit id. Default for every brigade.* primary key.';

-- Recover the creation time from an id — useful in analytics and debugging.
CREATE OR REPLACE FUNCTION brigade.id_to_timestamp(id BIGINT)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_timestamp((( id >> 22) + 1767225600000) / 1000.0);
$$;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest without every service remembering to.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brigade.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
