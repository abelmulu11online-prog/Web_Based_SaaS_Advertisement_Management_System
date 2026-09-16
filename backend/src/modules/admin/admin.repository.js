/**
 * admin.repository.js — SQL queries for admin operations.
 * Parameterised queries only — never string interpolation.
 */
import pool from '../../db/index.js'

// ── Platform Stats ────────────────────────────────────────────────────────────

export async function getPlatformStats() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE status != 'DELETED')                           AS total_users,
      (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE')                             AS active_users,
      (SELECT COUNT(*) FROM users WHERE status = 'SUSPENDED')                          AS suspended_users,
      (SELECT COUNT(*) FROM users WHERE created_at > now() - INTERVAL '7 days')        AS new_users_7d,
      (SELECT COUNT(*) FROM users WHERE created_at > now() - INTERVAL '30 days')       AS new_users_30d,
      (SELECT COUNT(*) FROM advertisements)                                             AS total_ads,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'PUBLISHED')                 AS published_ads,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'DRAFT')                     AS draft_ads,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'PAUSED')                    AS paused_ads,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'ARCHIVED')                  AS archived_ads,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'EXPIRED')                   AS expired_ads,
      (SELECT COUNT(*) FROM advertisements WHERE created_at > now() - INTERVAL '7 days')  AS new_ads_7d,
      (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'ACTIVE')                AS active_subscriptions,
      (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'EXPIRED')               AS expired_subscriptions,
      (SELECT COALESCE(SUM(amount_etb), 0) FROM payment_records WHERE status = 'SUCCESS') AS total_revenue_etb,
      (SELECT COALESCE(SUM(amount_etb), 0) FROM payment_records
         WHERE status = 'SUCCESS' AND created_at > now() - INTERVAL '30 days')         AS revenue_30d_etb,
      (SELECT COUNT(*) FROM payment_records WHERE status = 'SUCCESS')                  AS total_payments,
      (SELECT COUNT(*) FROM payment_records WHERE status = 'PENDING')                  AS pending_payments,
      (SELECT COUNT(*) FROM payment_records WHERE status = 'FAILED')                   AS failed_payments,
      (SELECT COUNT(*) FROM categories WHERE is_active = TRUE)                         AS active_categories,
      (SELECT COUNT(*) FROM categories)                                                 AS total_categories
  `)
  return result.rows[0]
}

// ── Analytics ────────────────────────────────────────────────────────────────

/**
 * Returns time-series data for the last 30 days:
 *  - new users per day
 *  - new ads per day
 *  - ads by status (snapshot counts)
 *  - ads by category (top 10)
 *  - subscriptions by plan
 */
export async function getAnalyticsData() {
  const [usersDaily, adsDaily, adsByStatus, adsByCategory, subsByPlan, revenueDaily] =
    await Promise.all([
      // New users per day — last 30 days
      pool.query(`
        SELECT
          date_trunc('day', created_at)::date AS date,
          COUNT(*) AS count
        FROM users
        WHERE created_at >= now() - INTERVAL '30 days'
          AND status != 'DELETED'
        GROUP BY 1
        ORDER BY 1
      `),

      // New ads per day — last 30 days
      pool.query(`
        SELECT
          date_trunc('day', created_at)::date AS date,
          COUNT(*) AS count
        FROM advertisements
        WHERE created_at >= now() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `),

      // Ads by status (current snapshot)
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM advertisements
        GROUP BY status
        ORDER BY count DESC
      `),

      // Ads by category (top 10 active categories)
      pool.query(`
        SELECT
          COALESCE(c.name, 'Uncategorized') AS category,
          COUNT(a.id) AS count
        FROM advertisements a
        LEFT JOIN categories c ON c.id = a.category_id
        GROUP BY COALESCE(c.name, 'Uncategorized')
        ORDER BY count DESC
        LIMIT 10
      `),

      // Active subscriptions by plan
      pool.query(`
        SELECT
          sp.display_name AS plan,
          sp.name         AS plan_name,
          COUNT(us.id)    AS count
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        GROUP BY sp.id, sp.display_name, sp.name, sp.sort_order
        ORDER BY sp.sort_order
      `),

      // Revenue per day — last 30 days (successful payments only)
      pool.query(`
        SELECT
          date_trunc('day', created_at)::date AS date,
          COALESCE(SUM(amount_etb), 0)        AS revenue
        FROM payment_records
        WHERE status = 'SUCCESS'
          AND created_at >= now() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `),
    ])

  return {
    users_daily:    usersDaily.rows,
    ads_daily:      adsDaily.rows,
    ads_by_status:  adsByStatus.rows,
    ads_by_category: adsByCategory.rows,
    subs_by_plan:   subsByPlan.rows,
    revenue_daily:  revenueDaily.rows,
  }
}

