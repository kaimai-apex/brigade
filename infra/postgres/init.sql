-- ConnectPro / Brigade — consolidated PostgreSQL schemas per service boundary
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Auth Service
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
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

CREATE TABLE auth.user_roles (
    user_id   UUID NOT NULL REFERENCES auth.users(id),
    role      TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
);

CREATE TABLE auth.refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON auth.refresh_tokens(user_id);

-- User Service
CREATE SCHEMA IF NOT EXISTS users;

CREATE TABLE users.profiles (
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
    city         TEXT,
    state        TEXT,
    country      TEXT,
    current_position TEXT,
    current_employer TEXT,
    instagram_url TEXT,
    linkedin_url TEXT,
    expertise_areas TEXT[] DEFAULT '{}',
    years_experience INT,
    onboarding_step INT NOT NULL DEFAULT 0,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    open_to_opportunities BOOLEAN NOT NULL DEFAULT false,
    available_private_events BOOLEAN NOT NULL DEFAULT false,
    available_contract_work BOOLEAN NOT NULL DEFAULT false,
    available_emergency_staffing BOOLEAN NOT NULL DEFAULT false,
    role         TEXT NOT NULL DEFAULT 'Chef',
    completeness SMALLINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE users.experience (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    company     TEXT NOT NULL,
    position    TEXT NOT NULL,
    location    TEXT,
    start_date  DATE NOT NULL,
    end_date    DATE,
    description TEXT
);
CREATE INDEX idx_experience_user ON users.experience(user_id);

CREATE TABLE users.education (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    school     TEXT NOT NULL,
    degree     TEXT,
    field      TEXT,
    start_date DATE,
    end_date   DATE
);
CREATE INDEX idx_education_user ON users.education(user_id);

CREATE TABLE users.skills (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE users.user_skills (
    user_id      UUID NOT NULL,
    skill_id     UUID NOT NULL REFERENCES users.skills(id),
    endorsements INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE users.certifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    name        TEXT NOT NULL,
    issuer      TEXT,
    issued_at   DATE,
    expires_at  DATE
);
CREATE INDEX idx_certifications_user ON users.certifications(user_id);

CREATE TABLE users.portfolio_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portfolio_links_user ON users.portfolio_links(user_id);

CREATE TABLE users.profile_work_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_photos_user ON users.profile_work_photos(user_id);

CREATE TABLE users.profile_views (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID NOT NULL,
    viewer_id   UUID NOT NULL,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profile_views_profile ON users.profile_views(profile_id, viewed_at DESC);

-- Connection Service
CREATE SCHEMA IF NOT EXISTS connections;

CREATE TABLE connections.connections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID NOT NULL,
    receiver_id  UUID NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);
CREATE INDEX idx_connections_receiver ON connections.connections(receiver_id, status);
CREATE INDEX idx_connections_sender ON connections.connections(sender_id, status);

CREATE TABLE connections.follows (
    follower_id  UUID NOT NULL,
    followee_id  UUID NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX idx_follows_followee ON connections.follows(followee_id);

-- Job & Company Service
CREATE SCHEMA IF NOT EXISTS jobs;

CREATE TABLE jobs.companies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    industry   TEXT,
    website    TEXT,
    size       TEXT,
    logo_url   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE jobs.company_followers (
    company_id UUID NOT NULL REFERENCES jobs.companies(id),
    user_id    UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, user_id)
);

CREATE TABLE jobs.jobs (
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
CREATE INDEX idx_jobs_company ON jobs.jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs.jobs(status);

CREATE TABLE jobs.applications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id     UUID NOT NULL REFERENCES jobs.jobs(id),
    user_id    UUID NOT NULL,
    status     TEXT NOT NULL DEFAULT 'submitted',
    resume_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, user_id)
);
CREATE INDEX idx_applications_job ON jobs.applications(job_id, status);
CREATE INDEX idx_applications_user ON jobs.applications(user_id);

CREATE TABLE jobs.saved_jobs (
    user_id    UUID NOT NULL,
    job_id     UUID NOT NULL REFERENCES jobs.jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_id)
);
CREATE INDEX idx_saved_jobs_user ON jobs.saved_jobs(user_id);

-- Notification Service
CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE notifications.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    type       TEXT NOT NULL,
    payload    JSONB NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications.notifications(user_id, read_at);

CREATE TABLE notifications.notification_preferences (
    user_id UUID PRIMARY KEY,
    in_app  BOOLEAN NOT NULL DEFAULT TRUE,
    push    BOOLEAN NOT NULL DEFAULT TRUE,
    email   BOOLEAN NOT NULL DEFAULT TRUE,
    sms     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Post & Feed Service (PostgreSQL dev store; Cassandra in production)
CREATE SCHEMA IF NOT EXISTS posts;

CREATE TABLE posts.posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID NOT NULL,
    content     TEXT NOT NULL,
    media_url   TEXT,
    post_type   TEXT NOT NULL DEFAULT 'text',
    visibility  TEXT NOT NULL DEFAULT 'public',
    reposted_post_id UUID REFERENCES posts.posts(id),
    like_count  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_posts_author ON posts.posts(author_id, created_at DESC);

CREATE TABLE posts.comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES posts.posts(id),
    author_id   UUID NOT NULL,
    content     TEXT NOT NULL,
    parent_id   UUID REFERENCES posts.comments(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON posts.comments(post_id, created_at DESC);
CREATE INDEX idx_comments_parent ON posts.comments(parent_id);

CREATE TABLE posts.likes (
    post_id     UUID NOT NULL REFERENCES posts.posts(id),
    user_id     UUID NOT NULL,
    reaction    TEXT NOT NULL DEFAULT 'like'
                CHECK (reaction IN ('like','celebrate','support','love','insightful','funny')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE posts.home_timeline (
    user_id     UUID NOT NULL,
    post_id     UUID NOT NULL REFERENCES posts.posts(id),
    author_id   UUID NOT NULL,
    score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);
CREATE INDEX idx_timeline_user ON posts.home_timeline(user_id, created_at DESC);
