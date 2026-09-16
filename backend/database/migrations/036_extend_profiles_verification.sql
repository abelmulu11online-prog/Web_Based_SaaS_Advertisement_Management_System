-- 036_extend_profiles_verification.sql
-- Extends the profiles table with business/legal verification fields.
-- Adds new verification_status enum values for the full approval workflow.
-- All changes are additive (ADD COLUMN / ALTER TYPE) — existing rows are unaffected.

-- ── Extend the verification_status enum ──────────────────────────────────────
-- PostgreSQL requires each ADD VALUE to be a separate statement.
-- We guard with DO blocks to avoid errors if values already exist.

DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'ACTIVE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Business / legal verification fields ─────────────────────────────────────
-- These fields are collected only for profile types that require verification:
-- SHOP, BUSINESS, COMPANY, ORGANIZATION

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_type       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_number      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_issue_date  DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_expiry_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address    TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_city       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_region     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_country    TEXT;

-- Free-text field where the user describes what their business/organization does,
-- lists services, provides additional context for the admin reviewer.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS additional_information TEXT;

-- ── Admin review tracking ─────────────────────────────────────────────────────

-- The admin user who performed the most recent review action
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES users (id) ON DELETE SET NULL;

-- Timestamp of the most recent review action (approve / reject / suspend)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;

-- Rejection reason text — shown to the user so they know what to fix
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ── Publishing tracking ────────────────────────────────────────────────────────

-- When the profile owner explicitly clicked "Publish Profile"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS published_at   TIMESTAMPTZ;

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Fast query for admin review queue (profiles awaiting review)
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status
  ON profiles (verification_status);

-- Fast lookup of all profiles that are published AND active
-- Used by the public search / directory queries
CREATE INDEX IF NOT EXISTS idx_profiles_published_active
  ON profiles (is_published, verification_status)
  WHERE is_published = TRUE;
