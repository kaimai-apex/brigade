-- LinkedIn-style reactions: extend the binary like into 6 reaction types.
-- Idempotent — safe to re-run.
ALTER TABLE posts.likes
  ADD COLUMN IF NOT EXISTS reaction TEXT NOT NULL DEFAULT 'like';
-- guard the vocabulary (drop+recreate so re-runs don't error)
ALTER TABLE posts.likes DROP CONSTRAINT IF EXISTS likes_reaction_chk;
ALTER TABLE posts.likes ADD CONSTRAINT likes_reaction_chk
  CHECK (reaction IN ('like','celebrate','support','love','insightful','funny'));
