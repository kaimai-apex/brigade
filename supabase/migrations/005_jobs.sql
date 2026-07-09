-- 005 — Companies / jobs / applications / saved jobs

CREATE SCHEMA IF NOT EXISTS jobs;

CREATE TABLE IF NOT EXISTS jobs.companies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    industry   TEXT,
    website    TEXT,
    size       TEXT,
    logo_url   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jobs.company_followers (
    company_id UUID NOT NULL REFERENCES jobs.companies(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS jobs.jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES jobs.companies(id),
    recruiter_id    UUID NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    location        TEXT,
    salary_min      INT,
    salary_max      INT,
    employment_type TEXT,
    status          TEXT NOT NULL DEFAULT 'open',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs.jobs(status);

CREATE TABLE IF NOT EXISTS jobs.applications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id     UUID NOT NULL REFERENCES jobs.jobs(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    status     TEXT NOT NULL DEFAULT 'submitted',
    resume_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_job ON jobs.applications(job_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON jobs.applications(user_id);

CREATE TABLE IF NOT EXISTS jobs.saved_jobs (
    user_id    UUID NOT NULL,
    job_id     UUID NOT NULL REFERENCES jobs.jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON jobs.saved_jobs(user_id);
