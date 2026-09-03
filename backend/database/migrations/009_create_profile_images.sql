-- 009_create_profile_images.sql
-- Image metadata for provider profiles.
-- Stores URLs and storage keys; actual file handling is a future feature.
-- Multiple images per profile; one may be marked as primary.

CREATE TABLE IF NOT EXISTS profile_images (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  profile_id    UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Public URL where the image can be fetched
  image_url     TEXT        NOT NULL,

  -- Internal storage key (S3 key, GCS path, local filename, etc.)
  -- NULL until storage is implemented
  storage_key   TEXT,

  -- Accessible description for screen readers
  alt_text      TEXT,

  -- Display order; lower = earlier in gallery
  sort_order    INTEGER     NOT NULL DEFAULT 0,

  -- TRUE for the single image shown as the profile cover/avatar
  is_primary    BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_images_profile_id ON profile_images (profile_id);

-- Partial index: fast lookup of the primary image for any profile
CREATE INDEX IF NOT EXISTS idx_profile_images_primary
  ON profile_images (profile_id)
  WHERE is_primary = TRUE;
