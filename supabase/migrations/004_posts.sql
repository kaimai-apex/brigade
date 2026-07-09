-- 004 — Posts / feed (Postgres store; Cassandra optional in production)

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
CREATE INDEX IF NOT EXISTS idx_posts_author
  ON posts.posts(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS posts.comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES posts.posts(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post
  ON posts.comments(post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS posts.likes (
    post_id     UUID NOT NULL REFERENCES posts.posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts.home_timeline (
    user_id     UUID NOT NULL,
    post_id     UUID NOT NULL REFERENCES posts.posts(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL,
    score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_timeline_user
  ON posts.home_timeline(user_id, created_at DESC);
