import { getPool } from "@connectpro/common";

/**
 * Bring the connected database up to what the mentorship marketplace needs
 * (supabase/migrations/013_mentorship.sql), idempotently, on first use.
 *
 * Same reasoning as ensure-directory-schema.ts: the hosted database is migrated
 * by hand, so a deploy can land ahead of its migration. When that happened to
 * the directory, every query failed on a missing column and the page rendered
 * empty with no clue why. Applying the DDL lazily removes the ordering
 * requirement entirely.
 *
 * Memoised per process, so it costs one round-trip per cold start.
 */

let ready: Promise<void> | null = null;

/** Additive columns that must land even when the base table already exists. */
async function ensureMentorColumns(pool: ReturnType<typeof getPool>) {
  for (const column of [
    "default_meeting_url TEXT",
    "expertise TEXT[] NOT NULL DEFAULT '{}'",
    "onboarding_step SMALLINT NOT NULL DEFAULT 0",
    "payouts_onboarded_at TIMESTAMPTZ",
    "industries TEXT[] NOT NULL DEFAULT '{}'",
    "help_offered TEXT[] NOT NULL DEFAULT '{}'",
    "languages TEXT[] NOT NULL DEFAULT '{}'",
    "mentee_types TEXT[] NOT NULL DEFAULT '{}'",
    // Migration 018 — Calendly booking link for simplified mentorship.
    "calendly_url TEXT",
  ]) {
    await pool.query(`ALTER TABLE mentorship.mentors ADD COLUMN IF NOT EXISTS ${column}`);
  }
  for (const [name, column] of [
    ["idx_mentors_industries", "industries"],
    ["idx_mentors_help_offered", "help_offered"],
    ["idx_mentors_expertise", "expertise"],
  ] as const) {
    await pool.query(
      `CREATE INDEX IF NOT EXISTS ${name} ON mentorship.mentors USING GIN (${column})`,
    );
  }
}

