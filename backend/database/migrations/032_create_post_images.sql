-- 032_create_post_images.sql
-- Image metadata for profile posts.

CREATE TABLE IF NOT EXISTS post_images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES profile_posts (id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  storage_key TEXT,
  alt_text    TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images (post_id);
CREATE INDEX IF NOT EXISTS idx_post_images_primary
  ON post_images (post_id)
  WHERE is_primary = TRUE;
