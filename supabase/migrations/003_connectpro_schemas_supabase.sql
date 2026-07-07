-- ConnectPro microservice schemas for SUPABASE
-- Supabase owns the `auth` schema (GoTrue). ConnectPro auth tables live in `connectpro_auth`.
-- Run this file instead of 003_connectpro_schemas.sql in the Supabase SQL Editor.
-- Then set AUTH_SCHEMA=connectpro_auth in your .env before starting auth-service.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS connectpro_auth;

CREATE TABLE IF NOT EXISTS connectpro_auth.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret      TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS connectpro_auth.user_roles (
    user_id   UUID NOT NULL REFERENCES connectpro_auth.users(id),
    role      TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS connectpro_auth.refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES connectpro_auth.users(id),
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON connectpro_auth.refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS connectpro_auth.oauth_accounts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES connectpro_auth.users(id),
    provider      TEXT NOT NULL,
    provider_uid  TEXT NOT NULL,
    UNIQUE (provider, provider_uid)
);

CREATE SCHEMA IF NOT EXISTS users;

CREATE TABLE IF NOT EXISTS users.profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL UNIQUE,
    first_name   TEXT NOT NULL,
    last_name    TEXT NOT NULL,
    headline     TEXT,
    about        TEXT,
    industry     TEXT,
    location     TEXT,
    website      TEXT,
    resume_url   TEXT,
    avatar_url   TEXT,
    completeness SMALLINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
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
    skill_id     UUID NOT NULL REFERENCES users.skills(id),
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

CREATE SCHEMA IF NOT EXISTS connections;

CREATE TABLE IF NOT EXISTS connections.connections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID NOT NULL,
    receiver_id  UUID NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS connections.follows (
    follower_id  UUID NOT NULL,
    followee_id  UUID NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id)
);

CREATE SCHEMA IF NOT EXISTS posts;

CREATE TABLE IF NOT EXISTS posts.posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID NOT NULL,
    content     TEXT NOT NULL,
    media_url   TEXT,
    post_type   TEXT NOT NULL DEFAULT 'text',
    visibility  TEXT NOT NULL DEFAULT 'public',
    like_count  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS posts.comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES posts.posts(id),
    author_id   UUID NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts.likes (
    post_id     UUID NOT NULL REFERENCES posts.posts(id),
    user_id     UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts.home_timeline (
    user_id     UUID NOT NULL,
    post_id     UUID NOT NULL REFERENCES posts.posts(id),
    author_id   UUID NOT NULL,
    score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

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
    company_id UUID NOT NULL REFERENCES jobs.companies(id),
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

CREATE TABLE IF NOT EXISTS jobs.applications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id     UUID NOT NULL REFERENCES jobs.jobs(id),
    user_id    UUID NOT NULL,
    status     TEXT NOT NULL DEFAULT 'submitted',
    resume_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, user_id)
);

CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE IF NOT EXISTS notifications.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    type       TEXT NOT NULL,
    payload    JSONB NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications.notification_preferences (
    user_id UUID PRIMARY KEY,
    in_app  BOOLEAN NOT NULL DEFAULT TRUE,
    push    BOOLEAN NOT NULL DEFAULT TRUE,
    email   BOOLEAN NOT NULL DEFAULT TRUE,
    sms     BOOLEAN NOT NULL DEFAULT FALSE
);
