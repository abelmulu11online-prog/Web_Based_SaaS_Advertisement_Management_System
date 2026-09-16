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
 *
 * Security rule: For profile types that require verification (SHOP, BUSINESS,
 * COMPANY, ORGANIZATION) only ACTIVE or VERIFIED profiles are returned.
 * For other types (PERSONAL, PROFESSIONAL, FREELANCER) the only gate is
 * is_published = TRUE.
 *
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
     WHERE p.slug = $1
       AND p.is_published = TRUE
       AND (
         -- Non-verification types: any non-suspended status is fine
         (p.profile_type NOT IN ('SHOP','BUSINESS','COMPANY','ORGANIZATION')
          AND p.verification_status != 'SUSPENDED')
         OR
         -- Verification-required types: must be ACTIVE or legacy VERIFIED
         (p.profile_type IN ('SHOP','BUSINESS','COMPANY','ORGANIZATION')
          AND p.verification_status IN ('ACTIVE','VERIFIED'))
       )`,
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
export async function searchProfiles({
  search, profile_type, category_id, city, country,
  latitude, longitude, radius_km, verified_only, page, page_size,
}) {
  const params = []
  const conditions = [
    `p.is_published = TRUE`,
    // Verification gate: SHOP/BUSINESS/COMPANY/ORGANIZATION must be ACTIVE or VERIFIED
    `(p.profile_type NOT IN ('SHOP','BUSINESS','COMPANY','ORGANIZATION') OR p.verification_status IN ('ACTIVE','VERIFIED'))`,
    // Never show SUSPENDED profiles publicly
    `p.verification_status != 'SUSPENDED'`,
  ]

  if (profile_type) {
    params.push(profile_type)
    conditions.push(`p.profile_type = $${params.length}`)
  }
  if (category_id) {
    params.push(category_id)
    const n = params.length
    conditions.push(`(p.category_id = $${n} OR p.category_id IN (SELECT id FROM categories WHERE parent_id = $${n}))`)
  }
  if (city) {
    params.push(`%${city}%`)
    conditions.push(`(p.city ILIKE $${params.length} OR p.area ILIKE $${params.length} OR p.region ILIKE $${params.length})`)
  }
  if (country) {
    params.push(`%${country}%`)
    conditions.push(`p.country ILIKE $${params.length}`)
  }
  if (verified_only) {
    conditions.push(`p.is_verified = TRUE`)
  }
  if (search) {
    params.push(`%${search}%`)
    const n = params.length
    conditions.push(`(
      p.display_name ILIKE $${n}
      OR p.headline ILIKE $${n}
      OR p.description ILIKE $${n}
      OR p.city ILIKE $${n}
      OR p.area ILIKE $${n}
      OR c.name ILIKE $${n}
    )`)
  }

  const useNearby = latitude != null && longitude != null && radius_km != null
  let distanceSelect = 'NULL::float AS distance_km'
  if (useNearby) {
    params.push(latitude, longitude, radius_km)
    const latP = params.length - 2
    const lngP = params.length - 1
    const radP = params.length
    distanceSelect = `(
      6371 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians($${latP})) * cos(radians(p.latitude::float)) *
        cos(radians(p.longitude::float) - radians($${lngP})) +
        sin(radians($${latP})) * sin(radians(p.latitude::float))
      )))
    ) AS distance_km`
    conditions.push(`p.latitude IS NOT NULL AND p.longitude IS NOT NULL`)
    conditions.push(`(
      6371 * acos(LEAST(1.0, GREATEST(-1.0,
        cos(radians($${latP})) * cos(radians(p.latitude::float)) *
        cos(radians(p.longitude::float) - radians($${lngP})) +
        sin(radians($${latP})) * sin(radians(p.latitude::float))
      )))
    ) <= $${radP}`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const offset = (page - 1) * page_size

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM profiles p
     LEFT JOIN categories c ON p.category_id = c.id
     ${where}`,
    params,
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(page_size, offset)
  const orderBy = useNearby
    ? 'distance_km ASC NULLS LAST, COALESCE(sp.is_featured, FALSE) DESC, COALESCE(rs.avg_rating, 0) DESC, p.completion_score DESC'
    : 'COALESCE(sp.is_featured, FALSE) DESC, COALESCE(rs.avg_rating, 0) DESC, p.completion_score DESC, p.updated_at DESC'

  const dataResult = await pool.query(
    `SELECT
       p.id, p.display_name, p.slug, p.profile_type, p.headline,
       p.avatar_url, p.cover_url, p.city, p.country, p.region, p.area,
       p.latitude, p.longitude,
       p.is_verified, p.verification_status,
       c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
       COALESCE(sp.is_featured, FALSE) AS is_featured,
       COALESCE(rs.avg_rating, 0) AS avg_rating,
       COALESCE(rs.review_count, 0) AS review_count,
       ${distanceSelect}
     FROM profiles p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN user_subscriptions us ON us.user_id = p.user_id AND us.status = 'ACTIVE'
     LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
     LEFT JOIN (
       SELECT profile_id,
              ROUND(AVG(rating)::numeric, 1) AS avg_rating,
              COUNT(*)::int AS review_count
       FROM profile_reviews
       GROUP BY profile_id
     ) rs ON rs.profile_id = p.id
     ${where}
     ORDER BY ${orderBy}
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

// ── J. Reviews ────────────────────────────────────────────────────────────────

export async function getReviewStats(profileId) {
  const r = await pool.query(
    `SELECT
       COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating,
       COUNT(*)::int AS review_count
     FROM profile_reviews
     WHERE profile_id = $1`,
    [profileId],
  )
  return {
    avg_rating: parseFloat(r.rows[0].avg_rating) || 0,
    review_count: r.rows[0].review_count || 0,
  }
}

export async function listReviews(profileId, { page = 1, page_size = 20 } = {}) {
  const offset = (page - 1) * page_size
  const countResult = await pool.query(
    'SELECT COUNT(*) AS total FROM profile_reviews WHERE profile_id = $1',
    [profileId],
  )
  const total = parseInt(countResult.rows[0].total, 10)
  const data = await pool.query(
    `SELECT
       r.id, r.rating, r.comment, r.created_at, r.updated_at,
       r.reviewer_user_id,
       pr.display_name AS reviewer_name,
       pr.avatar_url AS reviewer_avatar,
       pr.slug AS reviewer_slug,
       -- include the reply if it exists
       rep.id AS reply_id,
       rep.body AS reply_body,
       rep.created_at AS reply_created_at,
       rep.updated_at AS reply_updated_at,
       rep.author_id AS reply_author_id,
       rep_author_profile.display_name AS reply_author_name,
       rep_author_profile.avatar_url AS reply_author_avatar,
       rep_author_profile.slug AS reply_author_slug
     FROM profile_reviews r
     LEFT JOIN profiles pr ON pr.user_id = r.reviewer_user_id
     LEFT JOIN profile_review_replies rep ON rep.review_id = r.id
     LEFT JOIN profiles rep_author_profile ON rep_author_profile.user_id = rep.author_id
     WHERE r.profile_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [profileId, page_size, offset],
  )

  // Shape the rows: nest the reply object
  const rows = data.rows.map(row => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewer_user_id: row.reviewer_user_id,
    reviewer_name: row.reviewer_name,
    reviewer_avatar: row.reviewer_avatar,
    reviewer_slug: row.reviewer_slug,
    reply: row.reply_id ? {
      id: row.reply_id,
      body: row.reply_body,
      created_at: row.reply_created_at,
      updated_at: row.reply_updated_at,
      author_id: row.reply_author_id,
      author_name: row.reply_author_name,
      author_avatar: row.reply_author_avatar,
      author_slug: row.reply_author_slug,
    } : null,
  }))

  return { rows, total }
}

