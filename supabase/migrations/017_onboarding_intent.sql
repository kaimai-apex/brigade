-- What each side is actually looking for.
--
-- Until now onboarding collected a CV: where you worked, what you studied, what
-- you are good at. That describes a person but says nothing about what they
-- want, so there was nothing to match a mentee to a mentor on beyond job title
-- and city.
--
-- The columns below come in pairs. `skills_wanted` on a member is answered from
-- the same list a mentor answers `expertise` from; `help_wanted` pairs with
-- `help_offered`; `interest_industries` pairs with `industries`. That pairing is
-- the whole point — see lib/onboarding/taxonomy.ts, which is the single list
-- both sides pick from.

-- ---------------------------------------------------------------------------
-- Members: who they are, and what they are here for
-- ---------------------------------------------------------------------------

-- Identity details the profile could not previously hold.
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;

-- IANA name. Needed to say "9:00 for you, 14:00 for them" without guessing, and
-- to rank a mentor in a workable timezone above one twelve hours away.
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS timezone TEXT;

ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}';

-- A band, not a number: someone "just exploring" is not 0 years, and forcing
-- that into an integer loses the distinction that matters most for matching.
-- users.profiles.years_experience already holds the number where it is known.
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT;
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS workplace_type TEXT;

-- Intent. All four are the mentee half of a matching pair.
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS interest_industries TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS skills_wanted TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS goals TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS help_wanted TEXT[] NOT NULL DEFAULT '{}';

-- Free text, in their own words. Not matched on — it is what a mentor reads
-- before the call, and the thing most likely to make them say yes.
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS biggest_challenge TEXT;

ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS preferred_session_minutes INT;
ALTER TABLE users.profiles ADD COLUMN IF NOT EXISTS preferred_mentor_experience TEXT;

ALTER TABLE users.profiles DROP CONSTRAINT IF EXISTS profiles_session_minutes_check;
ALTER TABLE users.profiles
  ADD CONSTRAINT profiles_session_minutes_check
  CHECK (preferred_session_minutes IS NULL OR preferred_session_minutes BETWEEN 15 AND 480);

-- ---------------------------------------------------------------------------
-- Mentors: the other half of every pair
-- ---------------------------------------------------------------------------
--
-- `expertise` already exists (migration 016) and is the mentor's answer to the
-- same question `skills_wanted` asks, so it is NOT duplicated here.

ALTER TABLE mentorship.mentors ADD COLUMN IF NOT EXISTS industries TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE mentorship.mentors ADD COLUMN IF NOT EXISTS help_offered TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE mentorship.mentors ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}';

-- Who they actually want in front of them. A mentor who only wants to help
-- people going private should not be top-ranked for a student.
ALTER TABLE mentorship.mentors ADD COLUMN IF NOT EXISTS mentee_types TEXT[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- Indexes for matching
-- ---------------------------------------------------------------------------
--
-- The matcher scores in application code over a candidate set, so these exist
-- to narrow that set cheaply rather than to rank it.
CREATE INDEX IF NOT EXISTS idx_profiles_skills_wanted
  ON users.profiles USING GIN (skills_wanted);
CREATE INDEX IF NOT EXISTS idx_profiles_interest_industries
  ON users.profiles USING GIN (interest_industries);
CREATE INDEX IF NOT EXISTS idx_mentors_industries
  ON mentorship.mentors USING GIN (industries);
CREATE INDEX IF NOT EXISTS idx_mentors_help_offered
  ON mentorship.mentors USING GIN (help_offered);
CREATE INDEX IF NOT EXISTS idx_mentors_expertise
  ON mentorship.mentors USING GIN (expertise);
