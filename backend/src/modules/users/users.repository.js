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
       p.*,
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
  profileType,
  headline,
  country,
  region,
  city,
  area,
  addressLine,
  whatsapp,
  telegramUsername,
  phoneVisibility,
  emailVisibility,
}) {
  const result = await pool.query(
    `INSERT INTO profiles (
       user_id, display_name, slug, description,
       category_id, location_id,
       contact_phone, contact_email, website_url,
       is_published,
       profile_type, headline,
       country, region, city, area, address_line,
       whatsapp, telegram_username,
       phone_visibility, email_visibility
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING *`,
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
      profileType || 'PERSONAL',
      headline || null,
      country || null,
      region || null,
      city || null,
      area || null,
      addressLine || null,
      whatsapp || null,
      telegramUsername || null,
      phoneVisibility || 'PUBLIC',
      emailVisibility || 'PUBLIC',
    ],
  )
  return result.rows[0]
}

/**
 * Update a profile by user_id.
 * Handles all original + extended fields from migrations 021 + 036.
 */
export async function updateProfile(userId, fields) {
  const allowedFields = [
    'display_name', 'slug', 'description', 'category_id', 'location_id',
    'contact_phone', 'contact_email', 'website_url', 'is_published',
    // Extended fields (migration 021)
    'profile_type', 'headline',
    'avatar_url', 'avatar_storage_key', 'cover_url', 'cover_storage_key',
    'country', 'region', 'city', 'area', 'address_line',
    'latitude', 'longitude', 'location_precision',
    'whatsapp', 'telegram_username',
    'phone_visibility', 'email_visibility',
    'completion_score',
    // Verification fields (migration 036)
    'business_name', 'business_type', 'license_number',
    'license_issue_date', 'license_expiry_date',
    'business_address', 'business_city', 'business_region', 'business_country',
    'additional_information',
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

  if (setClauses.length === 0) return null

  setClauses.push('updated_at = now()')
  values.push(userId)

  const result = await pool.query(
    `UPDATE profiles SET ${setClauses.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
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

// ── Verification document queries ─────────────────────────────────────────────

/**
 * Upsert (insert-or-replace) a verification document for a profile.
 * Because verification_documents has a UNIQUE constraint on profile_id,
 * we delete the old record first (if any) then insert the new one.
 * The old storage_key is returned so the caller can delete it from storage.
 *
 * @param {string} profileId
 * @param {{ documentName, documentType, storageKey, mimeType, fileSize }} data
 * @param {import('pg').PoolClient} [client]
 * @returns {Promise<{ id: string, oldStorageKey: string|null }>}
 */
export async function upsertVerificationDocument(profileId, {
  documentName, documentType, storageKey, mimeType, fileSize,
}, client = pool) {
  // Fetch old key before deletion
  const old = await client.query(
    `SELECT storage_key FROM verification_documents WHERE profile_id = $1`,
    [profileId]
  )
  const oldStorageKey = old.rows[0]?.storage_key || null

  // Delete existing document row (if any)
  await client.query(
    `DELETE FROM verification_documents WHERE profile_id = $1`,
    [profileId]
  )

  // Insert new document record
  const result = await client.query(
    `INSERT INTO verification_documents
       (profile_id, document_name, document_type, storage_key, mime_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, document_name, document_type, mime_type, file_size, uploaded_at`,
    [profileId, documentName, documentType, storageKey, mimeType, fileSize || null]
  )
  return { doc: result.rows[0], oldStorageKey }
}

/**
 * Find the verification document for a profile (owner's own copy).
 * Returns metadata but NOT the storage_key (private — use signed URL for access).
 * @param {string} profileId
 */
export async function findVerificationDocument(profileId) {
  const result = await pool.query(
    `SELECT id, document_name, document_type, mime_type, file_size, uploaded_at
     FROM verification_documents
     WHERE profile_id = $1`,
    [profileId]
  )
  return result.rows[0] || null
}

/**
 * Find the storage_key for a profile's verification document.
 * Used internally to generate signed URLs or delete from storage.
 * @param {string} profileId
 */
export async function findVerificationDocStorageKey(profileId) {
  const result = await pool.query(
    `SELECT storage_key FROM verification_documents WHERE profile_id = $1`,
    [profileId]
  )
  return result.rows[0]?.storage_key || null
}

/**
 * Update the verification_status of a profile by user_id.
 * Only allows transitions that are valid from the user's side:
 *   UNVERIFIED/REJECTED → UNDER_REVIEW  (submit / resubmit)
 *
 * The is_published flag is forced to FALSE when going to UNDER_REVIEW.
 * @param {string} userId
 * @param {'UNDER_REVIEW'} newStatus
 * @param {import('pg').PoolClient} [client]
 */
export async function setVerificationStatusByUserId(userId, newStatus, client = pool) {
  const result = await client.query(
    `UPDATE profiles
     SET verification_status = $1::verification_status,
         is_published        = CASE WHEN $1 = 'UNDER_REVIEW' THEN FALSE ELSE is_published END,
         rejection_reason    = CASE WHEN $1 = 'UNDER_REVIEW' THEN NULL ELSE rejection_reason END,
         updated_at          = now()
     WHERE user_id = $2
     RETURNING id, verification_status, is_published, rejection_reason, updated_at`,
    [newStatus, userId]
  )
  return result.rows[0] || null
}

/**
 * Set is_published = TRUE and record published_at timestamp.
 * Used by the "Publish Profile" action.
 * @param {string} userId
 */
export async function publishProfileByUserId(userId) {
  const result = await pool.query(
    `UPDATE profiles
     SET is_published = TRUE,
         published_at = COALESCE(published_at, now()),
         updated_at   = now()
     WHERE user_id = $1
     RETURNING id, is_published, published_at`,
    [userId]
  )
  return result.rows[0] || null
}

/**
 * Set is_published = FALSE (unpublish / take profile private).
 * @param {string} userId
 */
export async function unpublishProfileByUserId(userId) {
  const result = await pool.query(
    `UPDATE profiles
     SET is_published = FALSE,
         updated_at   = now()
     WHERE user_id = $1
     RETURNING id, is_published`,
    [userId]
  )
  return result.rows[0] || null
}
