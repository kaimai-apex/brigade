-- Company slugs for /company/:slug pages

ALTER TABLE jobs.companies
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_companies_slug
  ON jobs.companies(slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;
