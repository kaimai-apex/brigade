-- Mentorship marketplace.
--
-- Private chefs and hospitality leaders publish paid mentorship sessions;
-- members browse a mentor directory and book a slot. Brigade takes a cut.
--
-- Scheduling is native rather than a Calendly integration: the platform fee is
-- only collectable if the booking and the payment happen here. An external
-- scheduler would move the transaction off-platform.

CREATE SCHEMA IF NOT EXISTS mentorship;

-- Needed for the exclusion constraint on bookings below, which mixes an
-- equality column with a range column in one GiST index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Mentors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentorship.mentors (
  user_id           UUID PRIMARY KEY,
  headline          TEXT,
  bio               TEXT,
  -- IANA name ("America/New_York"). Availability rules below are expressed in
  -- this zone; everything else in this schema is stored in UTC.
  timezone          TEXT        NOT NULL DEFAULT 'UTC',
  currency          TEXT        NOT NULL DEFAULT 'usd',
  -- draft: not listed. active: bookable. paused: listed as unavailable.
  status            TEXT        NOT NULL DEFAULT 'draft',
  -- Minimum notice before a session may start, so nobody books you in 5 minutes.
  min_notice_hours  INT         NOT NULL DEFAULT 12,
  -- How far ahead the calendar opens.
  booking_horizon_days INT      NOT NULL DEFAULT 60,
  -- Stripe Connect account. payouts_enabled mirrors charges_enabled from the
  -- account object: until it is true the mentor cannot be paid, so cannot sell.
  payout_account_id TEXT,
  payouts_enabled   BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mentors_status_check CHECK (status IN ('draft', 'active', 'paused')),
  CONSTRAINT mentors_notice_check CHECK (min_notice_hours >= 0),
  CONSTRAINT mentors_horizon_check CHECK (booking_horizon_days BETWEEN 1 AND 365)
);

CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentorship.mentors (status);

-- ---------------------------------------------------------------------------
-- What a mentor sells
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentorship.session_types (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id   UUID        NOT NULL REFERENCES mentorship.mentors (user_id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT,
  duration_minutes INT         NOT NULL,
  -- Minor units. Never a float: 0.1 + 0.2 is not 0.3 and money is not a place
  -- to discover that.
  price_cents      INT         NOT NULL,
  active           BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT session_types_duration_check CHECK (duration_minutes BETWEEN 15 AND 480),
  CONSTRAINT session_types_price_check CHECK (price_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_session_types_mentor
  ON mentorship.session_types (mentor_user_id, active);

-- ---------------------------------------------------------------------------
-- Recurring weekly availability, in the mentor's own timezone
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentorship.availability_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id UUID     NOT NULL REFERENCES mentorship.mentors (user_id) ON DELETE CASCADE,
  -- 0 = Sunday, matching both JS getDay() and Postgres EXTRACT(DOW).
  weekday        SMALLINT NOT NULL,
  -- Minutes from local midnight. Storing a time-of-day rather than a timestamp
  -- is what makes the rule survive daylight saving: "Tuesdays 09:00" stays
  -- 09:00 local when the offset shifts.
  start_minute   INT      NOT NULL,
  end_minute     INT      NOT NULL,
  CONSTRAINT availability_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT availability_range_check CHECK (start_minute >= 0 AND end_minute <= 1440),
  CONSTRAINT availability_order_check CHECK (end_minute > start_minute)
);

CREATE INDEX IF NOT EXISTS idx_availability_rules_mentor
  ON mentorship.availability_rules (mentor_user_id, weekday);

-- One-off blocks: holidays, a service, anything that overrides the weekly rule.
CREATE TABLE IF NOT EXISTS mentorship.availability_exceptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id UUID        NOT NULL REFERENCES mentorship.mentors (user_id) ON DELETE CASCADE,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  reason         TEXT,
  CONSTRAINT availability_exception_order_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_availability_exceptions_mentor
  ON mentorship.availability_exceptions (mentor_user_id, starts_at);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mentorship.bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id     UUID        NOT NULL REFERENCES mentorship.mentors (user_id),
  mentee_user_id     UUID        NOT NULL,
  session_type_id    UUID        NOT NULL REFERENCES mentorship.session_types (id),
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'pending_payment',

  -- The money, frozen at booking time. Prices and the platform rate can both
  -- change; a past booking must still explain itself years later.
  currency           TEXT        NOT NULL DEFAULT 'usd',
  price_cents        INT         NOT NULL,
  platform_fee_bps   INT         NOT NULL,
  platform_fee_cents INT         NOT NULL,
  mentor_payout_cents INT        NOT NULL,

  payment_intent_id  TEXT,
  meeting_url        TEXT,
  cancelled_at       TIMESTAMPTZ,
  cancelled_by       UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bookings_status_check
    CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'completed')),
  CONSTRAINT bookings_order_check CHECK (ends_at > starts_at),
  CONSTRAINT bookings_not_self CHECK (mentor_user_id <> mentee_user_id),
  -- The split must account for every cent taken.
  CONSTRAINT bookings_split_check
    CHECK (platform_fee_cents + mentor_payout_cents = price_cents),
  CONSTRAINT bookings_fee_check CHECK (platform_fee_cents >= 0 AND mentor_payout_cents >= 0)
);

-- Two people racing for the same slot must not both succeed. Doing this with a
-- SELECT-then-INSERT in application code loses that race; the database is the
-- only place that can actually decide. Cancelled bookings free their slot.
ALTER TABLE mentorship.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE mentorship.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    mentor_user_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status <> 'cancelled');

CREATE INDEX IF NOT EXISTS idx_bookings_mentor
  ON mentorship.bookings (mentor_user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_mentee
  ON mentorship.bookings (mentee_user_id, starts_at DESC);
