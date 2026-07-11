-- Company ownership for IDOR protection on update/analytics/job create.

ALTER TABLE jobs.companies
  ADD COLUMN IF NOT EXISTS owner_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_jobs_companies_owner
  ON jobs.companies(owner_user_id)
  WHERE owner_user_id IS NOT NULL;
