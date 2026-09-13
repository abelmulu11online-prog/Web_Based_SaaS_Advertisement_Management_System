-- 031_create_profile_posts.sql
-- Professional updates and announcements profiles can publish.
-- NOT casual social media posts — these are business/professional content only.
-- Examples: "New collection available", "Project completed", "Now offering X service"

CREATE TYPE post_type AS ENUM (
  'UPDATE',
  'ANNOUNCEMENT',
  'PROMOTION',
  'ACHIEVEMENT',
  'PROJECT'
);

CREATE TABLE IF NOT EXISTS profile_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning profile
  profile_id      UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Content
  title           TEXT        CHECK (char_length(title) <= 200),
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  post_type       post_type   NOT NULL DEFAULT 'UPDATE',

  -- Visibility
  visibility      TEXT        NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'HIDDEN')),
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_pinned       BOOLEAN     NOT NULL DEFAULT FALSE,   -- one pinned post allowed

  published_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_profile_id ON profile_posts (profile_id);
CREATE INDEX IF NOT EXISTS idx_posts_published  ON profile_posts (profile_id, is_published, published_at DESC)
  WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_pinned     ON profile_posts (profile_id, is_pinned)
  WHERE is_pinned = TRUE;
