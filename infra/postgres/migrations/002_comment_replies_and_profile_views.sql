-- Threaded comment replies: one level of nesting (LinkedIn-style).
ALTER TABLE posts.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES posts.comments(id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON posts.comments(parent_id);

-- "Who viewed your profile": record each distinct viewer→profile view.
CREATE TABLE IF NOT EXISTS users.profile_views (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID NOT NULL,
    viewer_id   UUID NOT NULL,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON users.profile_views(profile_id, viewed_at DESC);
