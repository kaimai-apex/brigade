-- The money path, and the fields a mentor fills in to build their own card.
--
-- Migration 013 shipped the marketplace with a Stripe seam but nothing calling
-- it: bookings were created `pending_payment` and stayed there. This adds what
-- a real charge needs — a way to correlate a Stripe Checkout session back to a
-- booking, a record of what settled, and somewhere to remember which webhook
-- events have already been handled.

-- ---------------------------------------------------------------------------
-- Mentors: their own card, and payout onboarding state
-- ---------------------------------------------------------------------------

-- Discovery used to lean entirely on users.profiles.expertise_areas, which is
-- the member's profile — not what they teach. A pastry chef who mentors on
-- costing should be findable for costing. Mentor-owned tags, so the mentor
-- card is authored by the mentor.
ALTER TABLE mentorship.mentors
  ADD COLUMN IF NOT EXISTS expertise TEXT[] NOT NULL DEFAULT '{}';

-- How far through the setup flow they got. Setting up a mentor profile spans
-- several sittings — headline, then pricing, then hours, then Stripe's own
-- hosted onboarding, which leaves the site entirely. Without this the flow
-- restarts from the top every time they come back.
ALTER TABLE mentorship.mentors
  ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT NOT NULL DEFAULT 0;

-- When Stripe first reported the account could actually accept charges.
-- payouts_enabled answers "can they sell today"; this answers "since when",
-- which is what a support conversation about a missing payout starts from.
ALTER TABLE mentorship.mentors
  ADD COLUMN IF NOT EXISTS payouts_onboarded_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Bookings: what actually settled
-- ---------------------------------------------------------------------------

-- The Checkout Session is the only identifier that exists before the customer
-- pays. The PaymentIntent on a Checkout Session is not reliably readable at
-- creation time, so this is what correlates a webhook back to a booking.
ALTER TABLE mentorship.bookings
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;

ALTER TABLE mentorship.bookings
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Stripe's own hosted receipt. Linked rather than reproduced: Stripe is the
-- party that took the money, so Stripe's receipt is the authoritative one.
ALTER TABLE mentorship.bookings
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- A short human-readable handle for the booking, for the receipt page and for
-- anyone reading it aloud on the phone. UUIDs are unusable for that.
ALTER TABLE mentorship.bookings
  ADD COLUMN IF NOT EXISTS confirmation_code TEXT;

-- Refunds are partial in the general case (a policy could keep a deposit), so
-- this is an amount, not a flag. 0 means nothing was given back.
ALTER TABLE mentorship.bookings
  ADD COLUMN IF NOT EXISTS refunded_cents INT NOT NULL DEFAULT 0;

ALTER TABLE mentorship.bookings
  ADD COLUMN IF NOT EXISTS refund_id TEXT;

-- Never refund more than was charged.
ALTER TABLE mentorship.bookings
  DROP CONSTRAINT IF EXISTS bookings_refund_check;
ALTER TABLE mentorship.bookings
  ADD CONSTRAINT bookings_refund_check
  CHECK (refunded_cents >= 0 AND refunded_cents <= price_cents);

-- Two people must not be able to hold the same confirmation code, and the
-- lookup is by code on the receipt page.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_confirmation_code
  ON mentorship.bookings (confirmation_code)
  WHERE confirmation_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_checkout_session
  ON mentorship.bookings (checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Webhook idempotency
-- ---------------------------------------------------------------------------
--
-- Stripe retries a webhook until it gets a 2xx, and will happily deliver the
-- same event twice even after success. Processing `checkout.session.completed`
-- twice would send a second confirmation and, once refunds exist, could refund
-- twice. The primary key is the event id, so the second delivery loses the
-- INSERT race and is skipped.
CREATE TABLE IF NOT EXISTS mentorship.webhook_events (
  id            TEXT PRIMARY KEY,
  type          TEXT        NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  -- Kept so a failed handler can be diagnosed against exactly what arrived.
  error         TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received
  ON mentorship.webhook_events (received_at DESC);
