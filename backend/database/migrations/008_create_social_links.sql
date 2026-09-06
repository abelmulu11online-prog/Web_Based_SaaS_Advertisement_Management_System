-- 008_create_social_links.sql
-- Social media and contact links for a provider profile.
-- Normalized: one row per platform per profile, not one column per platform.
-- Adding a new platform requires no schema change.

CREATE TABLE IF NOT EXISTS social_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  profile_id  UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- Enum-like TEXT with CHECK constraint.
  -- Add new values here as the platform grows.
  platform    TEXT        NOT NULL CHECK (platform IN (
    'FACEBOOK',
    'INSTAGRAM',
    'TELEGRAM',
    'WHATSAPP',
    'TIKTOK',
    'LINKEDIN',
    'YOUTUBE',
    'TWITTER',
    'SNAPCHAT',
    'OTHER'
  )),

  -- Full URL (e.g. https://instagram.com/my_shop)
  url         TEXT        NOT NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per platform per profile
  UNIQUE (profile_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_links_profile_id ON social_links (profile_id);