export function ensureMentorshipSchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();

    // Production often uses a limited role that can DML but not CREATE SCHEMA.
    // If the marketplace tables are already present, still apply additive
    // ALTERs (new columns) so a deploy can land ahead of a hand-run migration.
    const present = await pool.query(
      `SELECT 1
         FROM information_schema.tables
        WHERE table_schema = 'mentorship'
          AND table_name = 'mentors'
        LIMIT 1`,
    );
    if (present.rows.length > 0) {
      await ensureMentorColumns(pool);
      return;
    }

    await pool.query("CREATE SCHEMA IF NOT EXISTS mentorship");
    // Needed by the bookings exclusion constraint, which mixes an equality
    // column with a range column in one GiST index.
    await pool.query("CREATE EXTENSION IF NOT EXISTS btree_gist");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship.mentors (
        user_id              UUID PRIMARY KEY,
        headline             TEXT,
        bio                  TEXT,
        timezone             TEXT        NOT NULL DEFAULT 'UTC',
        currency             TEXT        NOT NULL DEFAULT 'usd',
        status               TEXT        NOT NULL DEFAULT 'draft',
        min_notice_hours     INT         NOT NULL DEFAULT 12,
        booking_horizon_days INT         NOT NULL DEFAULT 60,
        payout_account_id    TEXT,
        payouts_enabled      BOOLEAN     NOT NULL DEFAULT false,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT mentors_status_check CHECK (status IN ('draft', 'active', 'paused'))
      )
    `);
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentorship.mentors (status)",
    );
    await ensureMentorColumns(pool);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship.session_types (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentor_user_id   UUID        NOT NULL REFERENCES mentorship.mentors (user_id) ON DELETE CASCADE,
        title            TEXT        NOT NULL,
        description      TEXT,
        duration_minutes INT         NOT NULL,
        price_cents      INT         NOT NULL,
        active           BOOLEAN     NOT NULL DEFAULT true,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT session_types_duration_check CHECK (duration_minutes BETWEEN 15 AND 480),
        CONSTRAINT session_types_price_check CHECK (price_cents >= 0)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_session_types_mentor
        ON mentorship.session_types (mentor_user_id, active)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship.availability_rules (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentor_user_id UUID     NOT NULL REFERENCES mentorship.mentors (user_id) ON DELETE CASCADE,
        weekday        SMALLINT NOT NULL,
        start_minute   INT      NOT NULL,
        end_minute     INT      NOT NULL,
        CONSTRAINT availability_weekday_check CHECK (weekday BETWEEN 0 AND 6),
        CONSTRAINT availability_range_check CHECK (start_minute >= 0 AND end_minute <= 1440),
        CONSTRAINT availability_order_check CHECK (end_minute > start_minute)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_availability_rules_mentor
        ON mentorship.availability_rules (mentor_user_id, weekday)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship.availability_exceptions (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentor_user_id UUID        NOT NULL REFERENCES mentorship.mentors (user_id) ON DELETE CASCADE,
        starts_at      TIMESTAMPTZ NOT NULL,
        ends_at        TIMESTAMPTZ NOT NULL,
        reason         TEXT,
        CONSTRAINT availability_exception_order_check CHECK (ends_at > starts_at)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_availability_exceptions_mentor
        ON mentorship.availability_exceptions (mentor_user_id, starts_at)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship.bookings (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mentor_user_id      UUID        NOT NULL REFERENCES mentorship.mentors (user_id),
        mentee_user_id      UUID        NOT NULL,
        session_type_id     UUID        NOT NULL REFERENCES mentorship.session_types (id),
        starts_at           TIMESTAMPTZ NOT NULL,
        ends_at             TIMESTAMPTZ NOT NULL,
        status              TEXT        NOT NULL DEFAULT 'pending_payment',
        currency            TEXT        NOT NULL DEFAULT 'usd',
        price_cents         INT         NOT NULL,
        platform_fee_bps    INT         NOT NULL,
        platform_fee_cents  INT         NOT NULL,
        mentor_payout_cents INT         NOT NULL,
        payment_intent_id   TEXT,
        meeting_url         TEXT,
        cancelled_at        TIMESTAMPTZ,
        cancelled_by        UUID,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT bookings_status_check
          CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'completed')),
        CONSTRAINT bookings_order_check CHECK (ends_at > starts_at),
        CONSTRAINT bookings_not_self CHECK (mentor_user_id <> mentee_user_id),
        CONSTRAINT bookings_split_check
          CHECK (platform_fee_cents + mentor_payout_cents = price_cents),
        CONSTRAINT bookings_fee_check CHECK (platform_fee_cents >= 0 AND mentor_payout_cents >= 0)
      )
    `);

    // ADD CONSTRAINT has no IF NOT EXISTS, so ask the catalogue first — this
    // function runs on every cold start.
    const existing = await pool.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'`,
    );
    if (existing.rows.length === 0) {
      await pool.query(`
        ALTER TABLE mentorship.bookings
          ADD CONSTRAINT bookings_no_overlap
          EXCLUDE USING gist (
            mentor_user_id WITH =,
            tstzrange(starts_at, ends_at) WITH &&
          ) WHERE (status <> 'cancelled')
      `);
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_mentor
        ON mentorship.bookings (mentor_user_id, starts_at)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_mentee
        ON mentorship.bookings (mentee_user_id, starts_at DESC)
    `);

    // Migration 016 — what actually settled.
    for (const column of [
      "checkout_session_id TEXT",
      "paid_at TIMESTAMPTZ",
      "receipt_url TEXT",
      "confirmation_code TEXT",
      "refunded_cents INT NOT NULL DEFAULT 0",
      "refund_id TEXT",
    ]) {
      await pool.query(
        `ALTER TABLE mentorship.bookings ADD COLUMN IF NOT EXISTS ${column}`,
      );
    }
    // Never give back more than was taken. Dropped first because ADD
    // CONSTRAINT has no IF NOT EXISTS and this runs on every cold start.
    await pool.query(
      "ALTER TABLE mentorship.bookings DROP CONSTRAINT IF EXISTS bookings_refund_check",
    );
    await pool.query(`
      ALTER TABLE mentorship.bookings ADD CONSTRAINT bookings_refund_check
        CHECK (refunded_cents >= 0 AND refunded_cents <= price_cents)
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_confirmation_code
        ON mentorship.bookings (confirmation_code)
        WHERE confirmation_code IS NOT NULL
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_checkout_session
        ON mentorship.bookings (checkout_session_id)
        WHERE checkout_session_id IS NOT NULL
    `);

    // Stripe redelivers events until it sees a 2xx, and sometimes after. The
    // primary key is what stops a second delivery confirming — or later,
    // refunding — the same booking twice.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentorship.webhook_events (
        id           TEXT PRIMARY KEY,
        type         TEXT        NOT NULL,
        received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        processed_at TIMESTAMPTZ,
        error        TEXT
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_received
        ON mentorship.webhook_events (received_at DESC)
    `);
  })();

  // A failed attempt shouldn't be cached — the next request should retry.
  ready.catch(() => {
    ready = null;
  });

  return ready;
}
