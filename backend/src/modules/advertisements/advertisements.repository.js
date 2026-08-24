/**
 * advertisements.repository.js — Data-access layer for advertisement listings.
 *
 * All SQL queries related to advertisements and their images.
 * Uses parameterized queries exclusively — never interpolates user input.
 *
 * Repository responsibilities: database access, SQL, CRUD operations.
 * Does NOT contain: HTTP logic, JWT, authorization, workflow logic.
 */
import pool from '../../db/index.js'

// ── Advertisement queries ────────────────────────────────────────────────────

/**
 * Find a single advertisement by ID.
 * Joins category and includes advertiser's public profile info.
 * @param {string} id - Advertisement UUID
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  const result = await pool.query(
    `SELECT
       a.id, a.user_id, a.title, a.description,
       a.category_id, a.price, a.price_type,
       a.contact_phone, a.contact_email,
       a.status, a.published_at, a.expires_at,
       a.latitude, a.longitude, a.address,
       a.created_at, a.updated_at,
       c.name  AS category_name,
       c.slug  AS category_slug,
       c.icon  AS category_icon,
       u.email AS advertiser_email,
       u.phone AS advertiser_phone
     FROM advertisements a
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN users      u ON a.user_id     = u.id
     WHERE a.id = $1`,
    [id],
  )
  return result.rows[0] || null
}

/**
 * List published advertisements with optional filtering and pagination.
 * Only returns PUBLISHED advertisements (public endpoint).
 *
 * @param {object} opts
 * @param {string}  [opts.search]      - Full-text search term (title/description ILIKE)
 * @param {string}  [opts.category_id] - Filter by category UUID
 * @param {number}  [opts.min_price]   - Minimum price filter
 * @param {number}  [opts.max_price]   - Maximum price filter
 * @param {number}  [opts.page]        - Page number (1-based)
 * @param {number}  [opts.page_size]   - Items per page
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findPublished({
  search,
  category_id,
  min_price,
  max_price,
  page = 1,
  page_size = 20,
}) {
  const conditions = [`a.status = 'PUBLISHED'`]
  const values = []
  let idx = 1

  if (search) {
    conditions.push(
      `(a.title ILIKE $${idx} OR a.description ILIKE $${idx})`,
    )
    values.push(`%${search}%`)
    idx++
  }

  if (category_id) {
    conditions.push(`a.category_id = $${idx}`)
    values.push(category_id)
    idx++
  }

  if (min_price !== undefined && min_price !== null) {
    conditions.push(`a.price >= $${idx}`)
    values.push(min_price)
    idx++
  }

  if (max_price !== undefined && max_price !== null) {
    conditions.push(`a.price <= $${idx}`)
    values.push(max_price)
    idx++
  }

  const whereClause = conditions.join(' AND ')

  // Count total matching rows for pagination metadata
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM advertisements a
     WHERE ${whereClause}`,
    values,
  )
  const total = parseInt(countResult.rows[0].total, 10)

  // Fetch paginated rows
  const offset = (page - 1) * page_size
  values.push(page_size, offset)

  const dataResult = await pool.query(
    `SELECT
       a.id, a.user_id, a.title, a.description,
       a.category_id, a.price, a.price_type,
       a.contact_phone, a.contact_email,
       a.status, a.published_at, a.expires_at,
       a.latitude, a.longitude, a.address,
       a.created_at, a.updated_at,
       c.name AS category_name,
       c.slug AS category_slug,
       c.icon AS category_icon
     FROM advertisements a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE ${whereClause}
     ORDER BY a.published_at DESC, a.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values,
  )

  return { rows: dataResult.rows, total }
}

/**
 * List all advertisements for a specific user (advertiser dashboard).
 * Returns all statuses (DRAFT, PUBLISHED, PAUSED, EXPIRED, ARCHIVED).
 *
 * @param {string} userId - Authenticated user's ID
 * @param {object} opts
 * @param {string}  [opts.status]     - Filter by status
 * @param {number}  [opts.page]       - Page number (1-based)
 * @param {number}  [opts.page_size]  - Items per page
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findByUserId(userId, { status, page = 1, page_size = 20 }) {
  const conditions = [`a.user_id = $1`]
  const values = [userId]
  let idx = 2

  if (status) {
    conditions.push(`a.status = $${idx}`)
    values.push(status)
    idx++
  }

  const whereClause = conditions.join(' AND ')

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM advertisements a
     WHERE ${whereClause}`,
    values,
  )
  const total = parseInt(countResult.rows[0].total, 10)

  const offset = (page - 1) * page_size
  values.push(page_size, offset)

  const dataResult = await pool.query(
    `SELECT
       a.id, a.user_id, a.title, a.description,
       a.category_id, a.price, a.price_type,
       a.contact_phone, a.contact_email,
       a.status, a.published_at, a.expires_at,
       a.latitude, a.longitude, a.address,
       a.created_at, a.updated_at,
       c.name AS category_name,
       c.slug AS category_slug,
       c.icon AS category_icon
     FROM advertisements a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE ${whereClause}
     ORDER BY a.updated_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values,
  )

  return { rows: dataResult.rows, total }
}

/**
 * Create a new advertisement in DRAFT status.
 * @param {object} data
 * @returns {Promise<object>} Created advertisement row
 */
