-- 008 — Brigade-native concepts
--
-- Nothing in a microblog helps here, which is exactly why these are the
-- product: endorsements, recommendations, jobs, talent pools, profile views
-- and warm intros.
--
-- Rollback: DROP TABLE brigade.{intro_requests,profile_views,profile_view_daily,
--   talent_pool_items,talent_pools,applications,job_postings,recommendations,
--   endorsements} CASCADE;

-- "Kai endorses Jordan for Product Strategy" — a three-way relation. Note this
-- is NOT the same concept as featured_profiles (006), which is the pin-to-my-
-- profile feature. Reusing one name for both is how you confuse yourself in
-- three months.
CREATE TABLE brigade.endorsements (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  endorser_id   BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  endorsee_id   BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  skill_id      BIGINT      NOT NULL REFERENCES brigade.skills(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endorser_id, endorsee_id, skill_id),
  CONSTRAINT endorsements_no_self CHECK (endorser_id <> endorsee_id)
);

-- Long-form, and only visible once the recipient approves it.
CREATE TABLE brigade.recommendations (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  endorser_id   BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  endorsee_id   BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  relationship  TEXT,
  body          TEXT        NOT NULL,
  requested_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  declined_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_no_self CHECK (endorser_id <> endorsee_id)
);

CREATE TYPE brigade.compensation_type AS ENUM (
  'paid_salary', 'paid_hourly', 'paid_stipend', 'unpaid', 'meals_travel_only'
);

CREATE TABLE brigade.job_postings (
  id                    BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  company_id            BIGINT      NOT NULL REFERENCES brigade.companies(id) ON DELETE CASCADE,
  posted_by_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  job_title_id          BIGINT      REFERENCES brigade.job_titles(id) ON DELETE SET NULL,
  title                 TEXT        NOT NULL,
  description           TEXT        NOT NULL,

  country_code          CHAR(2),
  city                  TEXT,
  remote_policy         TEXT,

  employment_type       TEXT,
  -- Required and non-nullable on purpose. Whether a placement is paid is a
  -- legal question in most jurisdictions, so it is a schema constraint rather
  -- than something buried in the terms of service.
  compensation_type     brigade.compensation_type NOT NULL,
  salary_min            INT,
  salary_max            INT,
  salary_currency       CHAR(3),
  -- An unpaid listing requires the poster to affirm local-law compliance.
  unpaid_compliance_affirmed_at TIMESTAMPTZ,

  -- Only a domain-verified employer can post. Fake job postings are the
  -- highest-volume fraud on a professional network.
  requires_verification BOOLEAN     NOT NULL DEFAULT true,
  published_at          TIMESTAMPTZ,
  closes_at             TIMESTAMPTZ,
  -- Stale listings are worse than no listings.
  expires_at            TIMESTAMPTZ,
  source                TEXT        NOT NULL DEFAULT 'brigade',
  source_url            TEXT,
  external_id           TEXT,
  -- Normalised (title, company, location) hash for cross-source dedupe.
  dedupe_hash           TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT job_postings_unpaid_needs_affirmation
    CHECK (compensation_type NOT IN ('unpaid', 'meals_travel_only')
           OR unpaid_compliance_affirmed_at IS NOT NULL),
  CONSTRAINT job_postings_salary_ordered
    CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

CREATE UNIQUE INDEX job_postings_dedupe
  ON brigade.job_postings (dedupe_hash) WHERE dedupe_hash IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE brigade.applications (
  id              BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  job_posting_id  BIGINT      NOT NULL REFERENCES brigade.job_postings(id) ON DELETE CASCADE,
  profile_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  stage           TEXT        NOT NULL DEFAULT 'applied',
  cover_letter    TEXT,
  resume_url      TEXT,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_posting_id, profile_id),
  CONSTRAINT applications_stage_valid
    CHECK (stage IN ('applied', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'))
);

CREATE TABLE brigade.talent_pools (
  id                BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  owner_profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  description       TEXT,
  -- A saved search, so a pool can be dynamic rather than a static list.
  saved_query       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.talent_pool_items (
  talent_pool_id  BIGINT      NOT NULL REFERENCES brigade.talent_pools(id) ON DELETE CASCADE,
  profile_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  note            TEXT,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (talent_pool_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- Profile views — the firehose.
--
-- Every profile page load is a write, which makes this the first table that
-- will fall over if written naively. The write path is:
--
--   page load → INCR a Redis counter keyed (viewer, viewed, hour)
--   scheduler every 5 min → flush aggregated rows into profile_views
--   beyond 30 days → keep profile_view_daily only, drop the partition
--
-- Partitioned by month so ageing out is DROP PARTITION, not DELETE.
-- ---------------------------------------------------------------------------
CREATE TABLE brigade.profile_views (
  id            BIGINT      NOT NULL DEFAULT brigade.snowflake_id(),
  viewed_id     BIGINT      NOT NULL,
  viewer_id     BIGINT,
  view_count    INT         NOT NULL DEFAULT 1,
  bucket_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (bucket_at, id)
) PARTITION BY RANGE (bucket_at);

CREATE TABLE brigade.profile_views_2026_07 PARTITION OF brigade.profile_views
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE brigade.profile_views_2026_08 PARTITION OF brigade.profile_views
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE brigade.profile_views_2026_09 PARTITION OF brigade.profile_views
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Long-term aggregate, kept after raw partitions are dropped.
CREATE TABLE brigade.profile_view_daily (
  viewed_id     BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  day           DATE        NOT NULL,
  view_count    INT         NOT NULL DEFAULT 0,
  viewer_count  INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (viewed_id, day)
);

-- Warm intro through a mutual connection.
CREATE TABLE brigade.intro_requests (
  id                BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  requester_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  target_id         BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  via_profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  message           TEXT,
  state             TEXT        NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT intro_requests_state_valid
    CHECK (state IN ('pending', 'forwarded', 'accepted', 'declined', 'expired'))
);

-- Suggestions are precomputed nightly, never live. Dismissals are permanent —
-- and are also a training signal, so they are kept rather than deleted.
CREATE TABLE brigade.suggestions (
  profile_id        BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  suggested_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  source            TEXT        NOT NULL,
  score             REAL        NOT NULL DEFAULT 0,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, suggested_id)
);

CREATE TABLE brigade.suggestion_dismissals (
  profile_id        BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  suggested_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  dismissed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, suggested_id)
);

CREATE INDEX ON brigade.endorsements (endorsee_id, skill_id);
CREATE INDEX ON brigade.recommendations (endorsee_id) WHERE approved_at IS NOT NULL;
CREATE INDEX ON brigade.job_postings (company_id, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ON brigade.job_postings (expires_at) WHERE deleted_at IS NULL;
CREATE INDEX ON brigade.applications (profile_id, applied_at DESC);
CREATE INDEX ON brigade.applications (job_posting_id, stage);
CREATE INDEX ON brigade.talent_pool_items (profile_id);
CREATE INDEX ON brigade.profile_views (viewed_id, bucket_at DESC);
CREATE INDEX ON brigade.intro_requests (via_profile_id, state);
CREATE INDEX ON brigade.suggestions (profile_id, score DESC);

CREATE TRIGGER touch_job_postings BEFORE UPDATE ON brigade.job_postings
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();
