/**
 * auth.service.js — Business logic for authentication.
 * Password hashing, JWT generation, token validation.
 */
import { hashPassword, comparePassword } from '../../utils/password.js'
import { generateToken } from '../../utils/jwt.js'
import { createError } from '../../utils/index.js'
import * as authRepository from './auth.repository.js'
import logger from '../../utils/logger.js'

/**
 * Register a new user.
 * @param {object} data
 * @param {string} data.email
 * @param {string} data.phone
 * @param {string} data.password
 * @returns {Promise<object>} Created user object (safe fields only)
 */
export async function register({ email, phone, password }) {
  // Normalize email to lowercase if provided
  const normalizedEmail = email ? email.toLowerCase().trim() : null
  const normalizedPhone = phone ? phone.replace(/\s/g, '') : null

  // Check for existing user by email
  if (normalizedEmail) {
    const existingByEmail = await authRepository.findByEmail(normalizedEmail)
    if (existingByEmail) {
      throw createError('An account with this email already exists', 409, 'DUPLICATE_EMAIL')
    }
  }

  // Check for existing user by phone
  if (normalizedPhone) {
    const existingByPhone = await authRepository.findByPhone(normalizedPhone)
    if (existingByPhone) {
      throw createError('An account with this phone number already exists', 409, 'DUPLICATE_PHONE')
    }
  }

  // Hash the password
  const passwordHash = await hashPassword(password)

  // Create user with default USER role
  const user = await authRepository.create({
    email: normalizedEmail,
    phone: normalizedPhone,
    passwordHash,
    role: 'USER',
  })

  logger.info({ userId: user.id, email: normalizedEmail }, 'User registered successfully')

  // Return safe user data (no password_hash)
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
  }
}

/**
 * Authenticate a user and return an access token.
 * @param {object} data
 * @param {string} data.identifier - email or phone
 * @param {string} data.password
 * @returns {Promise<object>} { user, accessToken }
 */
export async function login({ identifier, password }) {
  // Find user by identifier (email or phone)
  const user = await authRepository.findByIdentifier(identifier)

  // Generic error for invalid credentials (avoid account enumeration)
  if (!user) {
    throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
  }

  // Check if user has a password (OAuth accounts may not)
  if (!user.password_hash) {
    throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
  }

  // Compare password
  const isPasswordValid = await comparePassword(password, user.password_hash)
  if (!isPasswordValid) {
    throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
  }

  // Check account status
  if (user.status === 'SUSPENDED') {
    throw createError('Account has been suspended', 403, 'ACCOUNT_SUSPENDED')
  }

  if (user.status === 'DELETED') {
    throw createError('Account has been deleted', 403, 'ACCOUNT_DELETED')
  }

  if (user.status !== 'ACTIVE') {
    throw createError('Account is not active', 403, 'ACCOUNT_INACTIVE')
  }

  // Generate access token
  const accessToken = generateToken({
    id: user.id,
    role: user.role,
    status: user.status,
  })

  logger.info({ userId: user.id }, 'User logged in successfully')

  // Return safe user data and token
  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    },
    accessToken,
  }
}

/**
 * Refresh an access token using a refresh token.
 * Note: This is a placeholder for Phase 4.3+ when refresh tokens are implemented.
 * @param {string} _refreshToken
 * @returns {Promise<object>} { accessToken }
 */
export async function refreshToken(_refreshToken) {
  // Placeholder - refresh token storage and validation will be implemented in a later phase
  throw createError('Refresh tokens not yet implemented', 501, 'NOT_IMPLEMENTED')
}

/**
 * Logout a user.
 * Note: This is a placeholder for Phase 4.3+ when token revocation is implemented.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function logout(userId) {
  // Placeholder - token revocation will be implemented in a later phase
  logger.info({ userId }, 'User logged out')
}
