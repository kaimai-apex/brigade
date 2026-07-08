import { getAuthSchema, getPool } from "@connectpro/common";

let schemaReady: Promise<void> | null = null;

/** Ensure ConnectPro auth tables exist (idempotent). Safe to call before OAuth/signup. */
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
        user_id   UUID NOT NULL REFERENCES ${auth}.users(id),
        role      TEXT NOT NULL,
        PRIMARY KEY (user_id, role)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${auth}.refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES ${auth}.users(id),
        token_hash  TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${auth}.oauth_accounts (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES ${auth}.users(id),
        provider      TEXT NOT NULL,
        provider_uid  TEXT NOT NULL,
        UNIQUE (provider, provider_uid)
      )
    `);

    await pool.query("CREATE SCHEMA IF NOT EXISTS users");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users.profiles (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL UNIQUE,
        first_name   TEXT NOT NULL,
        last_name    TEXT NOT NULL,
        headline     TEXT,
        about        TEXT,
        industry     TEXT,
        location     TEXT,
        website      TEXT,
        resume_url   TEXT,
        avatar_url   TEXT,
        completeness SMALLINT NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at   TIMESTAMPTZ
      )
    `);

    await pool.query(`
      ALTER TABLE users.profiles
        ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Chef'
    `);
  })();

  return schemaReady;
}
