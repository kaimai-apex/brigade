-- 002 — Users / profiles (hospitality fields included)

CREATE SCHEMA IF NOT EXISTS users;

CREATE TABLE IF NOT EXISTS users.profiles (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                         UUID NOT NULL UNIQUE,
    first_name                      TEXT NOT NULL,
    last_name                       TEXT NOT NULL,
    headline                        TEXT,
    about                           TEXT,
    industry                        TEXT,
    location                        TEXT,
    website                         TEXT,
    resume_url                      TEXT,
    avatar_url                      TEXT,
    city                            TEXT,
    state                           TEXT,
    country                         TEXT,
    current_position                TEXT,
    current_employer                TEXT,
    instagram_url                   TEXT,
    linkedin_url                    TEXT,
    expertise_areas                 TEXT[] DEFAULT '{}',
    years_experience                INT,
    onboarding_step                 INT NOT NULL DEFAULT 0,
    onboarding_completed            BOOLEAN NOT NULL DEFAULT false,
    open_to_opportunities           BOOLEAN NOT NULL DEFAULT false,
    available_private_events        BOOLEAN NOT NULL DEFAULT false,
    available_contract_work         BOOLEAN NOT NULL DEFAULT false,
    available_emergency_staffing    BOOLEAN NOT NULL DEFAULT false,
    role                            TEXT NOT NULL DEFAULT 'Chef',
    completeness                    SMALLINT NOT NULL DEFAULT 0,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at                      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users.experience (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    company     TEXT NOT NULL,
    position    TEXT NOT NULL,
    location    TEXT,
    start_date  DATE NOT NULL,
    end_date    DATE,
    description TEXT
);
CREATE INDEX IF NOT EXISTS idx_experience_user ON users.experience(user_id);

CREATE TABLE IF NOT EXISTS users.education (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    school     TEXT NOT NULL,
    degree     TEXT,
    field      TEXT,
    start_date DATE,
    end_date   DATE
);
CREATE INDEX IF NOT EXISTS idx_education_user ON users.education(user_id);

CREATE TABLE IF NOT EXISTS users.skills (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users.user_skills (
    user_id      UUID NOT NULL,
    skill_id     UUID NOT NULL REFERENCES users.skills(id) ON DELETE CASCADE,
    endorsements INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS users.certifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    name        TEXT NOT NULL,
    issuer      TEXT,
    issued_at   DATE,
    expires_at  DATE
);
CREATE INDEX IF NOT EXISTS idx_certifications_user ON users.certifications(user_id);

CREATE TABLE IF NOT EXISTS users.portfolio_links (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    type       TEXT NOT NULL,
    url        TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_links_user ON users.portfolio_links(user_id);

CREATE TABLE IF NOT EXISTS users.profile_work_photos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    image_url  TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_photos_user ON users.profile_work_photos(user_id);
