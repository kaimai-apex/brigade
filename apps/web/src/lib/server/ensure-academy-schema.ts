import { getPool } from "@connectpro/common";

/**
 * Bring the connected database up to what the academy needs
 * (supabase/migrations/021_academy_cohorts.sql), idempotently, on first use.
 *
 * Same safety net as ensureDirectorySchema(): the hosted database is migrated
 * by hand, so a deploy can land ahead of its migration. Memoised per process.
 * Production may connect as a role that cannot CREATE — that is logged and
 * skipped, and the caller then fails loudly on the missing table rather than
 * silently pretending to have saved an application.
 */

let ready: Promise<void> | null = null;

function isPrivilegeError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "42501";
}

async function tryDdl(
  pool: ReturnType<typeof getPool>,
  sql: string,
  label: string,
): Promise<void> {
  try {
    await pool.query(sql);
  } catch (error) {
    if (isPrivilegeError(error)) {
      console.warn(
        `[ensure-academy-schema] skip ${label}:`,
        error instanceof Error ? error.message : error,
      );
      return;
    }
    throw error;
  }
}

export function ensureAcademySchema() {
  if (ready) return ready;

  ready = (async () => {
    const pool = getPool();

    const existing = await pool.query(
      `SELECT to_regclass('academy.cohort_members') AS reg`,
    );
    if (existing.rows[0]?.reg) return;

    await tryDdl(pool, "CREATE SCHEMA IF NOT EXISTS academy", "schema academy");

    await tryDdl(
      pool,
      `
      CREATE TABLE IF NOT EXISTS academy.cohorts (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT        NOT NULL,
        slug        TEXT        NOT NULL UNIQUE,
        description TEXT,
        starts_on   DATE        NOT NULL,
        ends_on     DATE        NOT NULL,
        capacity    INT         NOT NULL DEFAULT 30,
        price_cents INT         NOT NULL DEFAULT 400000,
        currency    TEXT        NOT NULL DEFAULT 'usd',
        status      TEXT        NOT NULL DEFAULT 'draft',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT cohorts_status_check
          CHECK (status IN ('draft', 'upcoming', 'active', 'completed', 'archived')),
        CONSTRAINT cohorts_dates_check CHECK (ends_on > starts_on),
        CONSTRAINT cohorts_capacity_check CHECK (capacity > 0),
        CONSTRAINT cohorts_price_check CHECK (price_cents >= 0)
      )
    `,
      "table cohorts",
    );

    await tryDdl(
      pool,
      `
      CREATE TABLE IF NOT EXISTS academy.applications (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID        NOT NULL,
        cohort_id        UUID        REFERENCES academy.cohorts (id) ON DELETE SET NULL,
        status           TEXT        NOT NULL DEFAULT 'draft',
        answers          JSONB       NOT NULL DEFAULT '{}'::jsonb,
        years_experience INT,
        current_position TEXT,
        location         TEXT,
        referral_source  TEXT,
        resume_url       TEXT,
        portfolio_url    TEXT,
        instagram_url    TEXT,
        admin_notes      TEXT,
        reviewed_by      UUID,
        reviewed_at      TIMESTAMPTZ,
        submitted_at     TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT applications_status_check CHECK (
          status IN ('draft', 'submitted', 'under_review', 'interview',
                     'accepted', 'rejected', 'waitlisted')
        ),
        CONSTRAINT applications_years_check
          CHECK (years_experience IS NULL OR years_experience BETWEEN 0 AND 70)
      )
    `,
      "table applications",
    );
    await tryDdl(
      pool,
      `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_one_open_per_user
        ON academy.applications (user_id)
        WHERE status IN ('draft', 'submitted', 'under_review', 'interview')
    `,
      "idx_applications_one_open_per_user",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_applications_queue
        ON academy.applications (status, submitted_at ASC NULLS LAST)
    `,
      "idx_applications_queue",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_applications_user
        ON academy.applications (user_id, created_at DESC)
    `,
      "idx_applications_user",
    );

    await tryDdl(
      pool,
      `
      CREATE TABLE IF NOT EXISTS academy.cohort_members (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cohort_id      UUID        NOT NULL REFERENCES academy.cohorts (id) ON DELETE CASCADE,
        user_id        UUID        NOT NULL,
        application_id UUID        REFERENCES academy.applications (id) ON DELETE SET NULL,
        role           TEXT        NOT NULL DEFAULT 'chef',
        status         TEXT        NOT NULL DEFAULT 'invited',
        price_cents    INT,
        currency       TEXT        NOT NULL DEFAULT 'usd',
        paid_at        TIMESTAMPTZ,
        checkout_session_id TEXT,
        joined_at      TIMESTAMPTZ,
        completed_at   TIMESTAMPTZ,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT cohort_members_role_check CHECK (role IN ('chef', 'faculty')),
        CONSTRAINT cohort_members_status_check CHECK (
          status IN ('invited', 'enrolled', 'active', 'completed', 'withdrawn')
        ),
        CONSTRAINT cohort_members_unique UNIQUE (cohort_id, user_id)
      )
    `,
      "table cohort_members",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort
        ON academy.cohort_members (cohort_id, status)
    `,
      "idx_cohort_members_cohort",
    );
    await tryDdl(
      pool,
      `
      CREATE INDEX IF NOT EXISTS idx_cohort_members_user
        ON academy.cohort_members (user_id, created_at DESC)
    `,
      "idx_cohort_members_user",
    );
  })();

  // A failed attempt shouldn't be cached — the next request should retry.
  ready.catch(() => {
    ready = null;
  });

  return ready;
}
