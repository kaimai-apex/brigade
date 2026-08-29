ALTER TABLE public.journal_subscribers
  ADD COLUMN IF NOT EXISTS phone TEXT;
