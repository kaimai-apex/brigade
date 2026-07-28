-- 002 — Identity
--
-- Credentials and sessions only. Everything a *person or company is* lives on
-- brigade.profiles (003); everything needed *to log in* lives here. The split
-- is the load-bearing decision of the whole schema: only some profiles have a
-- user, which is what lets a company page, an unclaimed company, or an invited
-- person exist without a nullable password column.
--
-- Rollback: DROP TABLE brigade.{identities,webauthn_credentials,session_activations,
--   login_activities,user_ips,user_settings,users,user_roles} CASCADE;

-- ---------------------------------------------------------------------------
-- Roles as a permission bitmask, not an enum.
--
-- Roles are rows, so a new tier (Recruiter Pro, Partner, Support) is an INSERT
-- rather than a migration + deploy. Permission bits:
--
--   1 << 0  administrator (all bits implied)
--   1 << 1  view_moderation_queue      1 << 2  manage_reports
--   1 << 3  manage_profiles            1 << 4  manage_roles
--   1 << 5  manage_companies           1 << 6  manage_job_postings
--   1 << 7  view_audit_log             1 << 8  manage_settings
--   1 << 9  recruiter_search          1 << 10  recruiter_pools
--  1 << 11  recruiter_contact         1 << 12  post_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE brigade.user_roles (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  name          TEXT        NOT NULL UNIQUE,
  permissions   BIGINT      NOT NULL DEFAULT 0,
  position      INT         NOT NULL DEFAULT 0,
  highlighted   BOOLEAN     NOT NULL DEFAULT false,
  colour        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.users (
  id                    BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  email                 CITEXT      NOT NULL,
  -- Normalised form (dots and +tags stripped for providers that ignore them),
  -- hashed. Defeats ban evasion by email variant — see 009 canonical_email_blocks.
  canonical_email_hash  TEXT,
  encrypted_password    TEXT,
  role_id               BIGINT      REFERENCES brigade.user_roles(id) ON DELETE SET NULL,

  confirmed_at          TIMESTAMPTZ,
  confirmation_token    TEXT,
  approved              BOOLEAN     NOT NULL DEFAULT true,

  otp_secret            TEXT,
  otp_required          BOOLEAN     NOT NULL DEFAULT false,
  otp_backup_codes      TEXT[],

  locale                TEXT        NOT NULL DEFAULT 'en',
  time_zone             TEXT,

  sign_in_count         INT         NOT NULL DEFAULT 0,
  current_sign_in_at    TIMESTAMPTZ,
  last_sign_in_at       TIMESTAMPTZ,
  current_sign_in_ip    INET,
  last_sign_in_ip       INET,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Tombstone rather than hard delete: deletion is a process (009 / GDPR
  -- Art. 17), not a DELETE statement.
  deleted_at            TIMESTAMPTZ
);

-- Emails are unique among live accounts only, so a deleted account's address
-- can be reused.
CREATE UNIQUE INDEX users_email_unique
  ON brigade.users (email) WHERE deleted_at IS NULL;

CREATE TABLE brigade.user_settings (
  user_id     BIGINT PRIMARY KEY REFERENCES brigade.users(id) ON DELETE CASCADE,
  settings    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security surface. Kept per 03-concept-mapping: audit trails are cheap now and
-- impossible to reconstruct after an incident.
CREATE TABLE brigade.user_ips (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  user_id     BIGINT      NOT NULL REFERENCES brigade.users(id) ON DELETE CASCADE,
  ip          INET        NOT NULL,
  used_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.login_activities (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  user_id       BIGINT      NOT NULL REFERENCES brigade.users(id) ON DELETE CASCADE,
  authentication_method TEXT,
  provider      TEXT,
  success       BOOLEAN     NOT NULL,
  failure_reason TEXT,
  ip            INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.session_activations (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  user_id       BIGINT      NOT NULL REFERENCES brigade.users(id) ON DELETE CASCADE,
  session_id    TEXT        NOT NULL UNIQUE,
  access_token_id BIGINT,
  ip            INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.webauthn_credentials (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  user_id       BIGINT      NOT NULL REFERENCES brigade.users(id) ON DELETE CASCADE,
  external_id   TEXT        NOT NULL UNIQUE,
  public_key    TEXT        NOT NULL,
  nickname      TEXT        NOT NULL,
  sign_count    BIGINT      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth / SSO links: Google today, LinkedIn import and enterprise SAML later.
CREATE TABLE brigade.identities (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  user_id     BIGINT      NOT NULL REFERENCES brigade.users(id) ON DELETE CASCADE,
  provider    TEXT        NOT NULL,
  uid         TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, uid)
);

CREATE INDEX ON brigade.user_ips (user_id, used_at DESC);
CREATE INDEX ON brigade.login_activities (user_id, created_at DESC);
CREATE INDEX ON brigade.users (canonical_email_hash) WHERE canonical_email_hash IS NOT NULL;

CREATE TRIGGER touch_users BEFORE UPDATE ON brigade.users
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();

INSERT INTO brigade.user_roles (name, permissions, position) VALUES
  ('Owner',     (1::BIGINT << 0),  100),
  ('Admin',     (1::BIGINT << 1) | (1::BIGINT << 2) | (1::BIGINT << 3) | (1::BIGINT << 4)
              | (1::BIGINT << 5) | (1::BIGINT << 6) | (1::BIGINT << 7) | (1::BIGINT << 8), 90),
  ('Moderator', (1::BIGINT << 1) | (1::BIGINT << 2) | (1::BIGINT << 3) | (1::BIGINT << 7), 50),
  ('Recruiter', (1::BIGINT << 9) | (1::BIGINT << 10) | (1::BIGINT << 11) | (1::BIGINT << 12), 20),
  ('Member',    0, 0)
ON CONFLICT (name) DO NOTHING;
