/**
 * verification.service.js — Business logic for email verification.
 *
 * Handles token creation, validation, and email verification workflow.
 * Separated from auth service for single-responsibility principle.
 */
import { createError } from '../../utils/index.js'
import { generateToken, hashToken, calculateExpiration, isTokenExpired, isTokenUsed } from '../../services/verificationToken.service.js'
import { sendVerificationEmail } from '../../services/email.service.js'
import { config } from '../../config/index.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'
import * as authRepository from './auth.repository.js'
import * as verificationRepository from './verification.repository.js'

/**
 * Create and send a verification token for a user.
 * @param {string} userId - UUID of the user
 * @param {string} email - User's email address
 * @returns {Promise<boolean>} True if email sent successfully
 */
export async function createAndSendVerificationToken(userId, email, dbClient = pool) {
  // Generate secure token
  const rawToken = generateToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = calculateExpiration()
  
  // Store token hash in database
  await verificationRepository.createToken({
    userId,
    tokenHash,
    expiresAt,
  }, dbClient)
  
  // Generate verification URL
  const verificationUrl = `${config.frontendUrl}/verify-email?token=${rawToken}`
  
  // Parse expiration for email template
  const expiresIn = config.emailVerification.expiresIn
  const expirationHours = parseInt(expiresIn, 10) || 24
  
  // Send verification email (non-blocking — don't await SMTP)
  sendVerificationEmail({
    to: email,
    verificationUrl,
    expirationHours,
  }).then(emailSent => {
    if (!emailSent) {
      logger.warn({ userId }, 'Failed to send verification email')
    }
  }).catch(err => {
    logger.warn({ userId, error: err.message }, 'Failed to send verification email')
  })
  
  return true
}

/**
 * Verify an email using a verification token.
 * @param {string} token - Raw verification token from request
 * @returns {Promise<object>} Verification result
 */
export async function verifyEmail(token) {
  if (!token) {
    throw createError('Verification token is required', 422, 'MISSING_TOKEN')
  }
  
  // Try hash-based lookup first (normal flow)
  const tokenHash = hashToken(token)
  let tokenRecord = await verificationRepository.findByTokenHash(tokenHash)
  
  // Fall back to raw token lookup (for non-hashed tokens)
  if (!tokenRecord) {
    tokenRecord = await verificationRepository.findByRawToken(token)
  }
  
  if (!tokenRecord) {
    throw createError('Invalid or expired verification token', 400, 'INVALID_TOKEN')
  }
  
  // Check if token has been used
  if (isTokenUsed(tokenRecord.used_at)) {
    // In development, React StrictMode fires useEffect twice, so the token
    // gets consumed on the first call and the second call sees it as used.
    // Also handles the case where the user clicks the link more than once.
    // If the user's email is already verified, treat this as a success.
    const user = await authRepository.findById(tokenRecord.user_id)
    if (user && user.email_verified_at) {
      logger.info({ userId: user.id }, 'Token already used but email is verified — treating as success')
      return {
        userId: user.id,
        email: user.email,
        emailVerifiedAt: user.email_verified_at,
      }
    }
    throw createError('Verification token has already been used', 400, 'TOKEN_ALREADY_USED')
  }
  
  // Check if token has expired
  if (isTokenExpired(tokenRecord.expires_at)) {
    throw createError('Verification token has expired', 400, 'TOKEN_EXPIRED')
  }
  
  // Verify user still exists
  const user = await authRepository.findById(tokenRecord.user_id)
  if (!user) {
    throw createError('User not found', 400, 'USER_NOT_FOUND')
  }
  
  // Mark token as used
  await verificationRepository.markAsUsed(tokenRecord.id)
  
  // Mark user's email as verified
  await authRepository.markEmailVerified(user.id)
  
  logger.info({ userId: user.id }, 'Email verified successfully')
  
  return {
    userId: user.id,
    email: user.email,
    emailVerifiedAt: new Date(),
  }
}

/**
 * Resend a verification email to a user.
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 */
export async function resendVerificationEmail(email) {
  // Find user by email
  const user = await authRepository.findByEmailWithVerification(email)
  
  // For security, always return the same message regardless of whether user exists
  if (!user) {
    logger.info({ email }, 'Resend verification requested for unknown email')
    return
  }
  
  // Check if email is already verified
  if (user.email_verified_at) {
    logger.info({ userId: user.id }, 'Resend verification requested for already verified email')
    return
  }
  
  // Invalidate any existing unused tokens for this user
  await verificationRepository.invalidateUserTokens(user.id)
  
  // Create and send new verification token (non-critical — don't fail if this errors)
  try {
    await createAndSendVerificationToken(user.id, user.email)
  } catch (err) {
    logger.warn({ userId: user.id, error: err.message }, 'Failed to create/send new verification token during resend')
  }
  
  logger.info({ userId: user.id }, 'Verification email resent successfully')
}
