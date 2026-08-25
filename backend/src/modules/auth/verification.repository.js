/**
 * verification.repository.js — Data-access layer for email verification tokens.
 *
 * All SQL queries related to email verification token storage and retrieval.
 * Uses parameterized queries exclusively — never interpolates user input.
 */
import pool from '../../db/index.js'

/**
 * Create a new email verification token.
 * @param {object} data
 * @param {string} data.userId - UUID of the user
 * @param {string} data.tokenHash - SHA-256 hash of the verification token
 * @param {Date} data.expiresAt - Token expiration timestamp
 * @returns {Promise<object>} Created token record
 */
export async function createToken({ userId, tokenHash, expiresAt }, dbClient = pool) {
  const result = await dbClient.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt],
  )
  return result.rows[0]
}

/**
 * Find a verification token by its hash.
 * @param {string} tokenHash - SHA-256 hash of the token
 * @returns {Promise<object|null>} Token record or null if not found
 */
export async function findByTokenHash(tokenHash) {
  const result = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at, created_at
     FROM email_verification_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  )
  return result.rows[0] || null
}

/**
 * Find a verification token by its raw value (fallback for non-hashed tokens).
 * @param {string} token - Raw verification token
 * @returns {Promise<object|null>} Token record or null if not found
 */
export async function findByRawToken(token) {
  const result = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at, created_at
     FROM email_verification_tokens
     WHERE token_hash = $1`,
    [token],
  )
  return result.rows[0] || null
}

/**
 * Mark a verification token as used.
 * @param {string} tokenId - UUID of the token
 * @returns {Promise<object>} Updated token record
 */
export async function markAsUsed(tokenId) {
  const result = await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = now()
     WHERE id = $1
     RETURNING id, user_id, token_hash, expires_at, used_at, created_at`,
    [tokenId],
  )
  return result.rows[0]
}

/**
 * Invalidate all unused tokens for a user (for resend functionality).
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>} Number of tokens invalidated
 */
export async function invalidateUserTokens(userId) {
  const result = await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = now()
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > now()`,
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
    `DELETE FROM email_verification_tokens
     WHERE expires_at < now()`,
  )
  return result.rowCount
}

/**
 * Find a user's active (unused, not expired) verification tokens.
 * @param {string} userId - UUID of the user
 * @returns {Promise<object[]>} Array of active token records
 */
export async function findActiveTokensByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, expires_at, created_at
     FROM email_verification_tokens
     WHERE user_id = $1
       AND used_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC`,
    [userId],
  )
  return result.rows
}
