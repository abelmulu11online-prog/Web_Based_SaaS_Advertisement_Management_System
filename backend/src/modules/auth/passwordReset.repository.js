/**
 * passwordReset.repository.js — Data-access layer for password reset tokens.
 *
 * All SQL queries related to password reset token storage and retrieval.
 * Uses parameterized queries exclusively — never interpolates user input.
 * Separated from email verification tokens for security and maintainability.
 */
import pool from '../../db/index.js'

/**
 * Create a new password reset token.
 * @param {object} data
 * @param {string} data.userId - UUID of the user
 * @param {string} data.tokenHash - SHA-256 hash of the reset token
 * @param {Date} data.expiresAt - Token expiration timestamp
 * @returns {Promise<object>} Created token record
 */
export async function createToken({ userId, tokenHash, expiresAt }) {
  const result = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt],
  )
  return result.rows[0]
}

/**
 * Find a password reset token by its hash.
 * @param {string} tokenHash - SHA-256 hash of the token
 * @returns {Promise<object|null>} Token record or null if not found
 */
export async function findByTokenHash(tokenHash) {
  const result = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at, created_at
     FROM password_reset_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  )
  return result.rows[0] || null
}

/**
 * Find a password reset token by its raw value (fallback for non-hashed tokens).
 * @param {string} token - Raw password reset token
 * @returns {Promise<object|null>} Token record or null if not found
 */
export async function findByRawToken(token) {
  const result = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at, created_at
     FROM password_reset_tokens
     WHERE token_hash = $1`,
    [token],
  )
  return result.rows[0] || null
}

/**
 * Mark a password reset token as used.
 * @param {string} tokenId - UUID of the token
 * @returns {Promise<object>} Updated token record
 */
export async function markAsUsed(tokenId) {
  const result = await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE id = $1
     RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
    [tokenId],
  )
  return result.rows[0]
}

/**
 * Invalidate all unused tokens for a user (when creating a new reset token).
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>} Number of tokens invalidated
 */
export async function invalidateUserTokens(userId) {
  const result = await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > now()`,
    [userId],
  )
  return result.rowCount
}

/**
 * Invalidate all unused tokens for a user (when password is successfully reset).
 * This prevents multiple reset links from remaining usable after one succeeds.
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>} Number of tokens invalidated
 */
export async function invalidateAllUserTokens(userId) {
  const result = await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userId],
  )
  return result.rowCount
}

/**
 * Delete expired tokens (cleanup job).
 * @returns {Promise<number>} Number of tokens deleted
 */
export async function deleteExpiredTokens() {
  const result = await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE expires_at < now()`,
  )
  return result.rowCount
}

/**
 * Find a user's active (unused, not expired) password reset tokens.
 * @param {string} userId - UUID of the user
 * @returns {Promise<object[]>} Array of active token records
 */
export async function findActiveTokensByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, expires_at, created_at
     FROM password_reset_tokens
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows
}
