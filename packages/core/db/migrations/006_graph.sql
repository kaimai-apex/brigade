-- 006 — The professional graph
--
-- Two distinct relations, deliberately:
--   connections  mutual, requires acceptance — what degree-of-separation is
--                computed from
--   follows      asymmetric, no acceptance — for company pages and public
--                figures
--
-- Collapsing these into one table is the mistake that makes "2nd degree"
-- unanswerable later.
--
-- Rollback: DROP TABLE brigade.{connection_degrees,featured_profiles,
--   profile_notes,mutes,blocks,follows,connections} CASCADE;

CREATE TYPE brigade.connection_state AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- ---------------------------------------------------------------------------
-- CONVENTION, and it must stay documented: a connection is stored as exactly
-- ONE row, canonically ordered so that profile_id < target_profile_id. The
-- requester is recorded separately in requested_by.
--
-- One row rather than two means a connection can never be half-present, and
-- accept/remove touch a single row. The cost is that every lookup has to check
-- both columns, which is what the two indexes below are for.
-- ---------------------------------------------------------------------------
CREATE TABLE brigade.connections (
  id                 BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  requested_by       BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  state              brigade.connection_state NOT NULL DEFAULT 'pending',
  message            TEXT,
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT connections_canonical_order CHECK (profile_id < target_profile_id),
  CONSTRAINT connections_no_self CHECK (profile_id <> target_profile_id),
  UNIQUE (profile_id, target_profile_id)
);

CREATE TABLE brigade.follows (
  id                 BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  notify             BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT follows_no_self CHECK (profile_id <> target_profile_id),
  UNIQUE (profile_id, target_profile_id)
);

CREATE TABLE brigade.blocks (
  id                 BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blocks_no_self CHECK (profile_id <> target_profile_id),
  UNIQUE (profile_id, target_profile_id)
);

CREATE TABLE brigade.mutes (
  id                 BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  hide_notifications BOOLEAN     NOT NULL DEFAULT true,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mutes_no_self CHECK (profile_id <> target_profile_id),
  UNIQUE (profile_id, target_profile_id)
);

-- Private annotations on someone else's profile. Recruiters will pay for this.
CREATE TABLE brigade.profile_notes (
  id                 BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  body               TEXT        NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, target_profile_id)
);

-- Profiles pinned to your own profile.
CREATE TABLE brigade.featured_profiles (
  id                 BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  position           SMALLINT    NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, target_profile_id)
);

-- ---------------------------------------------------------------------------
-- Materialised 2nd/3rd degree.
--
-- Empty for now and that is fine — at 10k profiles a live self-join is
-- tolerable. At 500k it is a full-table join that will take the database down
-- during a demo. The table exists so the seam is already there when the
-- nightly RecomputeConnectionDegreesService starts filling it.
-- ---------------------------------------------------------------------------
CREATE TABLE brigade.connection_degrees (
  profile_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  degree             SMALLINT    NOT NULL,
  path_count         INT         NOT NULL DEFAULT 0,
  computed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, target_profile_id),
  CONSTRAINT connection_degrees_range CHECK (degree BETWEEN 2 AND 3)
);

-- Both directions, because the canonical ordering above means a lookup for
-- "my connections" has to search either column.
CREATE INDEX ON brigade.connections (profile_id, state);
CREATE INDEX ON brigade.connections (target_profile_id, state);
CREATE INDEX ON brigade.connections (requested_by, state) WHERE state = 'pending';
CREATE INDEX ON brigade.follows (profile_id);
CREATE INDEX ON brigade.follows (target_profile_id);
CREATE INDEX ON brigade.blocks (profile_id);
CREATE INDEX ON brigade.blocks (target_profile_id);
CREATE INDEX ON brigade.mutes (profile_id);
CREATE INDEX ON brigade.connection_degrees (profile_id, degree);

CREATE TRIGGER touch_connections BEFORE UPDATE ON brigade.connections
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();