export async function create({
  userId,
  title,
  description,
  categoryId,
  price,
  priceType,
  contactPhone,
  contactEmail,
  latitude,
  longitude,
  address,
}) {
  const result = await pool.query(
    `INSERT INTO advertisements (
       user_id, title, description, category_id,
       price, price_type, contact_phone, contact_email,
       latitude, longitude, address,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'DRAFT')
     RETURNING *`,
    [
      userId,
      title,
      description,
      categoryId || null,
      price !== undefined && price !== null ? price : null,
      priceType || 'FIXED',
      contactPhone || null,
      contactEmail || null,
      latitude !== undefined && latitude !== null ? latitude : null,
      longitude !== undefined && longitude !== null ? longitude : null,
      address || null,
    ],
  )
  return result.rows[0]
}

/**
 * Update an advertisement's fields.
 * Only updates fields explicitly provided (undefined = not touched).
 * @param {string} id       - Advertisement UUID
 * @param {string} userId   - Owner's user ID (ownership verified before call)
 * @param {object} fields   - Fields to update
 * @returns {Promise<object|null>}
 */
export async function update(id, userId, fields) {
  const allowed = [
    'title', 'description', 'category_id', 'price', 'price_type',
    'contact_phone', 'contact_email', 'latitude', 'longitude', 'address',
    'expires_at',
  ]

  const setClauses = []
  const values = []
  let paramIndex = 1

  for (const key of allowed) {
    if (key in fields) {
      setClauses.push(`${key} = $${paramIndex}`)
      values.push(fields[key])
      paramIndex++
    }
  }

  if (setClauses.length === 0) return null

  setClauses.push(`updated_at = now()`)

  // WHERE clause binds: id and user_id for ownership guard at DB level
  values.push(id, userId)

  const result = await pool.query(
    `UPDATE advertisements
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    values,
  )
  return result.rows[0] || null
}

/**
 * Transition an advertisement status.
 * Used by publish / pause / archive operations.
 * Only transitions the row if it belongs to the given user.
 *
 * @param {string} id          - Advertisement UUID
 * @param {string} userId      - Owner's user ID
 * @param {string} newStatus   - Target status value
 * @param {object} [extra]     - Additional fields to set (e.g. published_at)
 * @returns {Promise<object|null>}
 */
export async function updateStatus(id, userId, newStatus, extra = {}) {
  const setClauses = [`status = $1`, `updated_at = now()`]
  const values = [newStatus]
  let idx = 2

  for (const [key, value] of Object.entries(extra)) {
    setClauses.push(`${key} = $${idx}`)
    values.push(value)
    idx++
  }

  values.push(id, userId)

  const result = await pool.query(
    `UPDATE advertisements
     SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND user_id = $${idx + 1}
     RETURNING *`,
    values,
  )
  return result.rows[0] || null
}

/**
 * Hard-delete an advertisement (only allowed for DRAFT or ARCHIVED status).
 * Ownership is enforced at DB level via the WHERE clause.
 * @param {string} id     - Advertisement UUID
 * @param {string} userId - Owner's user ID
 * @returns {Promise<boolean>} true if deleted, false if not found or not owner
 */
export async function deleteById(id, userId) {
  const result = await pool.query(
    `DELETE FROM advertisements
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId],
  )
  return result.rowCount > 0
}

