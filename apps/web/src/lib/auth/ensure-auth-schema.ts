import { getAuthSchema, getPool } from "@connectpro/common";

let schemaReady: Promise<void> | null = null;

/** Ensure ConnectPro auth + minimal profile tables exist (idempotent). Safe before signup/login. */
export async function ensureAuthSchema() {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const auth = getAuthSchema();
    const pool = getPool();

    await pool.query("CREATE EXTENSION IF NOT EXISTS citext");
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${auth}`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${auth}.users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email           CITEXT UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
        mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
        mfa_secret      TEXT,
        status          TEXT NOT NULL DEFAULT 'active',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at      TIMESTAMPTZ
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${auth}.user_roles (
        user_id   UUID NOT NULL REFERENCES ${auth}.users(id) ON DELETE CASCADE,
        role      TEXT NOT NULL,
        PRIMARY KEY (user_id, role)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${auth}.refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES ${auth}.users(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await pool.query("CREATE SCHEMA IF NOT EXISTS users");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users.profiles (
        id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                         UUID NOT NULL UNIQUE,
        first_name                      TEXT NOT NULL,
        last_name                       TEXT NOT NULL,
        headline                        TEXT,
        about                           TEXT,
        industry                        TEXT,
        location                        TEXT,
        website                         TEXT,
        resume_url                      TEXT,
        avatar_url                      TEXT,
        city                            TEXT,
        state                           TEXT,
        country                         TEXT,
        current_position                TEXT,
        current_employer                TEXT,
        instagram_url                   TEXT,
        linkedin_url                    TEXT,
        expertise_areas                 TEXT[] DEFAULT '{}',
        years_experience                INT,
        onboarding_step                 INT NOT NULL DEFAULT 0,
        onboarding_completed            BOOLEAN NOT NULL DEFAULT false,
        open_to_opportunities           BOOLEAN NOT NULL DEFAULT false,
        available_private_events        BOOLEAN NOT NULL DEFAULT false,
        available_contract_work         BOOLEAN NOT NULL DEFAULT false,
        available_emergency_staffing    BOOLEAN NOT NULL DEFAULT false,
        role                            TEXT NOT NULL DEFAULT 'Chef',
        completeness                    SMALLINT NOT NULL DEFAULT 0,
        created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at                      TIMESTAMPTZ
      )
    `);

    await pool.query(`
      ALTER TABLE users.profiles
        ADD COLUMN IF NOT EXISTS city TEXT,
        ADD COLUMN IF NOT EXISTS state TEXT,
        ADD COLUMN IF NOT EXISTS country TEXT,
        ADD COLUMN IF NOT EXISTS current_position TEXT,
        ADD COLUMN IF NOT EXISTS current_employer TEXT,
        ADD COLUMN IF NOT EXISTS instagram_url TEXT,
        ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
        ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS years_experience INT,
        ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS open_to_opportunities BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS available_private_events BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS available_contract_work BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS available_emergency_staffing BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Chef'
    `);
  })();

  return schemaReady;
}
