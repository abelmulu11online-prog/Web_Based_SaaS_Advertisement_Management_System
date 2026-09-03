-- 014_create_advertisements.sql
-- Advertisement listings — the core entity of Phase 5.
-- Advertisers create listings for products, services, skills, jobs, businesses, etc.
-- Customers browse/search listings and contact advertisers directly (no in-platform transactions).

-- ── Advertisement status enum ─────────────────────────────────────────────────
-- Lifecycle: DRAFT → PUBLISHED ↔ PAUSED → EXPIRED | ARCHIVED

CREATE TYPE advertisement_status AS ENUM (
  'DRAFT',       -- created, not visible publicly; advertiser can edit freely
  'PUBLISHED',   -- publicly visible; customers can discover it
  'PAUSED',      -- temporarily hidden by advertiser; still owned, not deleted
  'EXPIRED',     -- past expiry date; no longer publicly visible
  'ARCHIVED'     -- intentionally archived by advertiser; no longer publicly visible
);

-- ── Price type enum ───────────────────────────────────────────────────────────
CREATE TYPE price_type AS ENUM (
  'FIXED',           -- exact price given
  'NEGOTIABLE',      -- price is open to negotiation
  'CONTACT_FOR_PRICE', -- price on request
  'FREE'             -- no charge
);

-- ── Main advertisements table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advertisements (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning user (advertiser)
  -- CASCADE: deleting a user removes their advertisements
  user_id         UUID                  NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- Content
  title           TEXT                  NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description     TEXT                  NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),

  -- Category link — RESTRICT: cannot delete a category that has active ads
  category_id     UUID                  REFERENCES categories (id) ON DELETE RESTRICT,

  -- Pricing (nullable — advertiser may choose not to show a price)
  price           NUMERIC(12, 2)        CHECK (price IS NULL OR price >= 0),
  price_type      price_type            NOT NULL DEFAULT 'FIXED',

  -- Contact information (may differ from user account credentials)
  contact_phone   TEXT,
  contact_email   TEXT,

  -- Lifecycle
  status          advertisement_status  NOT NULL DEFAULT 'DRAFT',
  published_at    TIMESTAMPTZ,          -- set when status transitions to PUBLISHED
  expires_at      TIMESTAMPTZ,          -- optional; when set, job will mark as EXPIRED

  -- Location (stored directly on the advertisement for per-listing granularity)
  -- latitude/longitude use the same WGS-84 NUMERIC(10,7) convention as the locations table
  latitude        NUMERIC(10, 7)        CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
  longitude       NUMERIC(10, 7)        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  address         TEXT,                 -- human-readable location description

  created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now()
);

-- ── Core indexes ───────────────────────────────────────────────────────────────

-- Advertiser's own listing lookups
CREATE INDEX IF NOT EXISTS idx_ads_user_id        ON advertisements (user_id);

-- Public browsing (only PUBLISHED ads are returned to anonymous users)
CREATE INDEX IF NOT EXISTS idx_ads_status         ON advertisements (status);
CREATE INDEX IF NOT EXISTS idx_ads_published      ON advertisements (status, published_at DESC)
  WHERE status = 'PUBLISHED';

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_ads_category_id    ON advertisements (category_id);

-- Price range filtering
CREATE INDEX IF NOT EXISTS idx_ads_price          ON advertisements (price) WHERE price IS NOT NULL;

-- Location-based future search preparation
CREATE INDEX IF NOT EXISTS idx_ads_lat_lng        ON advertisements (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Expiry checks (for automated expiry jobs in later phases)
CREATE INDEX IF NOT EXISTS idx_ads_expires_at     ON advertisements (expires_at)
  WHERE expires_at IS NOT NULL AND status = 'PUBLISHED';

-- Full-text search index on title + description (used for ILIKE search in Phase 5,
-- can be upgraded to tsvector-based GIN index in a later phase without migration changes here)
CREATE INDEX IF NOT EXISTS idx_ads_title          ON advertisements USING gin (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_ads_description    ON advertisements USING gin (to_tsvector('english', description));
