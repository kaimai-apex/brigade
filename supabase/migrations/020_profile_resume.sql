-- The long-form resume, and the specialties that go with it.
--
-- `about` is a short summary that renders in a directory card, so it cannot
-- also be the place a chef writes out fifteen years of kitchens. This is the
-- full narrative: what they have done, what they do now, who they have cooked
-- for. It sits alongside the structured rows in users.experience rather than
-- replacing them — chefs write a resume as prose, but the directory needs to
-- filter on discrete jobs and dates, and neither form derives from the other.

ALTER TABLE users.profiles
  ADD COLUMN IF NOT EXISTS resume_text TEXT;

-- users.experience already exists (migration 002) but never carried the two
-- things a hospitality resume is actually read for.

-- "Sous Chef, 2019–2022" is the row; "Michelin one-star, 40 covers a night,
-- ran the pass on weekends" is what makes it mean something.
ALTER TABLE users.experience
  ADD COLUMN IF NOT EXISTS highlights TEXT;

-- A private chef's history is a mix of restaurants, yachts, households and
-- one-off events. Which kind it was changes how the line reads.
ALTER TABLE users.experience
  ADD COLUMN IF NOT EXISTS employment_type TEXT;

-- Ordering a resume by start_date alone puts a current role below an older one
-- whenever the dates are vague, which on a chef's resume they often are.
CREATE INDEX IF NOT EXISTS idx_experience_user_dates
  ON users.experience (user_id, start_date DESC NULLS LAST);
