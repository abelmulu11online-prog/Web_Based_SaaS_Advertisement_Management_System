/**
 * refreshToken.service.js — Refresh token generation and validation utilities.
 *
 * Handles cryptographic token generation, hashing, expiration calculation,
 * and validation for refresh tokens.
 */
import crypto from 'node:crypto'
import { config } from '../config/index.js'

/**
 * Generate a cryptographically secure random refresh token.
 * Uses 32 bytes (256 bits) of randomness, hex-encoded (64 characters).
 * @returns {string} Raw refresh token (64 hex characters)
 */
export function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a refresh token using SHA-256.
 * @param {string} token - Raw refresh token
 * @returns {string} SHA-256 hash (64 hex characters)
 */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Calculate the expiration timestamp for a refresh token.
 * @returns {Date} Expiration timestamp
 */
export function calculateRefreshTokenExpiration() {
  const expiresIn = config.refreshToken.expiresIn
  const now = new Date()
  const expiresAt = new Date(now.getTime() + parseExpiration(expiresIn))
  return expiresAt
}

/**
 * Parse expiration string (e.g., '7d', '24h', '30m') to milliseconds.
 * @param {string} expiresIn - Expiration string
 * @returns {number} Milliseconds
 */
function parseExpiration(expiresIn) {
  const match = expiresIn.match(/^(\d+)([dhm])$/)
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiresIn}`)
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'm':
      return value * 60 * 1000
    default:
      throw new Error(`Invalid expiration unit: ${unit}`)
  }
}

/**
 * Check if a refresh token is expired.
 * @param {Date} expiresAt - Expiration timestamp
 * @returns {boolean} True if expired
 */
export function isRefreshTokenExpired(expiresAt) {
  return new Date(expiresAt) < new Date()
}

/**
 * Check if a refresh token is revoked.
 * @param {Date|null} revokedAt - Revocation timestamp
 * @returns {boolean} True if revoked
 */
export function isRefreshTokenRevoked(revokedAt) {
  return revokedAt !== null
}
