/**
 * auth.repository.js — Data-access layer for auth.
 * All SQL queries related to credential lookup and token storage.
 */
import pool from '../../db/index.js'

/**
 * Find a user by email address.
 * @param {string} email
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function findByEmail(email, dbClient = pool) {
  const result = await dbClient.query(
    'SELECT id, email, phone, password_hash, role, status, created_at, updated_at FROM users WHERE email = $1',
    [email],
  )
  return result.rows[0] || null
}

/**
 * Find a user by phone number.
 * @param {string} phone
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function findByPhone(phone, dbClient = pool) {
  const result = await dbClient.query(
    'SELECT id, email, phone, password_hash, role, status, created_at, updated_at FROM users WHERE phone = $1',
    [phone],
  )
  return result.rows[0] || null
}

/**
 * Find a user by ID.
 * @param {string} id
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function findById(id, dbClient = pool) {
  const result = await dbClient.query(
    'SELECT id, email, phone, password_hash, role, status, created_at, updated_at FROM users WHERE id = $1',
    [id],
  )
  return result.rows[0] || null
}

/**
 * Find a user by either email or phone (for login).
 * @param {string} identifier - email or phone
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function findByIdentifier(identifier, dbClient = pool) {
  const result = await dbClient.query(
    'SELECT id, email, phone, password_hash, role, status, created_at, updated_at FROM users WHERE email = $1 OR phone = $1',
    [identifier],
  )
  return result.rows[0] || null
}

/**
 * Find a user by either email or phone with row lock (for login within transactions).
 * The FOR UPDATE clause locks the row to prevent concurrent modifications.
 * @param {string} identifier - email or phone
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function findByIdentifierForUpdate(identifier, dbClient = pool) {
  const result = await dbClient.query(
    'SELECT id, email, phone, password_hash, role, status, email_verified_at, created_at, updated_at FROM users WHERE email = $1 OR phone = $1 FOR UPDATE',
    [identifier],
  )
  return result.rows[0] || null
}

/**
 * Create a new user.
 * @param {object} userData
 * @param {string} userData.email
 * @param {string} userData.phone
 * @param {string} userData.passwordHash
 * @param {string} userData.role
 * @returns {Promise<object>} Created user object (without password_hash)
 */
export async function create({ email, phone, passwordHash, role }, dbClient = pool) {
  const result = await dbClient.query(
    `INSERT INTO users (email, phone, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'ACTIVE')
     RETURNING id, email, phone, role, status, created_at, updated_at`,
    [email || null, phone || null, passwordHash, role],
  )
  return result.rows[0]
}

/**
 * Update user status.
 * @param {string} id
 * @param {string} status - ACTIVE, SUSPENDED, or DELETED
 * @returns {Promise<object>} Updated user object
 */
export async function updateStatus(id, status, dbClient = pool) {
  const result = await dbClient.query(
    `UPDATE users
     SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING id, email, phone, role, status, created_at, updated_at`,
    [id, status],
  )
  return result.rows[0]
}

/**
 * Update user password hash.
 * @param {string} id
 * @param {string} passwordHash
 * @returns {Promise<object>} Updated user object
 */
export async function updatePassword(id, passwordHash, dbClient = pool) {
  const result = await dbClient.query(
    `UPDATE users
     SET password_hash = $2, updated_at = now()
     WHERE id = $1
     RETURNING id, email, phone, role, status, created_at, updated_at`,
    [id, passwordHash],
  )
  return result.rows[0]
}

/**
 * Mark user's email as verified.
 * @param {string} id
 * @returns {Promise<object>} Updated user object
 */
export async function markEmailVerified(id, dbClient = pool) {
  const result = await dbClient.query(
    `UPDATE users
     SET email_verified_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING id, email, phone, role, status, email_verified_at, created_at, updated_at`,
    [id],
  )
  return result.rows[0]
}

/**
 * Find a user by email including email verification status.
 * @param {string} email
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function findByEmailWithVerification(email, dbClient = pool) {
  const result = await dbClient.query(
    'SELECT id, email, phone, password_hash, role, status, email_verified_at, created_at, updated_at FROM users WHERE email = $1',
    [email],
  )
  return result.rows[0] || null
}