export async function findReviewByReviewer(profileId, reviewerUserId) {
  const r = await pool.query(
    `SELECT id, profile_id, reviewer_user_id, rating, comment, created_at, updated_at
     FROM profile_reviews
     WHERE profile_id = $1 AND reviewer_user_id = $2`,
    [profileId, reviewerUserId],
  )
  return r.rows[0] || null
}

export async function insertReview({ profileId, reviewerUserId, rating, comment }) {
  const r = await pool.query(
    `INSERT INTO profile_reviews (profile_id, reviewer_user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, profile_id, reviewer_user_id, rating, comment, created_at, updated_at`,
    [profileId, reviewerUserId, rating, comment || null],
  )
  return r.rows[0]
}

export async function updateReview(id, reviewerUserId, { rating, comment }) {
  const r = await pool.query(
    `UPDATE profile_reviews
     SET rating = COALESCE($3, rating),
         comment = COALESCE($4, comment),
         updated_at = now()
     WHERE id = $1 AND reviewer_user_id = $2
     RETURNING id, profile_id, reviewer_user_id, rating, comment, created_at, updated_at`,
    [id, reviewerUserId, rating ?? null, comment === undefined ? null : comment],
  )
  return r.rows[0] || null
}

export async function deleteReview(id, reviewerUserId) {
  const r = await pool.query(
    'DELETE FROM profile_reviews WHERE id = $1 AND reviewer_user_id = $2 RETURNING id',
    [id, reviewerUserId],
  )
  return r.rows[0] || null
}

// ── K. Review Replies ─────────────────────────────────────────────────────────

export async function findReplyByReviewId(reviewId) {
  const r = await pool.query(
    `SELECT rr.*, u.display_name AS author_name, p.avatar_url AS author_avatar, p.slug AS author_slug
     FROM profile_review_replies rr
     JOIN users u ON u.id = rr.author_id
     LEFT JOIN profiles p ON p.user_id = rr.author_id
     WHERE rr.review_id = $1`,
    [reviewId]
  )
  return r.rows[0] || null
}

export async function insertReviewReply({ reviewId, authorId, body }) {
  const r = await pool.query(
    `INSERT INTO profile_review_replies (review_id, author_id, body)
     VALUES ($1, $2, $3)
     ON CONFLICT (review_id) DO UPDATE SET body = $3, updated_at = now()
     RETURNING *`,
    [reviewId, authorId, body]
  )
  return r.rows[0]
}

export async function deleteReviewReply(reviewId, authorId) {
  const r = await pool.query(
    `DELETE FROM profile_review_replies WHERE review_id = $1 AND author_id = $2 RETURNING id`,
    [reviewId, authorId]
  )
  return r.rowCount > 0
}

// ── L. Notifications ──────────────────────────────────────────────────────────

export async function createNotification({ userId, type, title, body, link }) {
  const r = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, body || null, link || null]
  )
  return r.rows[0]
}

export async function listNotifications(userId, limit = 20) {
  const r = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  )
  return r.rows
}

export async function countUnreadNotifications(userId) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  )
  return r.rows[0].count
}

export async function markNotificationRead(id, userId) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
}

export async function markAllNotificationsRead(userId) {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
    [userId]
  )
}
