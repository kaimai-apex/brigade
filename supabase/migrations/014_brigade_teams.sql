-- Named teams assembled from a member's accepted connections ("My Brigades").
--
-- These lived in localStorage, which meant they were not really saved: they
-- vanished on a browser clear, never followed anyone to a second device, and
-- were invisible to the server. Anything the product calls "your trusted teams"
-- has to outlive a cache flush.
--
-- Lives in the connections schema because a team is relationship data — it is
-- only ever made of people you are already connected to.

CREATE TABLE IF NOT EXISTS connections.brigade_teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brigade_teams_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_brigade_teams_owner
  ON connections.brigade_teams (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS connections.brigade_team_members (
  team_id   UUID NOT NULL REFERENCES connections.brigade_teams (id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One row per person per team; adding twice is a no-op, not a duplicate.
  PRIMARY KEY (team_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_brigade_team_members_member
  ON connections.brigade_team_members (member_id);
