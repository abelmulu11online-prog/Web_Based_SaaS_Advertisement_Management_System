-- 015_create_advertisement_images.sql
-- Image metadata for advertisement listings.
-- Mirrors the pattern established in 009_create_profile_images.sql.
-- Actual file storage (S3/GCS/local) is a future infrastructure concern.
-- This table stores metadata and URLs only — no binary data in PostgreSQL.

CREATE TABLE IF NOT EXISTS advertisement_images (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning advertisement
  advertisement_id UUID       NOT NULL REFERENCES advertisements (id) ON DELETE CASCADE,

  -- Public URL where the image can be fetched (CDN URL, S3 presigned, or local path)
  image_url       TEXT        NOT NULL,

  -- Internal storage key (S3 object key, GCS path, local filename, etc.)
  -- NULL until storage infrastructure is configured
  storage_key     TEXT,

  -- Accessible description for screen readers / SEO
  alt_text        TEXT,

  -- Display order in the gallery; lower value = appears first
  sort_order      INTEGER     NOT NULL DEFAULT 0,

  -- TRUE for the single image shown as the advertisement cover/thumbnail
  is_primary      BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup of all images belonging to an advertisement
CREATE INDEX IF NOT EXISTS idx_ad_images_advertisement_id
  ON advertisement_images (advertisement_id);

-- Partial index: fast lookup of the primary (cover) image for any advertisement
CREATE INDEX IF NOT EXISTS idx_ad_images_primary
  ON advertisement_images (advertisement_id)
  WHERE is_primary = TRUE;
