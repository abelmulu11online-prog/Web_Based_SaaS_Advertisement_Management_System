-- 033_create_profile_reviews.sql
-- Public ratings for provider profiles. One review per visitor per profile.

CREATE TABLE IF NOT EXISTS profile_reviews (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID          NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  reviewer_user_id  UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating            SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT          CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 2000),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (profile_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_profile_id ON profile_reviews (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer   ON profile_reviews (reviewer_user_id);
