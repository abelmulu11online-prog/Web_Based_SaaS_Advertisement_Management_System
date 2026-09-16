-- 012_create_password_reset_tokens.sql
-- Stores password reset tokens with security features
-- Tokens are hashed, time-limited, and single-use
-- Separated from email verification tokens for security and maintainability

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to the user requesting password reset
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  
  -- SHA-256 hash of the password reset token (never store raw token)
  token_hash  TEXT        NOT NULL,
  
  -- Expiration time for security (short-lived by design)
  expires_at  TIMESTAMPTZ NOT NULL,
  
  -- When the token was successfully used (null if unused)
  used_at     TIMESTAMPTZ,
  
  -- Audit timestamp
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookup by hash
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens (token_hash);

-- Index for finding tokens by user_id
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

-- Index for finding unused tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used_at ON password_reset_tokens (used_at) WHERE used_at IS NULL;

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
  ON password_reset_tokens (expires_at);

-- Ensure one active token per user (optional - depends on requirements)
-- Commented out to allow multiple reset requests which may create multiple tokens
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_user_active_unique 
--   ON password_reset_tokens (user_id) 
--   WHERE used_at IS NULL AND expires_at > now();
