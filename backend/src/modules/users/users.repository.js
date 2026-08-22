/**
 * users.repository.js — Data-access layer for profiles & business details.
 *
 * All SQL queries related to profiles, business hours, and social links.
 * Uses parameterized queries exclusively — never interpolates user input.
 *
 * Repository responsibilities: database access, SQL, CRUD operations.
 * Does NOT contain: HTTP logic, JWT, password hashing, authorization, workflow.
 */
import pool from '../../db/index.js'

// ── Profile queries ───────────────────────────────────────────────────────────

/**
 * Find a profile by user_id, including category and location names.
 * @param {string} userId - UUID of the owning user
 * @returns {Promise<object|null>} Profile row with joined data or null
 */
export async function findProfileByUserId(userId) {
  const result = await pool.query(
    `SELECT
       p.id, p.user_id, p.display_name, p.slug, p.description,
       p.category_id, p.location_id,
       p.contact_phone, p.contact_email, p.website_url,
       p.is_published, p.is_verified,
       p.created_at, p.updated_at,
       c.name  AS category_name,
       c.slug  AS category_slug,
       l.city  AS location_city,
       l.region AS location_region,
       l.country AS location_country
     FROM profiles p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN locations  l ON p.location_id = l.id
     WHERE p.user_id = $1`,
    [userId],
  )
  return result.rows[0] || null
}

/**
 * Find a profile by its slug (for uniqueness checks).
 * @param {string} slug
 * @returns {Promise<object|null>} Profile row or null
 */
export async function findProfileBySlug(slug) {
  const result = await pool.query(
    'SELECT id, slug FROM profiles WHERE slug = $1',
    [slug],
  )
  return result.rows[0] || null
}

/**
 * Create a new profile.
 * @param {object} data
 * @returns {Promise<object>} Created profile row
 */
export async function createProfile({
  userId,
  displayName,
  slug,
  description,
  categoryId,
  locationId,
  contactPhone,
  contactEmail,
  websiteUrl,
  isPublished,
}) {
  const result = await pool.query(
    `INSERT INTO profiles (
       user_id, display_name, slug, description,
       category_id, location_id,
       contact_phone, contact_email, website_url,
       is_published
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING
       id, user_id, display_name, slug, description,
       category_id, location_id,
       contact_phone, contact_email, website_url,
       is_published, is_verified,
       created_at, updated_at`,
    [
      userId,
      displayName,
      slug,
      description || null,
      categoryId || null,
      locationId || null,
      contactPhone || null,
      contactEmail || null,
      websiteUrl || null,
      isPublished ?? false,
    ],
  )
  return result.rows[0]
}

/**
 * Update a profile by user_id.
 * Builds the SET clause dynamically from provided fields.
 * @param {string} userId - UUID of the owning user
 * @param {object} fields - Key-value pairs of fields to update
 * @returns {Promise<object|null>} Updated profile row or null if not found
 */
export async function updateProfile(userId, fields) {
  const allowedFields = [
    'display_name',
    'slug',
    'description',
    'category_id',
    'location_id',
    'contact_phone',
    'contact_email',
    'website_url',
    'is_published',
  ]

  const setClauses = []
  const values = []
  let paramIndex = 1

  for (const key of allowedFields) {
    if (key in fields) {
      setClauses.push(`${key} = $${paramIndex}`)
      values.push(fields[key])
      paramIndex++
    }
  }

  if (setClauses.length === 0) {
    return null
  }

  // Add updated_at
  setClauses.push(`updated_at = now()`)

  // Add userId as the last parameter
  values.push(userId)

  const result = await pool.query(
    `UPDATE profiles
     SET ${setClauses.join(', ')}
     WHERE user_id = $${paramIndex}
     RETURNING
       id, user_id, display_name, slug, description,
       category_id, location_id,
       contact_phone, contact_email, website_url,
       is_published, is_verified,
       created_at, updated_at`,
    values,
  )
  return result.rows[0] || null
}

// ── Business hours queries ────────────────────────────────────────────────────

/**
 * Get all business hours for a profile, ordered by day_of_week.
 * @param {string} profileId
 * @returns {Promise<object[]>} Array of business hour rows
 */
export async function getBusinessHours(profileId) {
  const result = await pool.query(
    `SELECT id, profile_id, day_of_week, opens_at, closes_at, is_closed
     FROM business_hours
     WHERE profile_id = $1
     ORDER BY day_of_week`,
    [profileId],
  )
  return result.rows
}

/**
 * Delete all business hours for a profile.
 * @param {string} profileId
 * @param {import('pg').PoolClient} [client] - Optional client for transactions
 */
export async function deleteBusinessHours(profileId, client = pool) {
  await client.query('DELETE FROM business_hours WHERE profile_id = $1', [profileId])
}

/**
 * Insert a single business hours row.
 * @param {string} profileId
 * @param {object} entry - { day_of_week, opens_at, closes_at, is_closed }
 * @param {import('pg').PoolClient} client - Client for transactions
 */
export async function insertBusinessHour(profileId, entry, client) {
  await client.query(
    `INSERT INTO business_hours (profile_id, day_of_week, opens_at, closes_at, is_closed)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      profileId,
      entry.day_of_week,
      entry.is_closed === true ? null : (entry.opens_at || null),
      entry.is_closed === true ? null : (entry.closes_at || null),
      entry.is_closed ?? false,
    ],
  )
}

// ── Social links queries ──────────────────────────────────────────────────────

/**
 * Get all social links for a profile.
 * @param {string} profileId
 * @returns {Promise<object[]>} Array of social link rows
 */
export async function getSocialLinks(profileId) {
  const result = await pool.query(
    `SELECT id, profile_id, platform, url, created_at, updated_at
     FROM social_links
     WHERE profile_id = $1
     ORDER BY platform`,
    [profileId],
  )
  return result.rows
}

/**
 * Delete all social links for a profile.
 * @param {string} profileId
 * @param {import('pg').PoolClient} [client] - Optional client for transactions
 */
export async function deleteSocialLinks(profileId, client = pool) {
  await client.query('DELETE FROM social_links WHERE profile_id = $1', [profileId])
}

/**
 * Insert a single social link.
 * @param {string} profileId
 * @param {object} entry - { platform, url }
 * @param {import('pg').PoolClient} client - Client for transactions
 */
export async function insertSocialLink(profileId, entry, client) {
  await client.query(
    'INSERT INTO social_links (profile_id, platform, url) VALUES ($1, $2, $3)',
    [profileId, entry.platform, entry.url],
  )
}

// ── Foreign-key reference checks ─────────────────────────────────────────────

/**
 * Check if a category exists by ID.
 * @param {string} categoryId - UUID
 * @returns {Promise<boolean>} True if the category exists
 */
export async function categoryExists(categoryId) {
  const result = await pool.query(
    'SELECT 1 FROM categories WHERE id = $1',
    [categoryId],
  )
  return result.rowCount > 0
}

/**
 * Check if a location exists by ID.
 * @param {string} locationId - UUID
 * @returns {Promise<boolean>} True if the location exists
 */
export async function locationExists(locationId) {
  const result = await pool.query(
    'SELECT 1 FROM locations WHERE id = $1',
    [locationId],
  )
  return result.rowCount > 0
}

/**
 * Check if a user exists by ID.
 * @param {string} userId - UUID
 * @returns {Promise<boolean>} True if the user exists
 */
export async function userExists(userId) {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE id = $1',
    [userId],
  )
  return result.rowCount > 0
}
