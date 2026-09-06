-- 021_extend_profiles.sql
-- Extends the profiles table with all fields needed for public advertising profiles.
-- All changes are additive (ADD COLUMN) — existing rows and APIs are unaffected.

-- ── Profile type enum ─────────────────────────────────────────────────────────
CREATE TYPE profile_type AS ENUM (
  'PERSONAL',
  'PROFESSIONAL',
  'FREELANCER',
  'SHOP',
  'BUSINESS',
  'COMPANY',
  'ORGANIZATION'
);

-- ── Verification status enum ──────────────────────────────────────────────────
CREATE TYPE verification_status AS ENUM (
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

-- ── Visibility enum ───────────────────────────────────────────────────────────
CREATE TYPE contact_visibility AS ENUM (
  'PUBLIC',
  'LOGGED_IN',
  'HIDDEN'
);

-- ── Extend profiles table ─────────────────────────────────────────────────────

-- Profile type (what kind of entity this profile represents)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_type  profile_type  NOT NULL DEFAULT 'PERSONAL';

-- Public headline / tagline (professional title, shop tagline, etc.)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS headline      TEXT          CHECK (char_length(headline) <= 150);

-- Avatar image (stored directly as URL + storage key for fast reads)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT;

-- Cover / banner image
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_storage_key  TEXT;

-- Inline location fields (no FK dependency — mirrors advertisements pattern)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city               TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area               TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude           NUMERIC(10, 7) CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude          NUMERIC(10, 7) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

-- Controls how precisely the location is shown publicly
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_precision TEXT NOT NULL DEFAULT 'CITY'
  CHECK (location_precision IN ('CITY', 'DISTRICT', 'FULL'));

-- Direct contact quick-links (WhatsApp and Telegram are dominant in Ethiopia)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp           TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username  TEXT;

-- Contact visibility controls
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_visibility   contact_visibility NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_visibility   contact_visibility NOT NULL DEFAULT 'PUBLIC';

-- Verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED';

-- Profile completion score (0–100, computed and cached on each profile update)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completion_score   INTEGER NOT NULL DEFAULT 0
  CHECK (completion_score BETWEEN 0 AND 100);

-- ── Extend social_links platform CHECK constraint ─────────────────────────────
-- Add GITHUB and WEBSITE to the allowed platform values.
-- We drop the old constraint and recreate it with the new values.
ALTER TABLE social_links DROP CONSTRAINT IF EXISTS social_links_platform_check;
ALTER TABLE social_links ADD CONSTRAINT social_links_platform_check
  CHECK (platform IN (
    'FACEBOOK', 'INSTAGRAM', 'TELEGRAM', 'WHATSAPP',
    'TIKTOK', 'LINKEDIN', 'YOUTUBE', 'TWITTER',
    'SNAPCHAT', 'GITHUB', 'WEBSITE', 'OTHER'
  ));

-- ── Indexes for new fields ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_profile_type ON profiles (profile_type);
CREATE INDEX IF NOT EXISTS idx_profiles_city         ON profiles (city)    WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_country      ON profiles (country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_lat_lng      ON profiles (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
