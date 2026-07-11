-- Quote-reposts: a post can reference an original post it reposts.
ALTER TABLE posts.posts
  ADD COLUMN IF NOT EXISTS reposted_post_id UUID REFERENCES posts.posts(id);
CREATE INDEX IF NOT EXISTS idx_posts_reposted ON posts.posts(reposted_post_id);
