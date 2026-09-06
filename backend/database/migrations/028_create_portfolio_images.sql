-- 028_create_portfolio_images.sql
-- Image metadata for portfolio items.

CREATE TABLE IF NOT EXISTS portfolio_images (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_item_id UUID        NOT NULL REFERENCES portfolio_items (id) ON DELETE CASCADE,
  image_url         TEXT        NOT NULL,
  storage_key       TEXT,
  alt_text          TEXT,
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  is_primary        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_item_id ON portfolio_images (portfolio_item_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_primary
  ON portfolio_images (portfolio_item_id)
  WHERE is_primary = TRUE;
