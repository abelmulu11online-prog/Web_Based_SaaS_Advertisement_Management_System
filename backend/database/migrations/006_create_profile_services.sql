-- 006_create_profile_services.sql
-- Many-to-many join table: Profile ↔ Services.
-- A profile (e.g. a plumber) can offer multiple services.
-- A service can be offered by many profiles.

CREATE TABLE IF NOT EXISTS profile_services (
  profile_id  UUID        NOT NULL REFERENCES profiles  (id) ON DELETE CASCADE,
  service_id  UUID        NOT NULL REFERENCES services  (id) ON DELETE CASCADE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (profile_id, service_id)
);

-- The PK already covers profile_id lookups efficiently.
-- Add a covering index for the reverse direction (service → profiles).
CREATE INDEX IF NOT EXISTS idx_profile_services_service_id ON profile_services (service_id);
