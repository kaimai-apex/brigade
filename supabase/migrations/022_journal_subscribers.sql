CREATE EXTENSION IF NOT EXISTS citext;

-- Emails collected at the journal gate. One row per address; rereads of later
-- articles reuse the same unlock cookie and do not insert duplicates.
CREATE TABLE IF NOT EXISTS public.journal_subscribers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        CITEXT UNIQUE NOT NULL,
  article_slug TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_subscribers_created
  ON public.journal_subscribers (created_at DESC);

-- Writes go through DATABASE_URL (the Next server). Revoke PostgREST roles so
-- the anon key cannot read the list. RLS stays off because the pooler role is
-- not table owner and would otherwise fail every insert.
REVOKE ALL ON TABLE public.journal_subscribers FROM PUBLIC;
REVOKE ALL ON TABLE public.journal_subscribers FROM anon, authenticated;
