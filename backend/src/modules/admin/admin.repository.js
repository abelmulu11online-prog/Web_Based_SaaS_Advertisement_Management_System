/**
 * admin.repository.js — SQL queries for admin operations.
 */
import pool from '../../db/index.js'

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getPlatformStats() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE status != 'DELETED')                  AS total_users,
      (SELECT COUNT(*) FROM users WHERE created_at > now() - INTERVAL '7d')   AS new_users_7d,
      (SELECT COUNT(*) FROM advertisements)                                    AS total_ads,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'PUBLISHED')         AS published_ads,
      (SELECT COUNT(*) FROM advertisements WHERE status = 'DRAFT')             AS draft_ads,
      (SELECT COUNT(*) FROM advertisements WHERE created_at > now() - INTERVAL '7d') AS new_ads_7d,
      (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'ACTIVE')        AS active_subscriptions,
      (SELECT COALESCE(SUM(amount_etb),0) FROM payment_records WHERE status = 'SUCCESS') AS total_revenue_etb,
      (SELECT COUNT(*) FROM payment_records WHERE status = 'SUCCESS')          AS total_payments,
      (SELECT COUNT(*) FROM payment_records WHERE status = 'PENDING')          AS pending_payments
  `)
  return result.rows[0]
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function findAllUsers({ page = 1, pageSize = 20, search = null, status = null, role = null }) {
  const conditions = ['1=1']
  const params = []
  let i = 1

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(u.email ILIKE $${i} OR u.phone ILIKE $${i})`)
    i++
  }
  if (status) { params.push(status); conditions.push(`u.status = $${i++}`) }
  if (role)   { params.push(role);   conditions.push(`u.role = $${i++}`) }

  const where = conditions.join(' AND ')

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM users u WHERE ${where}`, params
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(pageSize, (page - 1) * pageSize)
  const data = await pool.query(
    `SELECT u.id, u.email, u.phone, u.role, u.status,
            u.email_verified_at, u.created_at,
            (SELECT COUNT(*) FROM advertisements WHERE user_id = u.id) AS ad_count,
            us.status AS subscription_status,
            sp.name   AS plan_name
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
    `SELECT u.id, u.email, u.phone, u.role, u.status,
            u.email_verified_at, u.created_at, u.updated_at,
            us.status AS subscription_status,
            us.current_period_end,
            sp.name   AS plan_name,
            sp.display_name AS plan_display_name
     FROM users u
     LEFT JOIN user_subscriptions us ON us.user_id = u.id
     LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE u.id = $1`,
    [userId]
  )
  return result.rows[0] || null
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

// ── Advertisements ────────────────────────────────────────────────────────────

export async function findAllAds({ page = 1, pageSize = 20, search = null, status = null }) {
  const conditions = ['1=1']
  const params = []
  let i = 1

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(a.title ILIKE $${i} OR u.email ILIKE $${i})`)
    i++
  }
  if (status) { params.push(status); conditions.push(`a.status = $${i++}`) }

  const where = conditions.join(' AND ')

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM advertisements a JOIN users u ON u.id = a.user_id WHERE ${where}`,
    params
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(pageSize, (page - 1) * pageSize)
  const data = await pool.query(
    `SELECT a.id, a.title, a.status, a.price, a.price_type, a.created_at, a.published_at,
            a.user_id, u.email AS user_email,
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

export async function updateAdStatus(adId, status) {
  const result = await pool.query(
    `UPDATE advertisements SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status`,
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
