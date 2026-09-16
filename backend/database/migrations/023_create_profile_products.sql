-- 023_create_profile_products.sql
-- Products that a SHOP or BUSINESS profile can list directly on their profile.
-- Each product belongs to one profile and can have multiple images.

CREATE TYPE product_condition   AS ENUM ('NEW', 'USED', 'REFURBISHED');
CREATE TYPE product_availability AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'DISCONTINUED');

CREATE TABLE IF NOT EXISTS profile_products (
  id              UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning profile
  profile_id      UUID                   NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Product identity
  title           TEXT                   NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT                   CHECK (char_length(description) <= 5000),

  -- Categorisation
  category_id     UUID                   REFERENCES categories (id) ON DELETE SET NULL,

  -- Pricing
  price           NUMERIC(12, 2)         CHECK (price IS NULL OR price >= 0),
  currency        TEXT                   NOT NULL DEFAULT 'ETB',
  price_type      price_type             NOT NULL DEFAULT 'FIXED',

  -- Product details
  brand           TEXT,
  condition       product_condition,
  availability    product_availability   NOT NULL DEFAULT 'IN_STOCK',

  -- Discovery
  tags            TEXT[],
  is_featured     BOOLEAN                NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN                NOT NULL DEFAULT FALSE,
  sort_order      INTEGER                NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ            NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_profile_id   ON profile_products (profile_id);
CREATE INDEX IF NOT EXISTS idx_products_published    ON profile_products (profile_id, is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_featured     ON profile_products (profile_id, is_featured)  WHERE is_featured  = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_category_id  ON profile_products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_title_fts    ON profile_products USING gin (to_tsvector('english', title));
