/**
 * refreshToken.service.js — Business logic for refresh token operations.
 *
 * Handles refresh token creation, validation, rotation, and revocation.
 * This is the service layer that uses the repository and token utilities.
 */
import { createError } from '../../utils/index.js'
import { generateToken } from '../../utils/jwt.js'
import { generateRefreshToken, hashRefreshToken, calculateRefreshTokenExpiration, isRefreshTokenExpired, isRefreshTokenRevoked } from '../../services/refreshToken.service.js'
import * as authRepository from './auth.repository.js'
import * as refreshTokenRepository from './refreshToken.repository.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'

/**
 * Create a refresh token for a user and return the raw token.
 * @param {string} userId - User UUID
 * @returns {Promise<{rawToken: string, expiresAt: Date}>} Raw token and expiration
 */
export async function createRefreshTokenForUser(userId, dbClient = pool) {
  // Generate cryptographically secure token
  const rawToken = generateRefreshToken()
  const tokenHash = hashRefreshToken(rawToken)
  const expiresAt = calculateRefreshTokenExpiration()

  // Store token hash in database
  await refreshTokenRepository.createRefreshToken({
    userId,
    tokenHash,
    expiresAt,
  }, dbClient)

  logger.info({ userId }, 'Refresh token created successfully')

  return { rawToken, expiresAt }
}

/**
 * Refresh an access token using a refresh token.
 * Implements token rotation: old token is revoked, new token is issued.
 * @param {string} rawRefreshToken - Raw refresh token from client
 * @returns {Promise<{accessToken: string, refreshToken: string}>} New tokens
 */
export async function refreshAccessToken(rawRefreshToken) {
  // Hash the supplied token for database lookup
  const tokenHash = hashRefreshToken(rawRefreshToken)

  // Find the token in database
  const tokenRecord = await refreshTokenRepository.findActiveRefreshTokenByHash(tokenHash)

  if (!tokenRecord) {
    logger.warn({}, 'Refresh token not found or invalid')
    throw createError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN')
  }

  // Get the user associated with this token
  const user = await authRepository.findById(tokenRecord.user_id)

  if (!user) {
    logger.warn({ userId: tokenRecord.user_id }, 'User not found for refresh token')
    throw createError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN')
  }

  // Check account status
  if (user.status === 'SUSPENDED') {
    logger.warn({ userId: user.id }, 'Suspended account attempted to refresh token')
    throw createError('Account has been suspended', 403, 'ACCOUNT_SUSPENDED')
  }

  if (user.status === 'DELETED') {
    logger.warn({ userId: user.id }, 'Deleted account attempted to refresh token')
    throw createError('Account has been deleted', 403, 'ACCOUNT_DELETED')
  }

  if (user.status !== 'ACTIVE') {
    logger.warn({ userId: user.id, status: user.status }, 'Inactive account attempted to refresh token')
    throw createError('Account is not active', 403, 'ACCOUNT_INACTIVE')
  }

  // Begin transaction: revoke old token, create new token
  // This ensures atomicity - if anything fails, the transaction rolls back
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Revoke the old refresh token
    await refreshTokenRepository.revokeRefreshToken(tokenRecord.id, client)

    // Generate new access token
    const accessToken = generateToken({
      id: user.id,
      role: user.role,
      status: user.status,
    })

    // Generate new refresh token
    const { rawToken: newRefreshToken } = await createRefreshTokenForUser(user.id, client)

    await client.query('COMMIT')
    logger.info({ userId: user.id }, 'Token refreshed successfully')

    return {
      accessToken,
      refreshToken: newRefreshToken,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error({ error, userId: user.id }, 'Error during token refresh')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Revoke a refresh token (logout).
 * @param {string} rawRefreshToken - Raw refresh token to revoke
 * @returns {Promise<void>}
 */
export async function revokeRefreshToken(rawRefreshToken) {
  const tokenHash = hashRefreshToken(rawRefreshToken)

  // Find the token
  const tokenRecord = await refreshTokenRepository.findRefreshTokenByHash(tokenHash)

  if (!tokenRecord) {
    // Token doesn't exist - this is safe, just return
    // Don't reveal whether the token existed or not
    logger.info({}, 'Logout attempted with non-existent token')
    return
  }

  // Revoke the token if it's not already revoked
  if (!isRefreshTokenRevoked(tokenRecord.revoked_at)) {
    await refreshTokenRepository.revokeRefreshToken(tokenRecord.id)
    logger.info({ userId: tokenRecord.user_id }, 'Refresh token revoked successfully')
  }
}

/**
 * Revoke all refresh tokens for a user (e.g., after password reset).
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Number of tokens revoked
 */
export async function revokeAllUserRefreshTokens(userId) {
  const count = await refreshTokenRepository.revokeAllActiveUserRefreshTokens(userId)
  logger.info({ userId, count }, 'All user refresh tokens revoked')
  return count
}
