-- Passwordless login, again.
--
-- Migration 010 dropped this table and made password_hash NOT NULL when
-- passwords came back. Passwords are now gone for good: a member types their
-- email, receives a six-digit code, and types it in. There is no password
-- field, no reset flow, and no password to leak.
--
-- Everything here is also in apps/web/src/lib/auth/ensure-auth-schema.ts and
-- runs on first use. That is not redundancy for its own sake — the hosted
-- database is migrated by hand, so a deploy can land before anyone opens the
-- SQL editor, and the last time that happened every directory query 500'd for
-- days. This file is the record; the ensure-schema is what actually protects
-- the deploy. Keep them saying the same thing.

-- The first attempt at passwordless login left a table behind that stores the
-- code itself in a `code` column — a live credential in plaintext, readable by
-- anything holding a connection string or a backup — and keys rows by user_id.
-- CREATE TABLE IF NOT EXISTS would leave it exactly as it is, and every query
-- against the new columns would fail. Conditional on the absence of code_hash,
-- so it runs once against the old shape and never again. The only loss is
-- unexpired login codes: ten minutes of nothing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'connectpro_auth' AND table_name = 'login_codes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'connectpro_auth' AND table_name = 'login_codes'
       AND column_name = 'code_hash'
  ) THEN
    DROP TABLE connectpro_auth.login_codes;
  END IF;
END $$;

-- Codes are keyed by email, not user_id. The code is requested before we are
-- willing to say whether an account exists, and a foreign key to users would
-- force that answer at insert time.
CREATE TABLE IF NOT EXISTS connectpro_auth.login_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        CITEXT NOT NULL,
  -- The hash, never the code. Six digits is guessable enough that this table
  -- must not be a list of live credentials, and a leaked backup must not be a
  -- way in.
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  attempts     SMALLINT NOT NULL DEFAULT 0,
  request_ip   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The lookup is always "newest live code for this address"; the rate limits
-- count recent rows per address and per IP.
CREATE INDEX IF NOT EXISTS idx_login_codes_email_created
  ON connectpro_auth.login_codes (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_codes_ip_created
  ON connectpro_auth.login_codes (request_ip, created_at DESC);

-- A passwordless account has no password.
ALTER TABLE connectpro_auth.users ALTER COLUMN password_hash DROP NOT NULL;
