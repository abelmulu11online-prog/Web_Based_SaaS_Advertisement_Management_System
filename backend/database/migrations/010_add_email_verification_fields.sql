-- 010_add_email_verification_fields.sql
-- Add email verification timestamp to users table
-- This allows tracking when a user's email was verified without changing the status field

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Add index for queries on verified emails
CREATE INDEX IF NOT EXISTS idx_users_email_verified_at ON users (email_verified_at) WHERE email_verified_at IS NOT NULL;
