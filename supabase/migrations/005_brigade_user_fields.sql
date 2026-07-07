-- Brigade hospitality fields on ConnectPro user profiles (users schema)
ALTER TABLE users.profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS current_position TEXT,
  ADD COLUMN IF NOT EXISTS current_employer TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience INT,
  ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_to_opportunities BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_private_events BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_contract_work BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_emergency_staffing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Chef';

CREATE TABLE IF NOT EXISTS users.portfolio_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_links_user ON users.portfolio_links(user_id);

CREATE TABLE IF NOT EXISTS users.profile_work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_photos_user ON users.profile_work_photos(user_id);
