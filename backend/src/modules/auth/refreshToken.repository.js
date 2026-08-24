/**
 * refreshToken.repository.js — Data-access layer for refresh tokens.
 * All SQL queries related to refresh token storage and management.
 */
import pool from '../../db/index.js'

/**
 * Create a new refresh token.
 * @param {object} tokenData
 * @param {string} tokenData.userId - User UUID
 * @param {string} tokenData.tokenHash - SHA-256 hash of the refresh token
 * @param {Date} tokenData.expiresAt - Token expiration timestamp
 * @returns {Promise<object>} Created token record
 */
export async function createRefreshToken({ userId, tokenHash, expiresAt }, dbClient = pool) {
  const result = await dbClient.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at`,
    [userId, tokenHash, expiresAt],
  )
  return result.rows[0]
}

/**
 * Find a refresh token by its hash.
 * @param {string} tokenHash - SHA-256 hash of the refresh token
 * @returns {Promise<object|null>} Token record or null if not found
 */
export async function findRefreshTokenByHash(tokenHash, dbClient = pool) {
  try {
    const result = await dbClient.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    )
    return result.rows[0] || null
  } catch (error) {
    if (error.code === '42P01') { // relation does not exist
      return null
    }
    throw error
  }
}

/**
 * Find an active (non-revoked, non-expired) refresh token by its hash.
 * @param {string} tokenHash - SHA-256 hash of the refresh token
 * @returns {Promise<object|null>} Token record or null if not found
 */
export async function findActiveRefreshTokenByHash(tokenHash, dbClient = pool) {
  try {
    const result = await dbClient.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at
       FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [tokenHash],
    )
    return result.rows[0] || null
  } catch (error) {
    if (error.code === '42P01') { // relation does not exist
      return null
    }
    throw error
  }
}

/**
 * Revoke a refresh token by its ID.
 * @param {string} tokenId - UUID of the token
 * @returns {Promise<object>} Updated token record
 */
export async function revokeRefreshToken(tokenId, dbClient = pool) {
  try {
    const result = await dbClient.query(
      `UPDATE refresh_tokens
       SET revoked_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at`,
      [tokenId],
    )
    return result.rows[0]
  } catch (error) {
    if (error.code === '42P01') { // relation does not exist
      return null
    }
    throw error
  }
}

/**
 * Revoke all refresh tokens for a user.
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>} Number of tokens revoked
 */
export async function revokeAllUserRefreshTokens(userId, dbClient = pool) {
  try {
    const result = await dbClient.query(
      `UPDATE refresh_tokens
       SET revoked_at = now(), updated_at = now()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId],
    )
    return result.rowCount
  } catch (error) {
    if (error.code === '42P01') { // relation does not exist
      return 0
    }
    throw error
  }
}

/**
 * Revoke all active (non-revoked, non-expired) refresh tokens for a user.
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>} Number of tokens revoked
 */
export async function revokeAllActiveUserRefreshTokens(userId, dbClient = pool) {
  try {
    const result = await dbClient.query(
      `UPDATE refresh_tokens
       SET revoked_at = now(), updated_at = now()
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [userId],
    )
    return result.rowCount
  } catch (error) {
    if (error.code === '42P01') { // relation does not exist
      return 0
    }
    throw error
  }
}

/**
 * Delete expired refresh tokens (cleanup operation).
 * @returns {Promise<number>} Number of tokens deleted
 */
export async function deleteExpiredRefreshTokens(dbClient = pool) {
  try {
    const result = await dbClient.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < now()`,
    )
    return result.rowCount
  } catch (error) {
    if (error.code === '42P01') { // relation does not exist
      return 0
    }
    throw error
  }
}

/**
 * Count active refresh tokens for a user.
 * @param {string} userId - UUID of the user
 * @returns {Promise<number>} Number of active tokens
 */
export async function countActiveRefreshTokens(userId, dbClient = pool) {
  try {
    const result = await dbClient.query(
      `SELECT COUNT(*) FROM refresh_tokens
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [userId],
    )
    return parseInt(result.rows[0].count, 10)
  } catch (error) {
    if (error.code === '42P01') { // relation does not exist
      return 0
    }
    throw error
  }
}
