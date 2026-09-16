-- 034_review_replies_notifications.sql
-- Review replies (one reply per review, from the profile owner) + in-app notifications

-- ── Review replies ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_review_replies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID        NOT NULL REFERENCES profile_reviews (id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body        TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id)   -- one reply per review
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON profile_review_replies (review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_author_id ON profile_review_replies (author_id);

-- ── In-app notifications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        TEXT        NOT NULL, -- 'new_review', 'review_reply', 'profile_verified'
  title       TEXT        NOT NULL,
  body        TEXT,
  link        TEXT,                 -- frontend route to navigate to
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications (user_id, is_read) WHERE is_read = FALSE;
