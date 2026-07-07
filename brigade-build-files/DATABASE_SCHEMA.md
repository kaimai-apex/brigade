# ConnectPro — Database Schema

Each service owns its data. No cross-service foreign keys; references across service boundaries are by ID and reconciled via events. DDL below shows the logical model per store.

## Conventions

- **Primary keys:** UUID v4.
- **Timestamps:** `created_at`, `updated_at` (UTC) on every table.
- **Soft deletes:** `deleted_at TIMESTAMPTZ NULL`; queries filter `deleted_at IS NULL`.
- **Indexes:** all foreign-key columns and common query filters indexed.
- **Naming:** snake_case tables/columns; plural table names.

---

## 1. Auth Service (PostgreSQL)

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret      TEXT,
    status          TEXT NOT NULL DEFAULT 'active', -- active|suspended|banned
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE user_roles (
    user_id   UUID NOT NULL REFERENCES users(id),
    role      TEXT NOT NULL, -- USER|RECRUITER|COMPANY_ADMIN|MODERATOR|SYSTEM_ADMIN
    PRIMARY KEY (user_id, role)
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE oauth_accounts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id),
    provider      TEXT NOT NULL,        -- google|linkedin|github
    provider_uid  TEXT NOT NULL,
    UNIQUE (provider, provider_uid)
);
```

---

## 2. User Service (PostgreSQL)

```sql
CREATE TABLE profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL UNIQUE,  -- ref auth.users.id
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

CREATE TABLE experience (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    company     TEXT NOT NULL,
    position    TEXT NOT NULL,
    location    TEXT,
    start_date  DATE NOT NULL,
    end_date    DATE,               -- NULL = current
    description TEXT
);
CREATE INDEX idx_experience_user ON experience(user_id);

CREATE TABLE education (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    school     TEXT NOT NULL,
    degree     TEXT,
    field      TEXT,
    start_date DATE,
    end_date   DATE
);
CREATE INDEX idx_education_user ON education(user_id);

CREATE TABLE skills (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE user_skills (
    user_id     UUID NOT NULL,
    skill_id    UUID NOT NULL REFERENCES skills(id),
    endorsements INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE certifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    name        TEXT NOT NULL,
    issuer      TEXT,
    issued_at   DATE,
    expires_at  DATE
);
CREATE INDEX idx_certifications_user ON certifications(user_id);
```

---

## 3. Connection Service (PostgreSQL)

```sql
CREATE TABLE connections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id    UUID NOT NULL,
    receiver_id  UUID NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending', -- pending|accepted|rejected
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);
CREATE INDEX idx_connections_receiver ON connections(receiver_id, status);
CREATE INDEX idx_connections_sender   ON connections(sender_id, status);

CREATE TABLE follows (
    follower_id  UUID NOT NULL,
    followee_id  UUID NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX idx_follows_followee ON follows(followee_id);
```

---

## 4. Post Service (Cassandra)

```sql
-- Posts partitioned by author for author-timeline reads
CREATE TABLE posts_by_author (
    author_id   uuid,
    post_id     timeuuid,
    content     text,
    media_url   text,
    post_type   text,        -- text|image|video|document|poll
    visibility  text,        -- public|connections|private
    created_at  timestamp,
    PRIMARY KEY ((author_id), post_id)
) WITH CLUSTERING ORDER BY (post_id DESC);

CREATE TABLE comments_by_post (
    post_id     uuid,
    comment_id  timeuuid,
    author_id   uuid,
    content     text,
    created_at  timestamp,
    PRIMARY KEY ((post_id), comment_id)
) WITH CLUSTERING ORDER BY (comment_id DESC);

CREATE TABLE likes_by_post (
    post_id  uuid,
    user_id  uuid,
    created_at timestamp,
    PRIMARY KEY ((post_id), user_id)
);

CREATE TABLE like_counts (
    post_id uuid PRIMARY KEY,
    count   counter
);
```

---

## 5. Feed Service (Cassandra)

```sql
-- Precomputed timeline: one partition per viewer (fanout-on-write)
CREATE TABLE home_timeline (
    user_id     uuid,
    post_id     timeuuid,
    author_id   uuid,
    score       double,
    created_at  timestamp,
    PRIMARY KEY ((user_id), post_id)
) WITH CLUSTERING ORDER BY (post_id DESC);
```

---

## 6. Messaging Service (MongoDB)

```javascript
// conversations
{
  _id: ObjectId,
  type: "direct" | "group",
  participants: [uuid],
  title: String,            // group only
  lastMessageAt: ISODate,
  createdAt: ISODate
}

// messages
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: uuid,
  body: String,
  attachments: [{ url, mime, size }],
  reactions: [{ userId, emoji }],
  readBy: [{ userId, at }],
  createdAt: ISODate
}
// Indexes: conversations.participants, messages.conversationId + createdAt
```

---

## 7. Job & Company Service (PostgreSQL)

```sql
CREATE TABLE companies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    industry   TEXT,
    website    TEXT,
    size       TEXT,
    logo_url   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE company_followers (
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id    UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, user_id)
);

CREATE TABLE jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    recruiter_id    UUID NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    location        TEXT,
    salary_min      INT,
    salary_max      INT,
    employment_type TEXT,   -- full_time|part_time|contract|internship
    status          TEXT NOT NULL DEFAULT 'open', -- open|closed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status  ON jobs(status);

CREATE TABLE applications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id     UUID NOT NULL REFERENCES jobs(id),
    user_id    UUID NOT NULL,
    status     TEXT NOT NULL DEFAULT 'submitted', -- submitted|reviewed|interview|rejected|hired
    resume_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, user_id)
);
CREATE INDEX idx_applications_job  ON applications(job_id, status);
CREATE INDEX idx_applications_user ON applications(user_id);
```

---

## 8. Notification Service (PostgreSQL)

```sql
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    type       TEXT NOT NULL,   -- connection_request|post_like|job_match|message|...
    payload    JSONB NOT NULL,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY,
    in_app  BOOLEAN NOT NULL DEFAULT TRUE,
    push    BOOLEAN NOT NULL DEFAULT TRUE,
    email   BOOLEAN NOT NULL DEFAULT TRUE,
    sms     BOOLEAN NOT NULL DEFAULT FALSE
);
```

---

## 9. Search Indexes (OpenSearch)

```text
Index: people      → name, headline, skills, location, industry
Index: companies   → name, industry, size, location
Index: jobs        → title, description, location, employment_type, salary
Index: posts       → content, author, hashtags, created_at
Index: articles    → title, body, author, tags
```

Each index is kept current by a consumer of the relevant Kafka topics (`profile-updated`, `job-created`, `post-created`, etc.).

---

## 10. Partitioning & Scaling Notes

- **Cassandra:** partition posts/feed by entity ID; keep partitions bounded; use TTL on stale timeline rows.
- **PostgreSQL:** partition `applications` and `notifications` by month if volume warrants; add read replicas.
- **MongoDB:** shard `messages` by `conversationId`.
- **Hot keys:** large-follower accounts handled by fanout-on-read to avoid write hotspots.
