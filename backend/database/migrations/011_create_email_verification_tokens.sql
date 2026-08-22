-- 011_create_email_verification_tokens.sql
-- Stores email verification tokens with security features
-- Tokens are hashed, time-limited, and single-use

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to the user being verified
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  
  -- SHA-256 hash of the verification token (never store raw token)
  token_hash  TEXT        NOT NULL,
  
  -- Expiration time for security
  expires_at  TIMESTAMPTZ NOT NULL,
  
  -- When the token was successfully used (null if unused)
  used_at     TIMESTAMPTZ,
  
  -- Audit timestamp
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookup by hash
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash ON email_verification_tokens (token_hash);

-- Index for finding tokens by user_id
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);

-- Index for finding unused tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_used_at ON email_verification_tokens (used_at) WHERE used_at IS NULL;

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at 
  ON email_verification_tokens (expires_at);

-- Ensure one active token per user (optional - depends on requirements)
-- Commented out to allow resend functionality which may create multiple tokens
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_tokens_user_active_unique 
--   ON email_verification_tokens (user_id) 
--   WHERE used_at IS NULL AND expires_at > now();
