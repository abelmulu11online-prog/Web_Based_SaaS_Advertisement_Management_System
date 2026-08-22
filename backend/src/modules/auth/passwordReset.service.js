/**
 * passwordReset.service.js — Business logic for password reset.
 *
 * Handles token creation, validation, and password reset workflow.
 * Separated from auth service for single-responsibility principle.
 * Uses dedicated password reset tokens (separate from email verification).
 */
import { createError } from '../../utils/index.js'
import { generateToken, hashToken, calculateExpiration, isTokenExpired, isTokenUsed } from '../../services/passwordResetToken.service.js'
import { sendPasswordResetEmail } from '../../services/email.service.js'
import { hashPassword } from '../../utils/password.js'
import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'
import * as authRepository from './auth.repository.js'
import * as passwordResetRepository from './passwordReset.repository.js'
import * as refreshTokenRepository from './refreshToken.repository.js'

/**
 * Create and send a password reset token for a user.
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 */
export async function createAndSendPasswordResetToken(email) {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim()
  
  // Find user by email
  const user = await authRepository.findByEmail(normalizedEmail)
  
  // For security, always return the same message regardless of whether user exists
  // This prevents account enumeration attacks
  if (!user) {
    logger.info({ email: normalizedEmail }, 'Password reset requested for unknown email')
    return
  }
  
  // Check account status - deleted accounts should not be recoverable
  if (user.status === 'DELETED') {
    logger.info({ userId: user.id }, 'Password reset requested for deleted account')
    return
  }
  
  // Check account status - suspended accounts follow project policy
  // Allow password reset for suspended accounts (they may need to reset to regain access)
  // If different policy is required, this can be adjusted
  
  // Invalidate any existing unused tokens for this user
  await passwordResetRepository.invalidateUserTokens(user.id)
  
  // Generate secure token
  const rawToken = generateToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = calculateExpiration()
  
  // Store token hash in database
  await passwordResetRepository.createToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  })
  
  // Generate reset URL
  const resetUrl = `${config.frontendUrl}/reset-password?token=${rawToken}`
  
  // Parse expiration for email template
  const expiresIn = config.passwordReset.expiresIn
  const expirationHours = parseInt(expiresIn, 10) || 1
  
  // Send password reset email (non-blocking — don't await SMTP)
  sendPasswordResetEmail({
    to: user.email,
    resetUrl,
    expirationHours,
  }).then(emailSent => {
    if (!emailSent) {
      logger.warn({ userId: user.id }, 'Failed to send password reset email')
    }
  }).catch(err => {
    logger.warn({ userId: user.id, error: err.message }, 'Failed to send password reset email')
  })
  
  logger.info({ userId: user.id }, 'Password reset token created successfully')
}

/**
 * Reset a password using a reset token.
 * @param {string} token - Raw password reset token from request
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export async function resetPassword(token, newPassword) {
  if (!token) {
    throw createError('Password reset token is required', 422, 'MISSING_TOKEN')
  }
  
  if (!newPassword) {
    throw createError('New password is required', 422, 'MISSING_PASSWORD')
  }
  
  // Try hash-based lookup first (normal flow)
  const tokenHash = hashToken(token)
  let tokenRecord = await passwordResetRepository.findByTokenHash(tokenHash)
  
  // Fall back to raw token lookup (for non-hashed tokens)
  if (!tokenRecord) {
    tokenRecord = await passwordResetRepository.findByRawToken(token)
  }
  
  if (!tokenRecord) {
    throw createError('Invalid or expired password reset token', 400, 'INVALID_TOKEN')
  }
  
  // Check if token has been used
  if (isTokenUsed(tokenRecord.used_at)) {
    throw createError('Password reset token has already been used', 400, 'TOKEN_ALREADY_USED')
  }
  
  // Check if token has expired
  if (isTokenExpired(tokenRecord.expires_at)) {
    throw createError('Password reset token has expired', 400, 'TOKEN_EXPIRED')
  }
  
  // Verify user still exists
  const user = await authRepository.findById(tokenRecord.user_id)
  if (!user) {
    throw createError('User not found', 400, 'USER_NOT_FOUND')
  }
  
  // Check account status - deleted accounts should not be recoverable
  if (user.status === 'DELETED') {
    throw createError('Account has been deleted', 403, 'ACCOUNT_DELETED')
  }
  
  // Hash the new password
  const passwordHash = await hashPassword(newPassword)
  
  // Use a transaction to ensure atomicity of password update and token invalidation
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Update user password
    await client.query(
      `UPDATE users
       SET password_hash = $1, updated_at = now()
       WHERE id = $2`,
      [passwordHash, user.id]
    )

    // Invalidate the used token
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = now()
       WHERE id = $1`,
      [tokenRecord.id]
    )

    // Invalidate all other unused tokens for this user (security best practice)
    await client.query(
      `UPDATE password_reset_tokens
       SET used_at = now()
       WHERE user_id = $1
         AND id != $2
         AND used_at IS NULL`,
      [user.id, tokenRecord.id]
    )

    // Revoke all active refresh tokens for this user (security best practice)
    // This prevents previously issued refresh tokens from creating new access tokens after password change
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = now(), updated_at = now()
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [user.id]
    )

    await client.query('COMMIT')

    logger.info({ userId: user.id }, 'Password reset successfully (refresh tokens revoked)')
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error({ userId: user.id, error: err.message }, 'Password reset transaction failed')
    throw createError('Failed to reset password', 500, 'PASSWORD_RESET_FAILED')
  } finally {
    client.release()
  }
}
