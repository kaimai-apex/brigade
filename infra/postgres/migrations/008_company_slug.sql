-- Company pages use human-readable slugs (e.g. /company/hospitality-pulse)

ALTER TABLE jobs.companies
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_companies_slug
  ON jobs.companies(slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;

-- Backfill slugs for existing rows (id suffix keeps uniqueness)
UPDATE jobs.companies
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
           || '-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE slug IS NULL;
