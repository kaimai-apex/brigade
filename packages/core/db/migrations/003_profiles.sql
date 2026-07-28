-- 003 — Profiles
--
-- The polymorphic actor. A profile is a person OR a company; only some have a
-- user (002). Everything downstream — follows, posts, notifications, the graph
-- — operates on profile_id and therefore works on company pages unchanged.
--
-- Rollback: DROP TABLE brigade.{profile_edits,profile_links,profile_fields,
--   profile_stats,profiles} CASCADE;

CREATE TYPE brigade.profile_type AS ENUM ('person', 'company');

CREATE TABLE brigade.profiles (
  id                BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  type              brigade.profile_type NOT NULL DEFAULT 'person',

  -- Nullable on purpose: company pages, unclaimed companies and invited-but-
  -- not-accepted people are profiles with no way to log in.
  user_id           BIGINT      UNIQUE REFERENCES brigade.users(id) ON DELETE SET NULL,

  username          CITEXT      NOT NULL,
  display_name      TEXT        NOT NULL DEFAULT '',
  headline          TEXT,
  bio               TEXT,

  avatar_url        TEXT,
  header_url        TEXT,
  avatar_blurhash   TEXT,
  header_blurhash   TEXT,

  -- Directory opt-in. Explicit consent, not inferred from privacy settings:
  -- PIPEDA and GDPR both make "was this person listed with their knowledge" a
  -- question that needs one clean answer. See 09-phase-5.
  discoverable      BOOLEAN     NOT NULL DEFAULT false,
  discoverable_at   TIMESTAMPTZ,

  locked            BOOLEAN     NOT NULL DEFAULT false,
  memorial          BOOLEAN     NOT NULL DEFAULT false,

  country_code      CHAR(2),
  city              TEXT,
  region            TEXT,
  remote_only       BOOLEAN     NOT NULL DEFAULT false,
  willing_to_relocate BOOLEAN   NOT NULL DEFAULT false,

  -- open_to is a set, not a single flag: work | consulting | mentoring |
  -- board | investing | hiring.
  open_to           TEXT[]      NOT NULL DEFAULT '{}',
  open_to_visibility TEXT       NOT NULL DEFAULT 'connections',

  seniority         TEXT,
  years_experience  SMALLINT,
  completeness      SMALLINT    NOT NULL DEFAULT 0,

  -- Moderation states (008/009). silenced = removed from discovery WITHOUT
  -- notification, which is the correct response to suspected fraud.
  suspended_at      TIMESTAMPTZ,
  silenced_at       TIMESTAMPTZ,

  last_active_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT profiles_company_has_no_user
    CHECK (type <> 'company' OR user_id IS NULL),
  CONSTRAINT profiles_open_to_visibility_valid
    CHECK (open_to_visibility IN ('public', 'connections', 'recruiters', 'private'))
);

CREATE UNIQUE INDEX profiles_username_unique
  ON brigade.profiles (username) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Counters live in their own table on purpose.
--
-- Counters are written constantly; profiles are read constantly. Splitting them
-- keeps counter churn from invalidating the profile cache and from filling the
-- profiles table with dead tuples.
-- ---------------------------------------------------------------------------
CREATE TABLE brigade.profile_stats (
  profile_id            BIGINT PRIMARY KEY REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  connections_count     INT         NOT NULL DEFAULT 0,
  followers_count       INT         NOT NULL DEFAULT 0,
  following_count       INT         NOT NULL DEFAULT 0,
  posts_count           INT         NOT NULL DEFAULT 0,
  endorsements_count    INT         NOT NULL DEFAULT 0,
  recommendations_count INT         NOT NULL DEFAULT 0,
  profile_views_count   BIGINT      NOT NULL DEFAULT 0,
  last_post_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Freeform key/value rows shown on the profile.
CREATE TABLE brigade.profile_fields (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  position    SMALLINT    NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- rel="me" link verification. Fetch the URL, look for a backlink to the
-- profile, mark verified. Free, needs no manual review, and hard to fake
-- without controlling the target domain — the same mechanism employment
-- verification is built on (005 experiences.verified_at).
CREATE TABLE brigade.profile_links (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  label         TEXT,
  verified_at   TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  check_failures SMALLINT   NOT NULL DEFAULT 0,
  position      SMALLINT    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Edit history is a fraud signal, not just an audit trail: a title edited to
-- "VP" the day before an application is worth surfacing to moderation.
CREATE TABLE brigade.profile_edits (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  edited_by   BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  field       TEXT        NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON brigade.profile_fields (profile_id, position);
CREATE INDEX ON brigade.profile_links (profile_id);
CREATE INDEX ON brigade.profile_edits (profile_id, created_at DESC);
CREATE INDEX ON brigade.profiles (type) WHERE deleted_at IS NULL;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON brigade.profiles
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();

-- Every profile has exactly one stats row.
CREATE OR REPLACE FUNCTION brigade.create_profile_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO brigade.profile_stats (profile_id) VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_profile_stats AFTER INSERT ON brigade.profiles
  FOR EACH ROW EXECUTE FUNCTION brigade.create_profile_stats();
