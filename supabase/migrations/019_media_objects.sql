-- Durable storage for member-uploaded media.
--
-- Uploads used to be written to `apps/web/public/uploads/<user>/<uuid>.jpg` with
-- fs.writeFile. That cannot work on the deployed site: Vercel runs the app on a
-- read-only filesystem, so the write throws EROFS and the member sees "Could not
-- save photo" — and on any host where the write *does* succeed, Next only serves
-- what was in public/ at build time, so the file is unreachable and vanishes on
-- the next deploy. Profile photos have therefore never persisted in production.
--
-- Bytes live in Postgres because Postgres is the one piece of durable storage
-- this app already has in every environment. Avatars are re-encoded to a 512px
-- JPEG (~40 KB) and gallery images are capped, so the volume is small. The
-- read path is a single indexed primary-key lookup behind an immutable
-- Cache-Control, so a given image is fetched from the database roughly once per
-- CDN edge. If that ever stops being true, `media-db.ts` is the only module
-- that needs to change to point at an object store instead.

CREATE TABLE IF NOT EXISTS users.media_objects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID        NOT NULL,
  -- avatar/cover/gallery are public (mentor pages are public pages).
  -- resume is private and served only to its owner.
  kind          TEXT        NOT NULL,
  content_type  TEXT        NOT NULL,
  byte_size     INT         NOT NULL,
  bytes         BYTEA       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT media_objects_kind_check
    CHECK (kind IN ('avatar', 'cover', 'gallery', 'resume')),
  CONSTRAINT media_objects_size_check CHECK (byte_size > 0)
);

-- "Everything this member uploaded, newest first" — the gallery editor's query,
-- and what an account deletion would sweep.
CREATE INDEX IF NOT EXISTS idx_media_objects_owner
  ON users.media_objects (owner_user_id, kind, created_at DESC);
