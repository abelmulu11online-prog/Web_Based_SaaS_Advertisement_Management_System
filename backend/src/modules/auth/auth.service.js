/**
 * auth.service.js — Business logic for authentication.
 * Password hashing, JWT generation, token validation.
 */
import { hashPassword, comparePassword } from '../../utils/password.js'
import { generateToken } from '../../utils/jwt.js'
import { createError } from '../../utils/index.js'
import * as authRepository from './auth.repository.js'
import { createAndSendVerificationToken } from './verification.service.js'
import { createRefreshTokenForUser } from './refreshToken.service.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'

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

  // Begin a database transaction to atomically create user and (optionally) a verification token
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Create user with default USER role
    const resultUser = await client.query(
      `INSERT INTO users (email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, email, phone, role, status, created_at, updated_at`,
      [normalizedEmail, normalizedPhone, passwordHash, 'USER']
    )
    const user = resultUser.rows[0]

    logger.info({ userId: user.id, email: normalizedEmail }, 'User registered successfully')

    // If email provided, create verification token inside transaction
    if (normalizedEmail) {
      await createAndSendVerificationToken(user.id, normalizedEmail, client).catch(err => {
        logger.warn({ userId: user.id, error: err.message }, 'Failed to send verification email during registration')
      })
    }

    await client.query('COMMIT')
    // Return safe user data (no password_hash)
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error({ error: err.message, stack: err.stack }, 'Registration transaction failed')
    throw err
  } finally {
    client.release()
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
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find user by identifier (email or phone) with row lock to prevent concurrent modifications
    const user = await authRepository.findByIdentifierForUpdate(identifier, client)

    // Generic error for invalid credentials (avoid account enumeration)
    if (!user) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Check if user has a password (OAuth accounts may not)
    if (!user.password_hash) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Check account status — password check comes AFTER status check to avoid timing attacks
    if (user.status === 'SUSPENDED') {
      throw createError('Account has been suspended', 403, 'ACCOUNT_SUSPENDED')
    }

    if (user.status === 'DELETED') {
      throw createError('Account has been deleted', 403, 'ACCOUNT_DELETED')
    }

    if (user.status !== 'ACTIVE') {
      throw createError('Account is not active', 403, 'ACCOUNT_INACTIVE')
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash)

    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Generate access token (stateless JWT)
    const accessToken = generateToken({
      id: user.id,
      role: user.role,
      status: user.status,
    })

    // Generate refresh token
    const { rawToken: refreshToken } = await createRefreshTokenForUser(user.id, client)

    await client.query('COMMIT')
    logger.info({ userId: user.id }, 'User logged in successfully')

    // Return tokens and safe user data
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
      refreshToken,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error({ error: error.message, stack: error.stack }, 'Login error')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Refresh an access token using a refresh token.
 * @param {string} refreshToken - Raw refresh token from client
 * @returns {Promise<object>} { accessToken, refreshToken }
 */
export async function refreshToken(refreshToken) {
  const { refreshAccessToken } = await import('./refreshToken.service.js')
  return refreshAccessToken(refreshToken)
}

/**
 * Logout a user by revoking their refresh token.
 * @param {string} refreshToken - Raw refresh token to revoke
 * @returns {Promise<void>}
 */
export async function logout(refreshToken) {
  const { revokeRefreshToken } = await import('./refreshToken.service.js')
  await revokeRefreshToken(refreshToken)
}
