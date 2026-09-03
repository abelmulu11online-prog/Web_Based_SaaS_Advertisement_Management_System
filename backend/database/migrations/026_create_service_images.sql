-- 026_create_service_images.sql
-- Image metadata for profile services offered.

CREATE TABLE IF NOT EXISTS service_images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID        NOT NULL REFERENCES profile_services_offered (id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  storage_key TEXT,
  alt_text    TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_images_service_id ON service_images (service_id);
CREATE INDEX IF NOT EXISTS idx_service_images_primary
  ON service_images (service_id)
  WHERE is_primary = TRUE;
