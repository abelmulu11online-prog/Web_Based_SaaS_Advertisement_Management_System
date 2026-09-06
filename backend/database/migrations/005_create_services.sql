-- 005_create_services.sql
-- Specific services that providers can offer.
-- Linked to a category and associated with profiles via profile_services.
-- Examples: Pipe Repair, Screen Replacement, Portrait Photography

CREATE TABLE IF NOT EXISTS services (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category this service belongs to
  category_id UUID        NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,

  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,

  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services (category_id);
CREATE INDEX IF NOT EXISTS idx_services_slug        ON services (slug);
CREATE INDEX IF NOT EXISTS idx_services_is_active   ON services (is_active);
