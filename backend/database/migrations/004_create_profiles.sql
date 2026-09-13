-- 004_create_profiles.sql
-- Public provider/business profile. The core entity of the platform.
-- One user may have one primary profile for the MVP.
-- A profile can represent: an individual, a shop, a business, or a service provider.

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owning user account
  user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,

  -- Display identity
  display_name    TEXT        NOT NULL,

  -- URL-safe unique identifier used in public URLs: /p/{slug}
  slug            TEXT        NOT NULL UNIQUE,

  -- Long-form description of what the provider offers
  description     TEXT,

  -- Primary category (required for discovery)
  -- RESTRICT: deleting a category must not silently wipe profiles
  category_id     UUID        REFERENCES categories (id) ON DELETE RESTRICT,

  -- Geographic location
  -- SET NULL: a profile can temporarily have no location
  location_id     UUID        REFERENCES locations (id) ON DELETE SET NULL,

  -- Public contact details (may differ from user account credentials)
  contact_phone   TEXT,
  contact_email   TEXT,
  website_url     TEXT,

  -- Visibility controls
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id    ON profiles (user_id);
CREATE INDEX       IF NOT EXISTS idx_profiles_slug        ON profiles (slug);
CREATE INDEX       IF NOT EXISTS idx_profiles_category_id ON profiles (category_id);
CREATE INDEX       IF NOT EXISTS idx_profiles_location_id ON profiles (location_id);

-- Discovery indexes — these will power the search/filter queries later
CREATE INDEX IF NOT EXISTS idx_profiles_is_published ON profiles (is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified  ON profiles (is_verified)  WHERE is_verified  = TRUE;