// ── Revenue ───────────────────────────────────────────────────────────────────

export async function getRevenueData() {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(amount_etb) FILTER (WHERE status = 'SUCCESS'), 0)                         AS total_revenue_etb,
      COALESCE(SUM(amount_etb) FILTER (WHERE status = 'SUCCESS'
        AND created_at >= date_trunc('month', now())), 0)                                     AS current_month_etb,
      COALESCE(SUM(amount_etb) FILTER (WHERE status = 'SUCCESS'
        AND created_at >= date_trunc('month', now()) - INTERVAL '1 month'
        AND created_at < date_trunc('month', now())), 0)                                      AS last_month_etb,
      COUNT(*) FILTER (WHERE status = 'SUCCESS')                                              AS successful_payments,
      COUNT(*) FILTER (WHERE status = 'PENDING')                                              AS pending_payments,
      COUNT(*) FILTER (WHERE status = 'FAILED')                                               AS failed_payments,
      COUNT(*) FILTER (WHERE status = 'SUCCESS'
        AND created_at >= date_trunc('month', now()))                                         AS payments_this_month
    FROM payment_records
  `)
  // Revenue by plan
  const byPlan = await pool.query(`
    SELECT
      sp.display_name AS plan,
      sp.name         AS plan_name,
      COUNT(pr.id)    AS payment_count,
      COALESCE(SUM(pr.amount_etb), 0) AS revenue_etb
    FROM payment_records pr
    JOIN subscription_plans sp ON sp.id = pr.plan_id
    WHERE pr.status = 'SUCCESS'
    GROUP BY sp.id, sp.display_name, sp.name, sp.sort_order
    ORDER BY sp.sort_order
  `)
  return {
    ...result.rows[0],
    revenue_by_plan: byPlan.rows,
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function findAllUsers({ page = 1, pageSize = 20, search = null, status = null, role = null }) {
  const conditions = ['u.status != \'DELETED\'']
  const params = []
  let i = 1

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(u.email ILIKE $${i} OR u.phone ILIKE $${i})`)
    i++
  }
  if (status) { params.push(status); conditions.push(`u.status = $${i++}`) }
  if (role)   { params.push(role.toUpperCase()); conditions.push(`u.role = $${i++}`) }

  const where = conditions.join(' AND ')

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM users u WHERE ${where}`, params
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(pageSize, (page - 1) * pageSize)
  const data = await pool.query(
    `SELECT
       u.id, u.email, u.phone, u.role, u.status,
       u.email_verified_at, u.created_at,
       (SELECT COUNT(*) FROM advertisements WHERE user_id = u.id)            AS ad_count,
       (SELECT COUNT(*) FROM advertisements WHERE user_id = u.id
          AND status = 'PUBLISHED')                                           AS published_ad_count,
       us.status   AS subscription_status,
       sp.name     AS plan_name,
       sp.display_name AS plan_display_name
     FROM users u
     LEFT JOIN user_subscriptions us ON us.user_id = u.id
     LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE ${where}
     ORDER BY u.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  )
  return { rows: data.rows, total }
}

export async function findUserById(userId) {
  const result = await pool.query(
    `SELECT
       u.id, u.email, u.phone, u.role, u.status,
       u.email_verified_at, u.created_at, u.updated_at,
       us.status              AS subscription_status,
       us.current_period_end,
       us.current_period_start,
       sp.name                AS plan_name,
       sp.display_name        AS plan_display_name,
       sp.price_etb
     FROM users u
     LEFT JOIN user_subscriptions us ON us.user_id = u.id
     LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE u.id = $1`,
    [userId]
  )
  return result.rows[0] || null
}

export async function findUserAds(userId, { page = 1, pageSize = 20 } = {}) {
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM advertisements WHERE user_id = $1`,
    [userId]
  )
  const total = parseInt(countResult.rows[0].total, 10)

  const data = await pool.query(
    `SELECT
       a.id, a.title, a.status, a.price, a.price_type,
       a.created_at, a.published_at,
       c.name AS category_name,
       (SELECT COUNT(*) FROM advertisement_images WHERE advertisement_id = a.id) AS image_count
     FROM advertisements a
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, (page - 1) * pageSize]
  )
  return { rows: data.rows, total }
}

export async function updateUserStatus(userId, status) {
  const result = await pool.query(
    `UPDATE users SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status`,
    [status, userId]
  )
  return result.rows[0] || null
}

export async function updateUserRole(userId, role) {
  const result = await pool.query(
    `UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING id, role`,
    [role, userId]
  )
  return result.rows[0] || null
}

