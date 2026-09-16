-- 001_create_users.sql
-- Stores account/authentication identity.
-- Intentionally has no password logic — that lives in application code.

CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- At least one of email / phone is expected, but we allow partial
  -- registration flows (e.g. phone-only or email-only sign-up).
  email         TEXT          UNIQUE,
  phone         TEXT          UNIQUE,

  -- NULL only for OAuth/social accounts that have no local password
  password_hash TEXT,

  role          TEXT          NOT NULL DEFAULT 'USER'
                CHECK (role IN ('USER', 'ADMIN')),

  status        TEXT          NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),

  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Ensure every user has at least one contact identifier
  CONSTRAINT users_has_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for fast lookup during login / uniqueness checks
CREATE INDEX IF NOT EXISTS idx_users_email  ON users (email)  WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone  ON users (phone)  WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users (role);
