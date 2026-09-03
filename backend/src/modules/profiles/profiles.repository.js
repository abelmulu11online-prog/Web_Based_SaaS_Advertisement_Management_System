/**
 * profiles.repository.js — Data access for public profiles and all profile content.
 *
 * Covers:
 *   A. Public profile queries
 *   B. Profile core (extend existing users.repository pattern)
 *   C. Products
 *   D. Services offered
 *   E. Portfolio items
 *   F. Posts
 *   G. Achievements
 *   H. Generic image helpers (shared shape for all content images)
 */
import pool from '../../db/index.js'

// ── Reserved slugs — must never be used as profile slugs ─────────────────────
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'login', 'register', 'settings', 'dashboard',
  'explore', 'search', 'pricing', 'about', 'help', 'terms',
  'privacy', 'support', 'blog', 'docs', 'app', 'profile',
  'profiles', 'user', 'users', 'me', 'home', 'feed', 'discover',
  'ads', 'categories', 'locations', 'health', 'analytics',
  'notifications', 'subscriptions', 'auth', 'payments',
])

// ── A. Public profile queries ─────────────────────────────────────────────────

/**
 * Find a published profile by slug for public display.
 * Joins category and location data.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function findPublicProfileBySlug(slug) {
  const result = await pool.query(
    `SELECT
       p.id, p.user_id, p.display_name, p.slug, p.profile_type,
       p.headline, p.description,
       p.avatar_url, p.cover_url,
       p.country, p.region, p.city, p.area, p.address_line,
       p.latitude, p.longitude, p.location_precision,
       p.contact_phone, p.contact_email, p.website_url,
       p.whatsapp, p.telegram_username,
       p.phone_visibility, p.email_visibility,
       p.whatsapp, p.telegram_username,
       p.is_published, p.is_verified, p.verification_status,
       p.completion_score,
       p.created_at, p.updated_at,
       c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
       -- location FK join (legacy support)
       l.city  AS loc_city,
       l.region AS loc_region,
       l.country AS loc_country
     FROM profiles p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN locations  l ON p.location_id = l.id
     WHERE p.slug = $1 AND p.is_published = TRUE`,
    [slug],
  )
  return result.rows[0] || null
}

/**
 * Find any profile by slug (for slug availability check — includes unpublished).
 */
export async function findProfileBySlug(slug) {
  const result = await pool.query(
    'SELECT id, slug, user_id FROM profiles WHERE slug = $1',
    [slug],
  )
  return result.rows[0] || null
}

/**
 * Find a profile by user_id for the owner's dashboard (includes all fields).
 */
export async function findProfileByUserId(userId) {
  const result = await pool.query(
    `SELECT
       p.*,
       c.name AS category_name, c.slug AS category_slug,
       l.city AS location_city, l.region AS location_region, l.country AS location_country
     FROM profiles p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN locations  l ON p.location_id = l.id
     WHERE p.user_id = $1`,
    [userId],
  )
  return result.rows[0] || null
}

/**
 * Search published profiles.
 * @param {object} opts
 */
