-- Saved jobs for users
CREATE TABLE IF NOT EXISTS jobs.saved_jobs (
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON jobs.saved_jobs(user_id);
