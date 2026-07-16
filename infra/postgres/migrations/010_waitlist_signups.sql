CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT,
  phone_country  TEXT,
  source         TEXT NOT NULL DEFAULT 'landing',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_signups ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.waitlist_signups ADD COLUMN IF NOT EXISTS phone_country TEXT;

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created
  ON public.waitlist_signups (created_at DESC);
