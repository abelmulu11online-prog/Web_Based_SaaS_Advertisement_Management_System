/**
 * passwordResetToken.service.js — Password reset token service.
 *
 * Handles secure token generation, hashing, and validation for password reset.
 * Uses cryptographic randomness and one-way hashing for security.
 * Separated from email verification tokens for security and maintainability.
 */
import { createHash } from 'node:crypto'
import { randomBytes } from 'node:crypto'
import { config } from '../config/index.js'

// ── Token Generation ───────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random password reset token.
 * Uses 32 bytes (256 bits) of randomness, hex-encoded (64 characters).
 * @returns {string} Raw password reset token
 */
export function generateToken() {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a password reset token using SHA-256 for secure storage.
 * Never store the raw token in the database.
 * @param {string} token - Raw password reset token
 * @returns {string} SHA-256 hash of the token
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Calculate password reset token expiration timestamp.
 * Uses PASSWORD_RESET_EXPIRES_IN configuration.
 * @returns {Date} Expiration timestamp
 */
export function calculateExpiration() {
  const expiresIn = config.passwordReset.expiresIn
  
  // Parse expiration string (e.g., '1h', '30m')
  const match = expiresIn.match(/^(\d+)([hm])$/)
  if (!match) {
    throw new Error(`Invalid PASSWORD_RESET_EXPIRES_IN format: ${expiresIn}`)
  }
  
  const value = parseInt(match[1], 10)
  const unit = match[2]
  
  const now = new Date()
  
  if (unit === 'h') {
    now.setHours(now.getHours() + value)
  } else if (unit === 'm') {
    now.setMinutes(now.getMinutes() + value)
  }
  
  return now
}

// ── Token Validation ─────────────────────────────────────────────────────────

/**
 * Validate a password reset token against stored hash.
 * @param {object} options
 * @param {string} options.token - Raw token from request
 * @param {string} options.tokenHash - Hash stored in database
 * @returns {boolean} True if token matches hash
 */
export function validateTokenHash({ token, tokenHash }) {
  const computedHash = hashToken(token)
  return computedHash === tokenHash
}

/**
 * Check if a password reset token has expired.
 * @param {Date} expiresAt - Token expiration timestamp
 * @returns {boolean} True if token is expired
 */
export function isTokenExpired(expiresAt) {
  return new Date() > new Date(expiresAt)
}

/**
 * Check if a password reset token has been used.
 * @param {Date|null} usedAt - Timestamp when token was used
 * @returns {boolean} True if token has been used
 */
export function isTokenUsed(usedAt) {
  return usedAt !== null
}
