-- 007_create_business_hours.sql
-- Normal weekly working hours for a provider.
-- Stores one row per day (Monday–Sunday) per profile.
-- Availability logic (real-time, exceptions, holidays) is a future feature.

CREATE TABLE IF NOT EXISTS business_hours (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  profile_id  UUID        NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,

  -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday  (ISO: 1=Mon … 7=Sun)
  -- We use 0-6 (Sunday-based) consistent with JavaScript's Date.getDay()
  -- to keep backend and frontend in sync without conversion.
  day_of_week SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),

  -- NULL when is_closed = TRUE (stored for clarity but not enforced here;
  -- application layer validates consistency)
  opens_at    TIME,
  closes_at   TIME,

  -- TRUE means closed all day regardless of opens_at / closes_at
  is_closed   BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Each profile has at most one row per weekday
  UNIQUE (profile_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_profile_id ON business_hours (profile_id);
