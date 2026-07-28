-- 007 — Posts and content
--
-- Rollback: DROP TABLE brigade.{post_tags,tags,bookmarks,reactions,mentions,
--   attachments,post_edits,post_stats,posts} CASCADE;

CREATE TYPE brigade.post_visibility AS ENUM ('public', 'connections', 'unlisted', 'direct');

CREATE TABLE brigade.posts (
  id              BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  text            TEXT        NOT NULL DEFAULT '',
  visibility      brigade.post_visibility NOT NULL DEFAULT 'public',
  language        TEXT,

  in_reply_to_id  BIGINT      REFERENCES brigade.posts(id) ON DELETE SET NULL,
  -- The thread root, denormalised so fetching a conversation is one indexed
  -- query rather than a recursive walk.
  conversation_id BIGINT,
  reblog_of_id    BIGINT      REFERENCES brigade.posts(id) ON DELETE CASCADE,

  -- Posting as a company page: the author is a person, the voice is the
  -- company. Authorised via company_admins (004).
  as_company_id   BIGINT      REFERENCES brigade.companies(id) ON DELETE SET NULL,

  sensitive       BOOLEAN     NOT NULL DEFAULT false,
  spoiler_text    TEXT,
  edited_at       TIMESTAMPTZ,
  published_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT posts_reblog_has_no_text
    CHECK (reblog_of_id IS NULL OR in_reply_to_id IS NULL)
);

CREATE TABLE brigade.post_stats (
  post_id         BIGINT PRIMARY KEY REFERENCES brigade.posts(id) ON DELETE CASCADE,
  replies_count   INT         NOT NULL DEFAULT 0,
  reshares_count  INT         NOT NULL DEFAULT 0,
  reactions_count INT         NOT NULL DEFAULT 0,
  bookmarks_count INT         NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.post_edits (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  post_id       BIGINT      NOT NULL REFERENCES brigade.posts(id) ON DELETE CASCADE,
  text          TEXT        NOT NULL,
  spoiler_text  TEXT,
  edited_by     BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PDFs are first class here in a way they are not for a microblog: portfolios,
-- resumes and case studies are the attachments that matter.
CREATE TABLE brigade.attachments (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  post_id       BIGINT      REFERENCES brigade.posts(id) ON DELETE CASCADE,
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  preview_url   TEXT,
  blurhash      TEXT,
  description   TEXT,
  file_name     TEXT,
  byte_size     BIGINT,
  content_type  TEXT,
  width         INT,
  height        INT,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attachments_type_valid
    CHECK (type IN ('image', 'video', 'audio', 'document'))
);

CREATE TABLE brigade.mentions (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  post_id     BIGINT      NOT NULL REFERENCES brigade.posts(id) ON DELETE CASCADE,
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id)
);

-- One reaction per profile per post; changing type is an UPDATE, so the
-- aggregate count never double-counts.
CREATE TABLE brigade.reactions (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  post_id     BIGINT      NOT NULL REFERENCES brigade.posts(id) ON DELETE CASCADE,
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'like',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id),
  CONSTRAINT reactions_type_valid
    CHECK (type IN ('like', 'celebrate', 'support', 'love', 'insightful', 'funny'))
);

CREATE TABLE brigade.bookmarks (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  post_id     BIGINT      REFERENCES brigade.posts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, post_id)
);

-- Freeform post topics. Deliberately separate from skills (004): tags are
-- user-created and messy, skills are curated. Two systems, different jobs.
CREATE TABLE brigade.tags (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  name          CITEXT      NOT NULL UNIQUE,
  usage_count   INT         NOT NULL DEFAULT 0,
  listable      BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.post_tags (
  post_id     BIGINT      NOT NULL REFERENCES brigade.posts(id) ON DELETE CASCADE,
  tag_id      BIGINT      NOT NULL REFERENCES brigade.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Read-position sync across devices, per timeline.
CREATE TABLE brigade.read_markers (
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  timeline      TEXT        NOT NULL,
  last_read_id  BIGINT      NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, timeline)
);

CREATE TABLE brigade.notifications (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  from_profile_id BIGINT    REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  post_id       BIGINT      REFERENCES brigade.posts(id) ON DELETE CASCADE,
  -- Everything else the notification needs to render, so the read path is one
  -- query with no polymorphic joins.
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  read_at       TIMESTAMPTZ,
  -- Notifications from strangers land here for review instead of the main
  -- list, so filtering can be added without touching call sites.
  filtered      BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON brigade.posts (profile_id, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX ON brigade.posts (conversation_id, id) WHERE deleted_at IS NULL;
CREATE INDEX ON brigade.posts (in_reply_to_id) WHERE in_reply_to_id IS NOT NULL;
CREATE INDEX ON brigade.posts (reblog_of_id) WHERE reblog_of_id IS NOT NULL;
CREATE INDEX ON brigade.posts (as_company_id, id DESC) WHERE as_company_id IS NOT NULL;
CREATE INDEX ON brigade.reactions (post_id);
CREATE INDEX ON brigade.mentions (profile_id);
CREATE INDEX ON brigade.attachments (post_id);
CREATE INDEX ON brigade.notifications (profile_id, id DESC) WHERE filtered = false;
CREATE INDEX ON brigade.notifications (profile_id) WHERE read_at IS NULL;

CREATE TRIGGER touch_posts BEFORE UPDATE ON brigade.posts
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();

CREATE OR REPLACE FUNCTION brigade.create_post_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO brigade.post_stats (post_id) VALUES (NEW.id)
    ON CONFLICT (post_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_post_stats AFTER INSERT ON brigade.posts
  FOR EACH ROW EXECUTE FUNCTION brigade.create_post_stats();
