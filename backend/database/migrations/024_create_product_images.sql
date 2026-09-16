-- 024_create_product_images.sql
-- Image metadata for profile products.
-- Mirrors the structure of advertisement_images and profile_images.

CREATE TABLE IF NOT EXISTS product_images (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES profile_products (id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  storage_key TEXT,
  alt_text    TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary
  ON product_images (product_id)
  WHERE is_primary = TRUE;
