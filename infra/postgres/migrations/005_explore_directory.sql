-- Explore directory entities beyond restaurants: schools, associations,
-- suppliers, news, job listings, neighbourhoods. Static curated seed today;
-- tables are claimable / editable shaped for future write paths.

CREATE SCHEMA IF NOT EXISTS explore;

CREATE TABLE IF NOT EXISTS explore.schools (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    city            TEXT NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    programs        TEXT[] NOT NULL DEFAULT '{}',
    credential      TEXT NOT NULL,
    website         TEXT NOT NULL,
    blurb           TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT 'curated',
    claimed_by_user_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_explore_schools_geo ON explore.schools(lat, lng);
CREATE INDEX IF NOT EXISTS idx_explore_schools_programs ON explore.schools USING GIN(programs);

CREATE TABLE IF NOT EXISTS explore.associations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    acronym         TEXT,
    scope           TEXT NOT NULL,  -- National | Ontario | Global
    website         TEXT NOT NULL,
    role            TEXT NOT NULL,
    blurb           TEXT NOT NULL,
    source          TEXT NOT NULL DEFAULT 'curated',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_explore_associations_scope ON explore.associations(scope);

CREATE TABLE IF NOT EXISTS explore.suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    categories      TEXT[] NOT NULL DEFAULT '{}',
    regions_served  TEXT[] NOT NULL DEFAULT '{}',
    website         TEXT NOT NULL,
    phone           TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    description     TEXT NOT NULL,
    claimed         BOOLEAN NOT NULL DEFAULT false,
    source          TEXT NOT NULL DEFAULT 'curated',
    claimed_by_user_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_explore_suppliers_geo ON explore.suppliers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_explore_suppliers_categories ON explore.suppliers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_explore_suppliers_regions ON explore.suppliers USING GIN(regions_served);

CREATE TABLE IF NOT EXISTS explore.news_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    snippet         TEXT NOT NULL,
    source_name     TEXT NOT NULL,
    source_url      TEXT NOT NULL,
    url             TEXT NOT NULL,
    published_at    TIMESTAMPTZ NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    source          TEXT NOT NULL DEFAULT 'curated',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_explore_news_published ON explore.news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_explore_news_tags ON explore.news_items USING GIN(tags);

-- Explore link-out job listings (distinct from native job-service postings).
CREATE TABLE IF NOT EXISTS explore.job_listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    employer        TEXT NOT NULL,
    neighbourhood   TEXT NOT NULL,
    job_type        TEXT NOT NULL,       -- BOH | FOH | Management | Hotel | Events
    employment      TEXT NOT NULL,
    compensation    TEXT,
    source_name     TEXT NOT NULL,
    url             TEXT NOT NULL,
    posted_at       TIMESTAMPTZ NOT NULL,
    lat             DOUBLE PRECISION,   -- neighbourhood centroid at seed time
    lng             DOUBLE PRECISION,
    source          TEXT NOT NULL DEFAULT 'curated',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_explore_jobs_posted ON explore.job_listings(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_explore_jobs_type ON explore.job_listings(job_type);
CREATE INDEX IF NOT EXISTS idx_explore_jobs_geo ON explore.job_listings(lat, lng);

CREATE TABLE IF NOT EXISTS explore.neighbourhoods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    source          TEXT NOT NULL DEFAULT 'curated',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_explore_neighbourhoods_geo ON explore.neighbourhoods(lat, lng);
