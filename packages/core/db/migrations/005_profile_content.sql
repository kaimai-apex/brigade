-- 005 — Structured profile content
--
-- In a microblog the timeline is the product and the account is thin. Here the
-- profile IS the product: a structured document of experience, education,
-- credentials and skills. That is why these are real tables with real foreign
-- keys into the controlled vocabulary (004) rather than JSON blobs.
--
-- experiences.verified_at is the differentiator. See 09-phase-5.
--
-- Rollback: DROP TABLE brigade.{profile_languages,publications,projects,
--   certifications,profile_skills,educations,experiences} CASCADE;

CREATE TYPE brigade.verification_method AS ENUM (
  'corporate_email',   -- tier 1: round-trip to an @company domain
  'rel_me_backlink',   -- tier 2: backlink from a company staff page
  'company_admin',     -- tier 3: a domain-verified company admin confirmed it
  'third_party'        -- tier 4: payroll/HR verification API
);

CREATE TABLE brigade.experiences (
  id                  BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id          BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  company_id          BIGINT      REFERENCES brigade.companies(id) ON DELETE SET NULL,
  -- Kept alongside company_id so an unmatched employer is still displayable
  -- while it waits to be resolved to a canonical company.
  company_name        TEXT        NOT NULL,
  job_title_id        BIGINT      REFERENCES brigade.job_titles(id) ON DELETE SET NULL,
  title               TEXT        NOT NULL,

  employment_type     TEXT,
  location            TEXT,
  country_code        CHAR(2),
  remote              BOOLEAN     NOT NULL DEFAULT false,

  start_date          DATE        NOT NULL,
  end_date            DATE,
  is_current          BOOLEAN     NOT NULL DEFAULT false,
  description         TEXT,

  -- The product. Verification expires: someone verified at Acme in 2024 may
  -- have left, so current roles are re-verified periodically and past roles
  -- are marked verified-as-of-date.
  verified_at         TIMESTAMPTZ,
  verification_method brigade.verification_method,
  verification_expires_at TIMESTAMPTZ,
  verified_by_profile_id BIGINT   REFERENCES brigade.profiles(id) ON DELETE SET NULL,

  position            SMALLINT    NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT experiences_dates_ordered
    CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT experiences_current_has_no_end
    CHECK (NOT is_current OR end_date IS NULL),
  CONSTRAINT experiences_verified_has_method
    CHECK (verified_at IS NULL OR verification_method IS NOT NULL)
);

CREATE TABLE brigade.educations (
  id              BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  institution_id  BIGINT      REFERENCES brigade.institutions(id) ON DELETE SET NULL,
  institution_name TEXT       NOT NULL,
  degree          TEXT,
  field_of_study  TEXT,
  start_date      DATE,
  end_date        DATE,
  grade           TEXT,
  description     TEXT,
  position        SMALLINT    NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.certifications (
  id              BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id      BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  issuer          TEXT        NOT NULL,
  credential_id   TEXT,
  credential_url  TEXT,
  issued_at       DATE,
  expires_at      DATE,
  verified_at     TIMESTAMPTZ,
  position        SMALLINT    NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table carrying its own data — endorsement counts and self-reported
-- years are properties of the pairing, not of the skill.
CREATE TABLE brigade.profile_skills (
  id                BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id        BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  skill_id          BIGINT      NOT NULL REFERENCES brigade.skills(id) ON DELETE CASCADE,
  endorsement_count INT         NOT NULL DEFAULT 0,
  years_experience  SMALLINT,
  position          SMALLINT    NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, skill_id)
);

CREATE TABLE brigade.projects (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  url         TEXT,
  start_date  DATE,
  end_date    DATE,
  position    SMALLINT    NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.publications (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  publisher     TEXT,
  url           TEXT,
  published_at  DATE,
  description   TEXT,
  position      SMALLINT    NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.profile_languages (
  profile_id    BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  language_code TEXT        NOT NULL,
  proficiency   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, language_code)
);

CREATE INDEX ON brigade.experiences (profile_id, position);
CREATE INDEX ON brigade.educations (profile_id, position);
CREATE INDEX ON brigade.certifications (profile_id);
CREATE INDEX ON brigade.projects (profile_id);
CREATE INDEX ON brigade.publications (profile_id);

CREATE TRIGGER touch_experiences BEFORE UPDATE ON brigade.experiences
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();
