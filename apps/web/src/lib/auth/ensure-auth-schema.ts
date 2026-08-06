import { getAuthSchema, getPool } from "@connectpro/common";

let schemaReady: Promise<void> | null = null;

/** Ensure ConnectPro auth + minimal profile tables exist (idempotent). Safe before signup/login. */
export async function ensureAuthSchema() {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const auth = getAuthSchema();
    const pool = getPool();

    // Production often connects as a limited role that can DML but not
    // CREATE SCHEMA / CREATE TABLE. If the passwordless shape is already
    // present, skip every DDL statement — login only needs the tables.
    const ready = await pool.query(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = 'login_codes'
          AND column_name = 'code_hash'
        LIMIT 1`,
      [auth],
    );
    if (ready.rows.length > 0) {
      return;
    }

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

    /**
     * Passwordless login.
     *
     * Keyed by email rather than user_id on purpose: the code is requested
     * before we are willing to say whether an account exists, and a foreign key
     * to users would force that answer at insert time.
     *
     * Only the hash of the code is stored. A six-digit number is guessable
     * enough that the table itself must not be a list of live credentials, and
     * a leaked backup should not be a way in.
     */

    /**
     * Replace the table left behind by the first attempt at passwordless login.
     *
     * That version stored the code itself in a `code` column — a live
     * credential in plaintext, readable by anything with a connection string or
     * a backup — and keyed rows by user_id, which forces the "does this address
     * exist" answer at insert time. `CREATE TABLE IF NOT EXISTS` would leave it
     * exactly as it is and every query below would fail on a missing column.
     *
     * Conditional on the absence of `code_hash`, so this runs once against the
     * old shape and never again. The only thing dropped is unexpired login
     * codes, which are ten minutes of nothing: the worst case is someone
     * mid-login asks for another.
     */
    const stale = await pool.query(
      `SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = $1 AND t.table_name = 'login_codes'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
             WHERE c.table_schema = $1 AND c.table_name = 'login_codes'
               AND c.column_name = 'code_hash'
          )`,
      [auth],
    );
    if (stale.rows.length > 0) {
      await pool.query(`DROP TABLE ${auth}.login_codes`);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${auth}.login_codes (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email        CITEXT NOT NULL,
        code_hash    TEXT NOT NULL,
        expires_at   TIMESTAMPTZ NOT NULL,
        consumed_at  TIMESTAMPTZ,
        attempts     SMALLINT NOT NULL DEFAULT 0,
        request_ip   TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // The lookup is always "the newest live code for this address", and the
    // rate limits count recent rows per address and per IP.
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_login_codes_email_created
        ON ${auth}.login_codes (email, created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_login_codes_ip_created
        ON ${auth}.login_codes (request_ip, created_at DESC)
    `);

    /**
     * A passwordless account has no password, so the column cannot be NOT NULL.
     *
     * Migration 010 re-imposed NOT NULL when passwordless was removed. Dropping
     * it here rather than only in a migration file is deliberate: the hosted
     * database is migrated by hand, and a deploy that lands before someone runs
     * the SQL would fail every login with a constraint violation.
     */
    await pool.query(`
      ALTER TABLE ${auth}.users ALTER COLUMN password_hash DROP NOT NULL
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
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Chef',
        ADD COLUMN IF NOT EXISTS cover_url TEXT
    `);
  })();

  return schemaReady;
}
