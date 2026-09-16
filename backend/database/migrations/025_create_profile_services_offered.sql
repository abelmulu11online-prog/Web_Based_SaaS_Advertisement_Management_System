-- 025_create_profile_services_offered.sql
-- Custom services that any profile type can advertise.
-- This is PROFILE-OWNED content, distinct from the platform-level `services` catalog
-- (which is used for discovery tagging via profile_services join table).
-- A freelancer, professional, or company creates their own service listings here.

CREATE TYPE service_pricing_type   AS ENUM ('FIXED', 'STARTING_FROM', 'HOURLY', 'NEGOTIABLE', 'CONTACT_FOR_PRICE');
CREATE TYPE service_availability   AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'BY_APPOINTMENT');

CREATE TABLE IF NOT EXISTS profile_services_offered (
  id              UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning profile
  profile_id      UUID                   NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Service identity
  title           TEXT                   NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT                   CHECK (char_length(description) <= 5000),

  -- Categorisation
  category_id     UUID                   REFERENCES categories (id) ON DELETE SET NULL,

  -- Pricing
  price_from      NUMERIC(12, 2)         CHECK (price_from IS NULL OR price_from >= 0),
  currency        TEXT                   NOT NULL DEFAULT 'ETB',
  pricing_type    service_pricing_type   NOT NULL DEFAULT 'CONTACT_FOR_PRICE',

  -- Delivery
  location        TEXT,   -- e.g. "Remote", "Gondar", "On-site"
  availability    service_availability   NOT NULL DEFAULT 'AVAILABLE',

  -- Discovery
  tags            TEXT[],
  is_featured     BOOLEAN                NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN                NOT NULL DEFAULT FALSE,
  sort_order      INTEGER                NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ            NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pso_profile_id  ON profile_services_offered (profile_id);
CREATE INDEX IF NOT EXISTS idx_pso_published   ON profile_services_offered (profile_id, is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_pso_featured    ON profile_services_offered (profile_id, is_featured)  WHERE is_featured  = TRUE;
CREATE INDEX IF NOT EXISTS idx_pso_category_id ON profile_services_offered (category_id);
