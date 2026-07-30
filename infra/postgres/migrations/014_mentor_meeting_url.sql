-- A mentor's standing meeting room (their Zoom/Meet/Whereby link).
--
-- Copied onto each booking when the mentor accepts it, rather than referenced
-- live: a mentor who changes their room next year must not silently rewrite the
-- link on a session that already happened.

ALTER TABLE mentorship.mentors
  ADD COLUMN IF NOT EXISTS default_meeting_url TEXT;
