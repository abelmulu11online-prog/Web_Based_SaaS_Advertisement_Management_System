-- 013_create_refresh_tokens.sql
-- Stores refresh tokens for obtaining new access tokens.
-- Tokens are stored as SHA-256 hashes only - raw tokens are never persisted.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL,
  token_hash    TEXT          NOT NULL,
  expires_at    TIMESTAMPTZ   NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Index for fast token lookup during refresh
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
  ON refresh_tokens (token_hash);

-- Index for user-based queries (e.g., revoking all user tokens)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id);

-- Index for finding active (non-revoked) tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at
  ON refresh_tokens (revoked_at)
  WHERE revoked_at IS NULL;

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens (expires_at);

-- Prevent duplicate token hashes for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_user_token_unique
  ON refresh_tokens (user_id, token_hash);
