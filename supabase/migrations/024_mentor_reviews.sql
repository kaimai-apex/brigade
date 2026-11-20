-- Mentor reviews and ratings
--
-- A mentee can review a mentor after a completed session. One review per
-- booking, so a mentor can't be reviewed multiple times for the same session.
-- Reviews are public and displayed on the mentor's profile and card.

CREATE TABLE IF NOT EXISTS mentorship.reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID        NOT NULL UNIQUE REFERENCES mentorship.bookings (id) ON DELETE CASCADE,
  mentor_user_id    UUID        NOT NULL REFERENCES mentorship.mentors (user_id) ON DELETE CASCADE,
  mentee_user_id    UUID        NOT NULL,
  
  -- 1-5 stars
  rating            SMALLINT    NOT NULL,
  
  -- Optional written review
  comment           TEXT,
  
  -- False if the mentee or admin hides it (abusive content, etc.)
  visible           BOOLEAN     NOT NULL DEFAULT true,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_not_self CHECK (mentor_user_id <> mentee_user_id)
);

-- One review per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking ON mentorship.reviews (booking_id);

-- Find all reviews for a mentor
CREATE INDEX IF NOT EXISTS idx_reviews_mentor ON mentorship.reviews (mentor_user_id, created_at DESC)
  WHERE visible = true;

-- Find reviews by a mentee
CREATE INDEX IF NOT EXISTS idx_reviews_mentee ON mentorship.reviews (mentee_user_id, created_at DESC);

-- Materialized view for mentor stats (could be refreshed periodically)
-- For now we'll compute these on-demand, but this shows the intended shape.
CREATE OR REPLACE VIEW mentorship.mentor_review_stats AS
SELECT 
  mentor_user_id,
  COUNT(*)::INT AS review_count,
  AVG(rating)::NUMERIC(3,2) AS avg_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END)::INT AS five_star_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END)::INT AS four_star_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END)::INT AS three_star_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END)::INT AS two_star_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END)::INT AS one_star_count
FROM mentorship.reviews
WHERE visible = true
GROUP BY mentor_user_id;
