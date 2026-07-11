-- 007 — Profile cover banner
ALTER TABLE users.profiles
  ADD COLUMN IF NOT EXISTS cover_url TEXT;
