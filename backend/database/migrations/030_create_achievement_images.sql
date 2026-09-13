-- 030_create_achievement_images.sql
-- Image metadata for profile achievements (e.g. certificate scans, award photos).

CREATE TABLE IF NOT EXISTS achievement_images (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id  UUID        NOT NULL REFERENCES profile_achievements (id) ON DELETE CASCADE,
  image_url       TEXT        NOT NULL,
  storage_key     TEXT,
  alt_text        TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievement_images_id ON achievement_images (achievement_id);
