-- 004 — Controlled vocabulary
--
-- Skills, companies, titles and institutions are entities, not strings on a
-- profile. If "JavaScript", "Javascript", "JS" and "ECMAScript" are four
-- skills then search, filtering and recruiter queries all degrade permanently,
-- and de-duplicating later means touching every profile.
--
-- Every canonical table gets an alias table. That is the whole point.
--
-- Rollback: DROP TABLE brigade.{institutions,job_title_aliases,job_titles,
--   industries,skill_aliases,skills,company_aliases,companies} CASCADE;

CREATE TABLE brigade.industries (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  name        TEXT        NOT NULL UNIQUE,
  slug        CITEXT      NOT NULL UNIQUE,
  parent_id   BIGINT      REFERENCES brigade.industries(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companies must be entities or you can never answer "who else works here" and
-- can never link a profile to a company page.
CREATE TABLE brigade.companies (
  id                    BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  name                  TEXT        NOT NULL,
  slug                  CITEXT      NOT NULL UNIQUE,
  domain                CITEXT,
  domain_verified_at    TIMESTAMPTZ,
  industry_id           BIGINT      REFERENCES brigade.industries(id) ON DELETE SET NULL,
  size                  TEXT,
  founded_year          SMALLINT,
  description           TEXT,
  logo_url              TEXT,
  country_code          CHAR(2),
  city                  TEXT,

  -- A claimed company gets a company-type profile (003) with no user.
  claimed_by_profile_id BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  profile_id            BIGINT      UNIQUE REFERENCES brigade.profiles(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  merged_into_id        BIGINT      REFERENCES brigade.companies(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX companies_domain_unique
  ON brigade.companies (domain) WHERE domain IS NOT NULL AND merged_into_id IS NULL;

CREATE TABLE brigade.company_aliases (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  company_id  BIGINT      NOT NULL REFERENCES brigade.companies(id) ON DELETE CASCADE,
  alias       CITEXT      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alias)
);

-- Profiles authorised to act as a company. The employer-side growth loop:
-- a domain-verified company admin can confirm employees (tier 3 verification).
CREATE TABLE brigade.company_admins (
  company_id  BIGINT      NOT NULL REFERENCES brigade.companies(id) ON DELETE CASCADE,
  profile_id  BIGINT      NOT NULL REFERENCES brigade.profiles(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'admin',
  granted_by  BIGINT      REFERENCES brigade.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, profile_id)
);

CREATE TABLE brigade.skills (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  name          TEXT        NOT NULL UNIQUE,
  slug          CITEXT      NOT NULL UNIQUE,
  category      TEXT,
  usage_count   INT         NOT NULL DEFAULT 0,
  curated       BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.skill_aliases (
  id          BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  skill_id    BIGINT      NOT NULL REFERENCES brigade.skills(id) ON DELETE CASCADE,
  alias       CITEXT      NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.job_titles (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  name          TEXT        NOT NULL UNIQUE,
  slug          CITEXT      NOT NULL UNIQUE,
  seniority     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.job_title_aliases (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  job_title_id  BIGINT      NOT NULL REFERENCES brigade.job_titles(id) ON DELETE CASCADE,
  alias         CITEXT      NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brigade.institutions (
  id            BIGINT PRIMARY KEY DEFAULT brigade.snowflake_id(),
  name          TEXT        NOT NULL,
  slug          CITEXT      NOT NULL UNIQUE,
  country_code  CHAR(2),
  domain        CITEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON brigade.companies USING gin (name gin_trgm_ops);
CREATE INDEX ON brigade.skills USING gin (name gin_trgm_ops);
CREATE INDEX ON brigade.institutions USING gin (name gin_trgm_ops);
CREATE INDEX ON brigade.companies (industry_id);

CREATE TRIGGER touch_companies BEFORE UPDATE ON brigade.companies
  FOR EACH ROW EXECUTE FUNCTION brigade.touch_updated_at();