// ── Advertisement image queries ────────────────────────────────────────────────

/**
 * Get all images for an advertisement, ordered by sort_order then created_at.
 * @param {string} advertisementId
 * @returns {Promise<object[]>}
 */
export async function findImages(advertisementId) {
  const result = await pool.query(
    `SELECT id, advertisement_id, image_url, storage_key, alt_text, sort_order, is_primary, created_at
     FROM advertisement_images
     WHERE advertisement_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [advertisementId],
  )
  return result.rows
}

/**
 * Count images for an advertisement.
 * @param {string} advertisementId
 * @returns {Promise<number>}
 */
export async function countImages(advertisementId) {
  const result = await pool.query(
    'SELECT COUNT(*) AS total FROM advertisement_images WHERE advertisement_id = $1',
    [advertisementId],
  )
  return parseInt(result.rows[0].total, 10)
}

/**
 * Add an image to an advertisement.
 * @param {object} data
 * @returns {Promise<object>} Created image row
 */
export async function addImage({
  advertisementId,
  imageUrl,
  storageKey,
  altText,
  sortOrder,
  isPrimary,
}) {
  const result = await pool.query(
    `INSERT INTO advertisement_images (
       advertisement_id, image_url, storage_key, alt_text, sort_order, is_primary
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      advertisementId,
      imageUrl,
      storageKey || null,
      altText || null,
      sortOrder ?? 0,
      isPrimary ?? false,
    ],
  )
  return result.rows[0]
}

/**
 * Find a single image by ID, verifying it belongs to the given advertisement.
 * @param {string} imageId
 * @param {string} advertisementId
 * @returns {Promise<object|null>}
 */
export async function findImageById(imageId, advertisementId) {
  const result = await pool.query(
    `SELECT * FROM advertisement_images
     WHERE id = $1 AND advertisement_id = $2`,
    [imageId, advertisementId],
  )
  return result.rows[0] || null
}

/**
 * Delete an image by ID, verifying it belongs to the given advertisement.
 * @param {string} imageId
 * @param {string} advertisementId
 * @returns {Promise<boolean>}
 */
export async function deleteImage(imageId, advertisementId) {
  const result = await pool.query(
    `DELETE FROM advertisement_images
     WHERE id = $1 AND advertisement_id = $2
     RETURNING id`,
    [imageId, advertisementId],
  )
  return result.rowCount > 0
}

/**
 * Unset the is_primary flag for all images of an advertisement.
 * Called before setting a new primary image.
 * @param {string} advertisementId
 * @param {import('pg').PoolClient} client
 */
export async function clearPrimaryImage(advertisementId, client = pool) {
  await client.query(
    `UPDATE advertisement_images
     SET is_primary = FALSE
     WHERE advertisement_id = $1`,
    [advertisementId],
  )
}

/**
 * Set a specific image as the primary image.
 * @param {string} imageId
 * @param {string} advertisementId
 * @param {import('pg').PoolClient} client
 * @returns {Promise<object|null>}
 */
export async function setPrimaryImage(imageId, advertisementId, client = pool) {
  const result = await client.query(
    `UPDATE advertisement_images
     SET is_primary = TRUE
     WHERE id = $1 AND advertisement_id = $2
     RETURNING *`,
    [imageId, advertisementId],
  )
  return result.rows[0] || null
}

/**
 * Delete all images for an advertisement.
 * Used when deleting the advertisement.
 * @param {string} advertisementId
 * @param {import('pg').PoolClient} [client]
 */
export async function deleteAllImages(advertisementId, client = pool) {
  await client.query(
    `DELETE FROM advertisement_images WHERE advertisement_id = $1`,
    [advertisementId],
  )
}

// ── Foreign-key reference checks ─────────────────────────────────────────────

/**
 * Check if a category exists and is active.
 * @param {string} categoryId
 * @returns {Promise<boolean>}
 */
export async function categoryExists(categoryId) {
  const result = await pool.query(
    'SELECT 1 FROM categories WHERE id = $1 AND is_active = TRUE',
    [categoryId],
  )
  return result.rowCount > 0
}
