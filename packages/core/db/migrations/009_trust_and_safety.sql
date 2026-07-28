-- 009 — Trust & safety
--
-- Created now even though the moderation product is a later phase. Adding
-- moderation tables mid-incident is a bad afternoon, and the fraud on a
-- professional network is financially motivated: recruitment scams, credential
-- fraud, corporate impersonation.
--
-- Rollback: DROP TABLE brigade.{moderation_log,username_blocks,ip_blocks,
--   canonical_email_blocks,email_domain_blocks,domain_blocks,moderation_notes,
--   warning_presets,profile_warnings,appeals,report_notes,reports} CASCADE;

CREATE TYPE brigade.report_category AS ENUM (
  'spam', 'harassment', 'impersonation', 'fake_job_posting', 'scam_or_fraud',
  'misleading_credentials', 'inappropriate_content', 'underage', 'other'
);

CREATE TYPE brigade.enforcement_action AS ENUM (
  'none', 'warning', 'silence', 'suspend', 'delete'
);

CREATE TABLE brigade.reports (
  id                    BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  reporter_id           BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  target_profile_id     BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_post_ids       BIGINT[]    NOT NULL DEFAULT '{}',
  target_job_posting_id BIGINT      REFERENCES brigade.job_postings(id) ON DELETE SET NULL,
  category              brigade.report_category NOT NULL,
  comment               TEXT        NOT NULL DEFAULT '',
  -- fraud categories route to a faster queue than the rest
  priority              SMALLINT    NOT NULL DEFAULT 0,
  assigned_moderator_id BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  action_taken_at       TIMESTAMPTZ,
  action_taken_by       BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.report_notes (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  report_id     BIGINT      NOT NULL REFERENCES brigade.reports(id) ON DELETE CASCADE,
  moderator_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  body          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Graduated enforcement. `silence` removes a profile from discovery WITHOUT
-- notifying them, which is the right answer for suspected spam: a ban tells the
-- attacker to make a new account immediately, silencing wastes their time.
CREATE TABLE brigade.profile_warnings (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  moderator_id  BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  report_id     BIGINT      REFERENCES brigade.reports(id) ON DELETE SET NULL,
  action        brigade.enforcement_action NOT NULL,
  -- Every action owes the user a statement of reasons (EU DSA).
  text          TEXT        NOT NULL DEFAULT '',
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.warning_presets (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  title       TEXT        NOT NULL,
  text        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Built at the same time as enforcement, not after. An unappealable wrongful
-- suspension of a job seeker is a real harm and a PR event.
CREATE TABLE brigade.appeals (
  id                  BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_warning_id  BIGINT      NOT NULL REFERENCES brigade.profile_warnings(id) ON DELETE CASCADE,
  profile_id          BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  text                TEXT        NOT NULL,
  approved_at         TIMESTAMPTZ,
  rejected_at         TIMESTAMPTZ,
  handled_by          BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.moderation_notes (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  moderator_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  body          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocklists ------------------------------------------------------------------

CREATE TABLE brigade.domain_blocks (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  domain      CITEXT      NOT NULL UNIQUE,
  severity    TEXT        NOT NULL DEFAULT 'silence',
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.email_domain_blocks (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  domain      CITEXT      NOT NULL UNIQUE,
  -- Disposable-provider lists and free webmail both live here; the second
  -- group is what corporate-email verification (005) has to exclude.
  category    TEXT        NOT NULL DEFAULT 'disposable',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hashes a normalised email so k.mai+1@gmail.com, k.mai@gmail.com and
-- kmai@gmail.com collapse to one block. Ban evasion by email variant is the
-- most common technique and this is what defeats it.
CREATE TABLE brigade.canonical_email_blocks (
  id                    BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  canonical_email_hash  TEXT        NOT NULL UNIQUE,
  reference_profile_id  BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.ip_blocks (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  ip          CIDR        NOT NULL UNIQUE,
  severity    TEXT        NOT NULL DEFAULT 'no_access',
  comment     TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reserve company names, admin, support, recruiting, hr and executive titles
-- so they cannot be taken at signup for impersonation.
CREATE TABLE brigade.username_blocks (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  username      CITEXT      NOT NULL UNIQUE,
  exact_match   BOOLEAN     NOT NULL DEFAULT true,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automated signals feed a score that PRIORITISES human review. Never
-- auto-ban on it: false positives against real job seekers are costly.
CREATE TABLE brigade.risk_signals (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  signal      TEXT        NOT NULL,
  weight      REAL        NOT NULL DEFAULT 0,
  detail      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable: every moderator action, who, when, why. Needed for appeals, for
-- regulatory response, for detecting moderator abuse, and for the day someone
-- asks why an account was removed. Updates and deletes are refused by trigger.
CREATE TABLE brigade.moderation_log (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  moderator_id  BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  target_type   TEXT        NOT NULL,
  target_id     BIGINT,
  reason        TEXT,
  detail        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION brigade.refuse_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'brigade.moderation_log is append-only';
END;
$$;

CREATE TRIGGER moderation_log_immutable
  BEFORE UPDATE OR DELETE ON brigade.moderation_log
  FOR EACH ROW EXECUTE FUNCTION brigade.refuse_mutation();

CREATE INDEX ON brigade.reports (action_taken_at, priority DESC, created_at)
  WHERE action_taken_at IS NULL;
CREATE INDEX ON brigade.reports (target_profile_id, created_at DESC);
CREATE INDEX ON brigade.profile_warnings (profile_id, created_at DESC);
CREATE INDEX ON brigade.appeals (approved_at, rejected_at) WHERE approved_at IS NULL AND rejected_at IS NULL;
CREATE INDEX ON brigade.risk_signals (profile_id, created_at DESC);
CREATE INDEX ON brigade.moderation_log (target_type, target_id, created_at DESC);

INSERT INTO brigade.username_blocks (username, reason) VALUES
  ('admin', 'reserved'), ('administrator', 'reserved'), ('support', 'reserved'),
  ('help', 'reserved'), ('security', 'reserved'), ('billing', 'reserved'),
  ('recruiting', 'reserved'), ('recruiter', 'reserved'), ('hr', 'reserved'),
  ('careers', 'reserved'), ('jobs', 'reserved'), ('brigade', 'reserved'),
  ('moderation', 'reserved'), ('legal', 'reserved'), ('press', 'reserved')
ON CONFLICT (username) DO NOTHING;

INSERT INTO brigade.email_domain_blocks (domain, category) VALUES
  ('gmail.com', 'free_webmail'), ('googlemail.com', 'free_webmail'),
  ('outlook.com', 'free_webmail'), ('hotmail.com', 'free_webmail'),
  ('yahoo.com', 'free_webmail'), ('icloud.com', 'free_webmail'),
  ('proton.me', 'free_webmail'), ('protonmail.com', 'free_webmail'),
  ('mailinator.com', 'disposable'), ('guerrillamail.com', 'disposable'),
  ('10minutemail.com', 'disposable'), ('tempmail.com', 'disposable'),
  ('yopmail.com', 'disposable')
ON CONFLICT (domain) DO NOTHING;