export async function searchProfiles({ search, profile_type, category_id, city, country, page, page_size }) {
  const params = []
  const conditions = ['p.is_published = TRUE']

  if (profile_type) {
    params.push(profile_type)
    conditions.push(`p.profile_type = $${params.length}`)
  }
  if (category_id) {
    params.push(category_id)
    conditions.push(`p.category_id = $${params.length}`)
  }
  if (city) {
    params.push(`%${city}%`)
    conditions.push(`p.city ILIKE $${params.length}`)
  }
  if (country) {
    params.push(`%${country}%`)
    conditions.push(`p.country ILIKE $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    const n = params.length
    conditions.push(`(p.display_name ILIKE $${n} OR p.headline ILIKE $${n} OR p.description ILIKE $${n})`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * page_size

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM profiles p ${where}`,
    params,
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(page_size, offset)
  const dataResult = await pool.query(
    `SELECT
       p.id, p.display_name, p.slug, p.profile_type, p.headline,
       p.avatar_url, p.cover_url, p.city, p.country, p.region,
       p.is_verified, p.verification_status,
       c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
     FROM profiles p
     LEFT JOIN categories c ON p.category_id = c.id
     ${where}
     ORDER BY p.completion_score DESC, p.updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )

  return { rows: dataResult.rows, total }
}

// ── B. Update profile (extended fields) ──────────────────────────────────────

const PROFILE_UPDATABLE_FIELDS = [
  'display_name', 'slug', 'description', 'headline', 'profile_type',
  'category_id', 'location_id',
  'contact_phone', 'contact_email', 'website_url',
  'whatsapp', 'telegram_username',
  'country', 'region', 'city', 'area', 'address_line',
  'latitude', 'longitude', 'location_precision',
  'phone_visibility', 'email_visibility',
  'is_published',
  'avatar_url', 'avatar_storage_key', 'cover_url', 'cover_storage_key',
  'completion_score',
]

/**
 * Update profile fields dynamically.
 * @param {string} userId
 * @param {object} fields
 * @returns {Promise<object|null>}
 */
export async function updateProfile(userId, fields) {
  const setClauses = []
  const values = []
  let idx = 1

  for (const key of PROFILE_UPDATABLE_FIELDS) {
    if (key in fields) {
      setClauses.push(`${key} = $${idx++}`)
      values.push(fields[key])
    }
  }

  if (setClauses.length === 0) return null

  setClauses.push(`updated_at = now()`)
  values.push(userId)

  const result = await pool.query(
    `UPDATE profiles
     SET ${setClauses.join(', ')}
     WHERE user_id = $${idx}
     RETURNING *`,
    values,
  )
  return result.rows[0] || null
}

// ── C. Products ────────────────────────────────────────────────────────────────

export async function countProducts(profileId) {
  const r = await pool.query(
    'SELECT COUNT(*) AS total FROM profile_products WHERE profile_id = $1',
    [profileId],
  )
  return parseInt(r.rows[0].total, 10)
}

export async function findProducts(profileId, { publishedOnly = false, page = 1, page_size = 20 } = {}) {
  const where = publishedOnly
    ? 'WHERE pp.profile_id = $1 AND pp.is_published = TRUE'
    : 'WHERE pp.profile_id = $1'

  const countR = await pool.query(
    `SELECT COUNT(*) AS total FROM profile_products pp ${where}`,
    [profileId],
  )
  const total = parseInt(countR.rows[0].total, 10)

  const offset = (page - 1) * page_size
  const dataR = await pool.query(
    `SELECT pp.*, c.name AS category_name
     FROM profile_products pp
     LEFT JOIN categories c ON pp.category_id = c.id
     ${where}
     ORDER BY pp.is_featured DESC, pp.sort_order ASC, pp.created_at DESC
     LIMIT $2 OFFSET $3`,
    [profileId, page_size, offset],
  )
  return { rows: dataR.rows, total }
}

export async function findProductById(id) {
  const r = await pool.query('SELECT * FROM profile_products WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function createProduct(profileId, data) {
  const r = await pool.query(
    `INSERT INTO profile_products
       (profile_id, title, description, category_id, price, currency, price_type,
        brand, condition, availability, tags, is_featured, is_published, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      profileId, data.title, data.description || null, data.category_id || null,
      data.price ?? null, data.currency || 'ETB', data.price_type || 'FIXED',
      data.brand || null, data.condition || null,
      data.availability || 'IN_STOCK',
      data.tags ? `{${data.tags.map(t => `"${t}"`).join(',')}}` : null,
      data.is_featured ?? false, data.is_published ?? false, data.sort_order ?? 0,
    ],
  )
  return r.rows[0]
}

export async function updateProduct(id, profileId, data) {
  const allowed = [
    'title','description','category_id','price','currency','price_type',
    'brand','condition','availability','tags','is_featured','is_published','sort_order',
  ]
  const setClauses = []
  const values = []
  let idx = 1

  for (const key of allowed) {
    if (key in data) {
      if (key === 'tags') {
        setClauses.push(`tags = $${idx++}`)
        values.push(data.tags ? `{${data.tags.map(t => `"${t}"`).join(',')}}` : null)
      } else {
        setClauses.push(`${key} = $${idx++}`)
        values.push(data[key])
      }
    }
  }

  if (!setClauses.length) return null
  setClauses.push('updated_at = now()')
  values.push(id, profileId)

  const r = await pool.query(
    `UPDATE profile_products SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND profile_id = $${idx + 1}
     RETURNING *`,
    values,
  )
  return r.rows[0] || null
}

export async function deleteProduct(id, profileId) {
  const r = await pool.query(
    'DELETE FROM profile_products WHERE id = $1 AND profile_id = $2 RETURNING id',
    [id, profileId],
  )
  return r.rowCount > 0
}

// ── D. Services Offered ────────────────────────────────────────────────────────

export async function countServicesOffered(profileId) {
  const r = await pool.query(
    'SELECT COUNT(*) AS total FROM profile_services_offered WHERE profile_id = $1',
    [profileId],
  )
  return parseInt(r.rows[0].total, 10)
}

export async function findServicesOffered(profileId, { publishedOnly = false, page = 1, page_size = 20 } = {}) {
  const where = publishedOnly
    ? 'WHERE s.profile_id = $1 AND s.is_published = TRUE'
    : 'WHERE s.profile_id = $1'

  const countR = await pool.query(
    `SELECT COUNT(*) AS total FROM profile_services_offered s ${where}`,
    [profileId],
  )
  const total = parseInt(countR.rows[0].total, 10)
  const offset = (page - 1) * page_size

  const dataR = await pool.query(
    `SELECT s.*, c.name AS category_name
     FROM profile_services_offered s
     LEFT JOIN categories c ON s.category_id = c.id
     ${where}
     ORDER BY s.is_featured DESC, s.sort_order ASC, s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [profileId, page_size, offset],
  )
  return { rows: dataR.rows, total }
}

export async function findServiceOfferedById(id) {
  const r = await pool.query('SELECT * FROM profile_services_offered WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function createServiceOffered(profileId, data) {
  const r = await pool.query(
    `INSERT INTO profile_services_offered
       (profile_id, title, description, category_id, price_from, currency,
        pricing_type, location, availability, tags, is_featured, is_published, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      profileId, data.title, data.description || null, data.category_id || null,
      data.price_from ?? null, data.currency || 'ETB',
      data.pricing_type || 'CONTACT_FOR_PRICE',
      data.location || null, data.availability || 'AVAILABLE',
      data.tags ? `{${data.tags.map(t => `"${t}"`).join(',')}}` : null,
      data.is_featured ?? false, data.is_published ?? false, data.sort_order ?? 0,
    ],
  )
  return r.rows[0]
}

export async function updateServiceOffered(id, profileId, data) {
  const allowed = [
    'title','description','category_id','price_from','currency','pricing_type',
    'location','availability','tags','is_featured','is_published','sort_order',
  ]
  const setClauses = []
  const values = []
  let idx = 1

  for (const key of allowed) {
    if (key in data) {
      if (key === 'tags') {
        setClauses.push(`tags = $${idx++}`)
        values.push(data.tags ? `{${data.tags.map(t => `"${t}"`).join(',')}}` : null)
      } else {
        setClauses.push(`${key} = $${idx++}`)
        values.push(data[key])
      }
    }
  }

  if (!setClauses.length) return null
  setClauses.push('updated_at = now()')
  values.push(id, profileId)

  const r = await pool.query(
    `UPDATE profile_services_offered SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND profile_id = $${idx + 1}
     RETURNING *`,
    values,
  )
  return r.rows[0] || null
}

export async function deleteServiceOffered(id, profileId) {
  const r = await pool.query(
    'DELETE FROM profile_services_offered WHERE id = $1 AND profile_id = $2 RETURNING id',
    [id, profileId],
  )
  return r.rowCount > 0
}

// ── E. Portfolio ───────────────────────────────────────────────────────────────

export async function countPortfolioItems(profileId) {
  const r = await pool.query(
    'SELECT COUNT(*) AS total FROM portfolio_items WHERE profile_id = $1',
    [profileId],
  )
  return parseInt(r.rows[0].total, 10)
}

export async function findPortfolioItems(profileId, { publishedOnly = false, page = 1, page_size = 20 } = {}) {
  const where = publishedOnly
    ? 'WHERE profile_id = $1 AND is_published = TRUE'
    : 'WHERE profile_id = $1'

  const countR = await pool.query(
    `SELECT COUNT(*) AS total FROM portfolio_items ${where}`, [profileId],
  )
  const total = parseInt(countR.rows[0].total, 10)
  const offset = (page - 1) * page_size

  const dataR = await pool.query(
    `SELECT * FROM portfolio_items ${where}
     ORDER BY is_featured DESC, sort_order ASC, completion_date DESC NULLS LAST, created_at DESC
     LIMIT $2 OFFSET $3`,
    [profileId, page_size, offset],
  )
  return { rows: dataR.rows, total }
}

export async function findPortfolioItemById(id) {
  const r = await pool.query('SELECT * FROM portfolio_items WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function createPortfolioItem(profileId, data) {
  const r = await pool.query(
    `INSERT INTO portfolio_items
       (profile_id, title, description, category, client, project_url,
        completion_date, tags, is_featured, is_published, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      profileId, data.title, data.description || null,
      data.category || null, data.client || null,
      data.project_url || null, data.completion_date || null,
      data.tags ? `{${data.tags.map(t => `"${t}"`).join(',')}}` : null,
      data.is_featured ?? false, data.is_published ?? false, data.sort_order ?? 0,
    ],
  )
  return r.rows[0]
}

export async function updatePortfolioItem(id, profileId, data) {
  const allowed = [
    'title','description','category','client','project_url',
    'completion_date','tags','is_featured','is_published','sort_order',
  ]
  const setClauses = []
  const values = []
  let idx = 1

  for (const key of allowed) {
    if (key in data) {
      if (key === 'tags') {
        setClauses.push(`tags = $${idx++}`)
        values.push(data.tags ? `{${data.tags.map(t => `"${t}"`).join(',')}}` : null)
      } else {
        setClauses.push(`${key} = $${idx++}`)
        values.push(data[key])
      }
    }
  }

  if (!setClauses.length) return null
  setClauses.push('updated_at = now()')
  values.push(id, profileId)

  const r = await pool.query(
    `UPDATE portfolio_items SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND profile_id = $${idx + 1}
     RETURNING *`,
    values,
  )
  return r.rows[0] || null
}

export async function deletePortfolioItem(id, profileId) {
  const r = await pool.query(
    'DELETE FROM portfolio_items WHERE id = $1 AND profile_id = $2 RETURNING id',
    [id, profileId],
  )
  return r.rowCount > 0
}

// ── F. Posts ──────────────────────────────────────────────────────────────────

export async function countPosts(profileId) {
  const r = await pool.query(
    'SELECT COUNT(*) AS total FROM profile_posts WHERE profile_id = $1',
    [profileId],
  )
  return parseInt(r.rows[0].total, 10)
}

export async function findPosts(profileId, { publishedOnly = false, page = 1, page_size = 20 } = {}) {
  const where = publishedOnly
    ? 'WHERE profile_id = $1 AND is_published = TRUE AND visibility = \'PUBLIC\''
    : 'WHERE profile_id = $1'

  const countR = await pool.query(
    `SELECT COUNT(*) AS total FROM profile_posts ${where}`, [profileId],
  )
  const total = parseInt(countR.rows[0].total, 10)
  const offset = (page - 1) * page_size

  const dataR = await pool.query(
    `SELECT * FROM profile_posts ${where}
     ORDER BY is_pinned DESC, published_at DESC NULLS LAST, created_at DESC
     LIMIT $2 OFFSET $3`,
    [profileId, page_size, offset],
  )
  return { rows: dataR.rows, total }
}

export async function findPostById(id) {
  const r = await pool.query('SELECT * FROM profile_posts WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function createPost(profileId, data) {
  const isPublished = data.is_published ?? false
  const r = await pool.query(
    `INSERT INTO profile_posts
       (profile_id, title, content, post_type, visibility, is_published, is_pinned, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      profileId, data.title || null, data.content,
      data.post_type || 'UPDATE', data.visibility || 'PUBLIC',
      isPublished, data.is_pinned ?? false,
      isPublished ? new Date().toISOString() : null,
    ],
  )
  return r.rows[0]
}

export async function updatePost(id, profileId, data) {
  const allowed = ['title','content','post_type','visibility','is_published','is_pinned']
  const setClauses = []
  const values = []
  let idx = 1

  for (const key of allowed) {
    if (key in data) {
      setClauses.push(`${key} = $${idx++}`)
      values.push(data[key])
    }
  }

  // Set published_at when publishing for the first time
  if (data.is_published === true) {
    setClauses.push(`published_at = COALESCE(published_at, now())`)
  }

  if (!setClauses.length) return null
  setClauses.push('updated_at = now()')
  values.push(id, profileId)

  const r = await pool.query(
    `UPDATE profile_posts SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND profile_id = $${idx + 1}
     RETURNING *`,
    values,
  )
  return r.rows[0] || null
}

export async function deletePost(id, profileId) {
  const r = await pool.query(
    'DELETE FROM profile_posts WHERE id = $1 AND profile_id = $2 RETURNING id',
    [id, profileId],
  )
  return r.rowCount > 0
}

// ── G. Achievements ────────────────────────────────────────────────────────────

export async function findAchievements(profileId, { publishedOnly = false } = {}) {
  const where = publishedOnly
    ? 'WHERE profile_id = $1 AND is_published = TRUE'
    : 'WHERE profile_id = $1'

  const r = await pool.query(
    `SELECT * FROM profile_achievements ${where}
     ORDER BY sort_order ASC, date DESC NULLS LAST, created_at DESC`,
    [profileId],
  )
  return r.rows
}

export async function findAchievementById(id) {
  const r = await pool.query('SELECT * FROM profile_achievements WHERE id = $1', [id])
  return r.rows[0] || null
}

export async function createAchievement(profileId, data) {
  const r = await pool.query(
    `INSERT INTO profile_achievements
       (profile_id, title, description, date, organization, certificate_url, external_link, is_published, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      profileId, data.title, data.description || null,
      data.date || null, data.organization || null,
      data.certificate_url || null, data.external_link || null,
      data.is_published ?? false, data.sort_order ?? 0,
    ],
  )
  return r.rows[0]
}

export async function updateAchievement(id, profileId, data) {
  const allowed = [
    'title','description','date','organization',
    'certificate_url','external_link','is_published','sort_order',
  ]
  const setClauses = []
  const values = []
  let idx = 1

  for (const key of allowed) {
    if (key in data) {
      setClauses.push(`${key} = $${idx++}`)
      values.push(data[key])
    }
  }

  if (!setClauses.length) return null
  setClauses.push('updated_at = now()')
  values.push(id, profileId)

  const r = await pool.query(
    `UPDATE profile_achievements SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND profile_id = $${idx + 1}
     RETURNING *`,
    values,
  )
  return r.rows[0] || null
}

export async function deleteAchievement(id, profileId) {
  const r = await pool.query(
    'DELETE FROM profile_achievements WHERE id = $1 AND profile_id = $2 RETURNING id',
    [id, profileId],
  )
  return r.rowCount > 0
}

// ── H. Generic image helpers ──────────────────────────────────────────────────

/**
 * Find images for any content type.
 * @param {string} table  - 'product_images' | 'service_images' | 'portfolio_images' | 'post_images' | 'achievement_images'
 * @param {string} fkCol  - foreign key column name
 * @param {string} ownerId
 */
export async function findImages(table, fkCol, ownerId) {
  const r = await pool.query(
    `SELECT * FROM ${table} WHERE ${fkCol} = $1 ORDER BY sort_order ASC, created_at ASC`,
    [ownerId],
  )
  return r.rows
}

export async function countImages(table, fkCol, ownerId) {
  const r = await pool.query(
    `SELECT COUNT(*) AS total FROM ${table} WHERE ${fkCol} = $1`,
    [ownerId],
  )
  return parseInt(r.rows[0].total, 10)
}

export async function addImage(table, fkCol, ownerId, { imageUrl, storageKey, altText, sortOrder, isPrimary }) {
  const r = await pool.query(
    `INSERT INTO ${table} (${fkCol}, image_url, storage_key, alt_text, sort_order, is_primary)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [ownerId, imageUrl, storageKey || null, altText || null, sortOrder ?? 0, isPrimary ?? false],
  )
  return r.rows[0]
}

export async function findImageById(table, id, fkCol, ownerId) {
  const r = await pool.query(
    `SELECT * FROM ${table} WHERE id = $1 AND ${fkCol} = $2`,
    [id, ownerId],
  )
  return r.rows[0] || null
}

export async function deleteImageById(table, id) {
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id])
}

export async function clearPrimaryImage(table, fkCol, ownerId, client = pool) {
  await client.query(
    `UPDATE ${table} SET is_primary = FALSE WHERE ${fkCol} = $1`,
    [ownerId],
  )
}

export async function setPrimaryImage(table, id, fkCol, ownerId, client = pool) {
  const r = await client.query(
    `UPDATE ${table} SET is_primary = TRUE WHERE id = $1 AND ${fkCol} = $2 RETURNING *`,
    [id, ownerId],
  )
  return r.rows[0] || null
}

// ── I. Business hours & social links (read-only here — write via users.repository) ──

export async function findBusinessHours(profileId) {
  const r = await pool.query(
    'SELECT id, day_of_week, opens_at, closes_at, is_closed FROM business_hours WHERE profile_id = $1 ORDER BY day_of_week',
    [profileId],
  )
  return r.rows
}

export async function findSocialLinks(profileId) {
  const r = await pool.query(
    'SELECT id, platform, url FROM social_links WHERE profile_id = $1 ORDER BY platform',
    [profileId],
  )
  return r.rows
}