export async function deleteUserById(userId) {
  const result = await pool.query(
    `DELETE FROM users WHERE id = $1 RETURNING id`,
    [userId]
  )
  return result.rowCount > 0
}

// ── Advertisements ────────────────────────────────────────────────────────────

export async function findAllAds({ page = 1, pageSize = 20, search = null, status = null, category_id = null }) {
  const conditions = ['1=1']
  const params = []
  let i = 1

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(a.title ILIKE $${i} OR u.email ILIKE $${i})`)
    i++
  }
  if (status)      { params.push(status.toUpperCase()); conditions.push(`a.status = $${i++}`) }
  if (category_id) { params.push(category_id);          conditions.push(`a.category_id = $${i++}`) }

  const where = conditions.join(' AND ')

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM advertisements a
     JOIN users u ON u.id = a.user_id
     WHERE ${where}`,
    params
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(pageSize, (page - 1) * pageSize)
  const data = await pool.query(
    `SELECT
       a.id, a.title, a.status, a.price, a.price_type,
       a.address, a.latitude, a.longitude,
       a.contact_email, a.contact_phone,
       a.created_at, a.published_at, a.expires_at,
       a.user_id, u.email AS user_email,
       c.id   AS category_id,
       c.name AS category_name,
       (SELECT COUNT(*) FROM advertisement_images WHERE advertisement_id = a.id) AS image_count
     FROM advertisements a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  )
  return { rows: data.rows, total }
}

export async function findAdById(adId) {
  const ad = await pool.query(
    `SELECT
       a.*,
       u.email AS user_email,
       u.role  AS user_role,
       c.name  AS category_name
     FROM advertisements a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN categories c ON c.id = a.category_id
     WHERE a.id = $1`,
    [adId]
  )
  if (!ad.rows[0]) return null

  const images = await pool.query(
    `SELECT id, url, storage_key, position
     FROM advertisement_images
     WHERE advertisement_id = $1
     ORDER BY position`,
    [adId]
  )
  return { ...ad.rows[0], images: images.rows }
}

export async function updateAdStatus(adId, status) {
  const result = await pool.query(
    `UPDATE advertisements
     SET status = $1,
         published_at = CASE WHEN $1 = 'PUBLISHED' AND published_at IS NULL THEN now() ELSE published_at END,
         updated_at = now()
     WHERE id = $2
     RETURNING id, status, published_at`,
    [status, adId]
  )
  return result.rows[0] || null
}

export async function deleteAdById(adId) {
  const result = await pool.query(
    `DELETE FROM advertisements WHERE id = $1 RETURNING id`,
    [adId]
  )
  return result.rowCount > 0
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function findAllCategories() {
  const result = await pool.query(
    `SELECT
       c.id, c.parent_id, c.name, c.slug, c.description,
       c.icon, c.is_active, c.created_at,
       p.name AS parent_name,
       (SELECT COUNT(*) FROM advertisements a WHERE a.category_id = c.id) AS ad_count
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     ORDER BY c.parent_id NULLS FIRST, c.name`
  )
  return result.rows
}

export async function findCategoryBySlug(slug, excludeId = null) {
  const params = [slug]
  let where = 'slug = $1'
  if (excludeId) { params.push(excludeId); where += ` AND id != $2` }
  const result = await pool.query(`SELECT id FROM categories WHERE ${where}`, params)
  return result.rows[0] || null
}

export async function insertCategory({ name, slug, description, icon, parent_id, is_active = true }) {
  const result = await pool.query(
    `INSERT INTO categories (name, slug, description, icon, parent_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, parent_id, name, slug, description, icon, is_active, created_at`,
    [name, slug, description || null, icon || null, parent_id || null, is_active]
  )
  return result.rows[0]
}

export async function updateCategoryById(catId, fields) {
  // Build a dynamic SET clause from only the fields provided
  const setClauses = []
  const params = []
  let i = 1

  const allowed = ['name', 'slug', 'description', 'icon', 'parent_id', 'is_active']
  for (const key of allowed) {
    if (key in fields) {
      setClauses.push(`${key} = $${i++}`)
      params.push(fields[key])
    }
  }

  if (setClauses.length === 0) return null

  setClauses.push(`updated_at = now()`)
  params.push(catId)

  const result = await pool.query(
    `UPDATE categories SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  )
  return result.rows[0] || null
}

export async function findCategoryById(catId) {
  const result = await pool.query(
    `SELECT id, parent_id, name, slug, description, icon, is_active, created_at
     FROM categories WHERE id = $1`,
    [catId]
  )
  return result.rows[0] || null
}

// ── Profile Verifications ─────────────────────────────────────────────────────

/**
 * List profiles with a given verification status (paginated).
 * Used by the admin verification queue.
 */
export async function findProfilesByVerificationStatus({
  page = 1, pageSize = 20,
  status = 'UNDER_REVIEW',
  search = null,
  profile_type = null,
}) {
  const conditions = []
  const params = []
  let i = 1

  if (status) {
    params.push(status)
    conditions.push(`p.verification_status = $${i++}::verification_status`)
  }
  if (profile_type) {
    params.push(profile_type)
    conditions.push(`p.profile_type = $${i++}::profile_type`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(p.display_name ILIKE $${i} OR p.business_name ILIKE $${i} OR u.email ILIKE $${i})`)
    i++
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     ${where}`,
    params
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(pageSize, (page - 1) * pageSize)
  const data = await pool.query(
    `SELECT
       p.id, p.display_name, p.slug, p.profile_type,
       p.verification_status, p.is_published,
       p.business_name, p.business_type, p.license_number,
       p.business_city, p.business_country,
       p.additional_information,
       p.rejection_reason,
       p.reviewed_at, p.updated_at, p.created_at,
       u.id   AS user_id,
       u.email AS user_email,
       u.phone AS user_phone,
       u.status AS user_status,
       vd.id          AS doc_id,
       vd.document_name,
       vd.document_type,
       vd.mime_type,
       vd.uploaded_at AS doc_uploaded_at
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN verification_documents vd ON vd.profile_id = p.id
     ${where}
     ORDER BY p.updated_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  )
  return { rows: data.rows, total }
}

/**
 * Get full profile verification detail for admin review.
 * Includes all business/legal fields, document info, and user info.
 * Does NOT include the document storage_key or a signed URL —
 * that is generated on demand by the service layer.
 */
export async function findProfileVerificationById(profileId) {
  const result = await pool.query(
    `SELECT
       p.id, p.user_id, p.display_name, p.slug, p.profile_type,
       p.headline, p.description,
       p.verification_status, p.is_published,
       p.business_name, p.business_type,
       p.license_number, p.license_issue_date, p.license_expiry_date,
       p.business_address, p.business_city, p.business_region, p.business_country,
       p.additional_information,
       p.contact_phone, p.contact_email, p.website_url,
       p.country, p.region, p.city,
       p.avatar_url,
       p.rejection_reason,
       p.reviewed_by, p.reviewed_at,
       p.published_at, p.created_at, p.updated_at,
       u.email  AS user_email,
       u.phone  AS user_phone,
       u.status AS user_status,
       u.created_at AS user_created_at,
       reviewer.email AS reviewer_email,
       vd.id           AS doc_id,
       vd.document_name,
       vd.document_type,
       vd.storage_key  AS doc_storage_key,
       vd.mime_type    AS doc_mime_type,
       vd.file_size    AS doc_file_size,
       vd.uploaded_at  AS doc_uploaded_at
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
     LEFT JOIN verification_documents vd ON vd.profile_id = p.id
     WHERE p.id = $1`,
    [profileId]
  )
  return result.rows[0] || null
}

/**
 * Admin action: update verification_status + review tracking fields.
 * Also handles is_verified (legacy boolean) in sync.
 */
export async function updateProfileVerificationStatus(profileId, {
  status,
  reviewedBy,
  rejectionReason = null,
  adminNotes = null,
}) {
  const isActive = status === 'ACTIVE' || status === 'VERIFIED'
  const result = await pool.query(
    `UPDATE profiles
     SET verification_status = $1::verification_status,
         is_verified         = $2,
         reviewed_by         = $3,
         reviewed_at         = now(),
         rejection_reason    = $4,
         updated_at          = now()
     WHERE id = $5
     RETURNING id, verification_status, is_verified, reviewed_by, reviewed_at, rejection_reason`,
    [status, isActive, reviewedBy, rejectionReason, profileId]
  )
  return result.rows[0] || null
}

/**
 * Update admin_notes on the verification document (optional, after review).
 */
export async function updateDocumentAdminNotes(profileId, adminNotes) {
  await pool.query(
    `UPDATE verification_documents SET admin_notes = $1 WHERE profile_id = $2`,
    [adminNotes, profileId]
  )
}

/**
 * Count profiles currently under review (for admin dashboard stat card).
 */
export async function countProfilesUnderReview() {
  const result = await pool.query(
    `SELECT COUNT(*) AS count FROM profiles WHERE verification_status = 'UNDER_REVIEW'`
  )
  return parseInt(result.rows[0].count, 10)
}

// ── Subscriptions (admin view — proxies to subscriptions.repository) ──────────
// We import from subscriptions repo directly in service; no duplication here.
