-- Mentor Calendly booking link for the simplified mentorship flow.
-- Scheduling happens on Calendly after the mentee pays via Brigade Checkout.

ALTER TABLE mentorship.mentors
  ADD COLUMN IF NOT EXISTS calendly_url TEXT;
