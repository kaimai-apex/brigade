-- Brigade Chef Academy — applications, cohorts, enrolment.
--
-- The pivot: Brigade stops being a marketplace where a member books one paid
-- session with one mentor, and becomes a cohort program that a chef applies to,
-- is accepted into, and moves through. Money now attaches to an enrolment, not
-- to a booking.
--
-- Deliberately a NEW schema rather than more tables in `users`. The academy has
-- its own lifecycle (apply → review → accept → enrol → graduate) and its own
-- admin surface; keeping it separate means the member/profile tables stay the
-- identity layer that both the academy and the directory read from.
--
-- What is NOT recreated here, because it already exists:
--   * the chef's identity, bio, specialties, resume, gallery → users.profiles
--   * mentor profiles and weekly availability          → mentorship.mentors
-- Duplicating either would give Brigade two answers to "who is this person".

CREATE SCHEMA IF NOT EXISTS academy;

-- ---------------------------------------------------------------------------
-- Cohorts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academy.cohorts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  starts_on   DATE        NOT NULL,
  ends_on     DATE        NOT NULL,
  -- 20–30 is the intended size; stored per-cohort so a pilot can run smaller.
  capacity    INT         NOT NULL DEFAULT 30,
  -- Minor units, frozen onto each enrolment at acceptance. Price changes
  -- between cohorts must never rewrite what someone already agreed to pay.
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
);

CREATE INDEX IF NOT EXISTS idx_cohorts_status_start
  ON academy.cohorts (status, starts_on DESC);

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
--
-- An application belongs to an account: applying requires signing up first, so
-- the answers, the resume and any later enrolment all hang off one identity
-- rather than being reconciled by email address afterwards.
CREATE TABLE IF NOT EXISTS academy.applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  -- Which cohort they are applying for. Nullable: someone can apply before the
  -- next cohort has been scheduled, and admin places them at acceptance.
  cohort_id        UUID        REFERENCES academy.cohorts (id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'draft',

  -- The free-text and multi-choice answers, as given. JSONB because the
  -- question set will change between cohorts and old applications must still
  -- render exactly as they were answered — a column per question would either
  -- lose history or accumulate dead columns.
  answers          JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Denormalised out of `answers` because admin sorts and filters on them.
  years_experience INT,
  current_position TEXT,
  location         TEXT,
  referral_source  TEXT,

  -- Links. Stored here rather than on the profile: these are what they claimed
  -- when applying, which is evidence, and must not change if they later edit
  -- their profile.
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
);

-- One live application per person. A rejected or withdrawn one should not block
-- applying to the next cohort, so the uniqueness only covers open states.
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_one_open_per_user
  ON academy.applications (user_id)
  WHERE status IN ('draft', 'submitted', 'under_review', 'interview');

-- The admin queue: oldest submitted first, so nobody waits behind a newer one.
CREATE INDEX IF NOT EXISTS idx_applications_queue
  ON academy.applications (status, submitted_at ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_applications_user
  ON academy.applications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Enrolment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academy.cohort_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id      UUID        NOT NULL REFERENCES academy.cohorts (id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL,
  application_id UUID        REFERENCES academy.applications (id) ON DELETE SET NULL,
  -- faculty covers Jordan and the four other chefs teaching the cohort; they
  -- need the cohort's community and calendar without being enrolled students.
  role           TEXT        NOT NULL DEFAULT 'chef',
  status         TEXT        NOT NULL DEFAULT 'invited',

  -- The money, frozen at acceptance (see academy.cohorts.price_cents).
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
  -- Nobody is enrolled in the same cohort twice.
  CONSTRAINT cohort_members_unique UNIQUE (cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort
  ON academy.cohort_members (cohort_id, status);

CREATE INDEX IF NOT EXISTS idx_cohort_members_user
  ON academy.cohort_members (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cohort_members_checkout
  ON academy.cohort_members (checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;
