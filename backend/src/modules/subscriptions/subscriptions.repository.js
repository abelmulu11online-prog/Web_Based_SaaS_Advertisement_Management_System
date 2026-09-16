/**
 * subscriptions.repository.js — All SQL queries for the subscriptions module.
 *
 * Rules:
 *  - Parameterised queries ONLY ($1, $2, ...) — never string interpolation.
 *  - No HTTP logic, no business rules, no JWT here.
 *  - Every function that writes to the DB uses a transaction where
 *    more than one table is touched (atomicity guarantee).
 *
 * Sections:
 *  A. Plan read functions        (findAllActivePlans, findPlanById, findFreePlan)
 *  B. Subscription read          (findByUserId, countPublishedAdsByUserId)
 *  C. Payment write/read         (createPaymentRecord, findPaymentByTxRef, activateSubscription)
 *  D. Webhook audit              (paymentEventExists, insertPaymentEvent)
 *  E. Expiry / cron              (findExpiredActiveSubscriptions, expireSubscription)
 *  F. Payment history            (findPaymentHistory)
 */
import pool from '../../db/index.js'

// ── A. Plan read functions ─────────────────────────────────────────────────────

/**
 * List all active subscription plans ordered by sort_order.
 * Used by GET /api/subscriptions/plans (public pricing page).
 *
 * @returns {Promise<object[]>}
 */
export async function findAllActivePlans() {
  const result = await pool.query(
    `SELECT id, name, display_name, price_etb, max_active_ads,
            max_images_per_ad, is_featured, sort_order
     FROM subscription_plans
     WHERE is_active = TRUE
     ORDER BY sort_order ASC`,
  )
  return result.rows
}

/**
 * Find a single active plan by its UUID.
 * Used to validate plan_id before initialising a Chapa checkout.
 *
 * @param {string} planId — UUID
 * @returns {Promise<object|null>} plan row or null if not found / inactive
 */
export async function findPlanById(planId) {
  const result = await pool.query(
    `SELECT id, name, display_name, price_etb, max_active_ads,
            max_images_per_ad, is_featured
     FROM subscription_plans
     WHERE id = $1 AND is_active = TRUE`,
    [planId],
  )
  return result.rows[0] || null
}

/**
 * Find the FREE plan row.
 * Used by the auto-assign trigger logic and the expiry cron job.
 *
 * @returns {Promise<object>} FREE plan row (always exists after migration 016)
 */
export async function findFreePlan() {
  const result = await pool.query(
    `SELECT id, name, display_name, price_etb, max_active_ads, max_images_per_ad
     FROM subscription_plans
     WHERE name = 'FREE'
     LIMIT 1`,
  )
  return result.rows[0]
}

// ── B. Subscription read ───────────────────────────────────────────────────────

/**
 * Find a user's current subscription with plan details joined in.
 * This is the single source of truth for "what plan is this user on?".
 *
 * The JOIN gives us both the subscription row AND all the plan limits in
 * one query — no need for a second round-trip when enforcing limits.
 *
 * @param {string} userId — UUID from req.user.id
 * @returns {Promise<object|null>} combined subscription + plan row, or null
 */
export async function findByUserId(userId) {
  const result = await pool.query(
    `SELECT
       us.id,
       us.user_id,
       us.status,
       us.current_period_start,
       us.current_period_end,
       us.created_at,
       us.updated_at,
       -- Plan fields — prefixed so they don't collide with subscription fields
       sp.id                   AS plan_id,
       sp.name                 AS plan_name,
       sp.display_name         AS plan_display_name,
       sp.price_etb,
       sp.max_active_ads,
       sp.max_images_per_ad,
       sp.max_products,
       sp.max_profile_services,
       sp.max_portfolio_items,
       sp.max_posts,
       sp.is_featured
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = $1`,
    [userId],
  )
  return result.rows[0] || null
}

/**
 * Count how many advertisements the user currently has in PUBLISHED status.
 * Used in the publish gate: if count >= plan.max_active_ads → block.
 *
 * @param {string} userId — UUID
 * @returns {Promise<number>} count as a JavaScript number (not a string)
 */
export async function countPublishedAdsByUserId(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS total
     FROM advertisements
     WHERE user_id = $1 AND status = 'PUBLISHED'`,
    [userId],
  )
  return parseInt(result.rows[0].total, 10)
}

// ── C. Payment write / read ────────────────────────────────────────────────────

/**
 * Insert a PENDING payment record before redirecting to Chapa.
 *
 * This row is created BEFORE calling Chapa's initialize API so that
 * if the Chapa call fails we still have a record we can reconcile.
 *
 * @param {object} data
 * @param {string} data.userId     — FK to users
 * @param {string} data.planId     — FK to subscription_plans
 * @param {string} data.txRef      — server-generated reference (sub_{userId}_{ts})
 * @param {number} data.amountEtb  — from subscription_plans.price_etb (NEVER from client)
 * @returns {Promise<object>} the inserted row
 */
export async function createPaymentRecord({ userId, planId, txRef, amountEtb }) {
  const result = await pool.query(
    `INSERT INTO payment_records (user_id, plan_id, tx_ref, amount_etb, status)
     VALUES ($1, $2, $3, $4, 'PENDING')
     RETURNING *`,
    [userId, planId, txRef, amountEtb],
  )
  return result.rows[0]
}

/**
 * Find a payment record by our transaction reference.
 * Also joins the plan so callers can cross-check the expected amount.
 *
 * @param {string} txRef — the sub_{userId}_{timestamp} reference
 * @returns {Promise<object|null>}
 */
export async function findPaymentByTxRef(txRef) {
  const result = await pool.query(
    `SELECT
       pr.*,
       sp.price_etb,
       sp.name          AS plan_name,
       sp.display_name  AS plan_display_name
     FROM payment_records pr
     JOIN subscription_plans sp ON pr.plan_id = sp.id
     WHERE pr.tx_ref = $1`,
    [txRef],
  )
  return result.rows[0] || null
}

/**
 * Atomically activate a subscription after Chapa confirms payment.
 *
 * Two things happen in ONE database transaction:
 *   1. payment_records  → status = SUCCESS, fills in chapa_tx_id, payment_method, chapa_response
 *   2. user_subscriptions → status = ACTIVE, period_start = NOW(), period_end = NOW() + 30 days
 *
 * If either UPDATE fails the whole transaction rolls back — no partial state.
 *
 * @param {object} params
 * @param {string} params.txRef           — our transaction reference
 * @param {string} params.chapaTxId       — Chapa's own transaction ID
 * @param {string} params.paymentMethod   — e.g. 'telebirr', 'cbe_birr'
 * @param {object} params.chapaResponse   — full Chapa verify API response (stored as JSONB)
 * @param {string} params.userId          — FK to users
 * @param {string} params.planId          — FK to subscription_plans
 * @returns {Promise<void>}
 */
export async function activateSubscription({
  txRef,
  chapaTxId,
  paymentMethod,
  chapaResponse,
  userId,
  planId,
}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Mark the payment record as successful
    await client.query(
      `UPDATE payment_records
       SET status          = 'SUCCESS',
           chapa_tx_id     = $1,
           payment_method  = $2,
           chapa_response  = $3,
           updated_at      = now()
       WHERE tx_ref = $4`,
      [chapaTxId, paymentMethod, JSON.stringify(chapaResponse), txRef],
    )

    // 2. Activate the subscription with a new 30-day billing period
    await client.query(
      `UPDATE user_subscriptions
       SET plan_id              = $1,
           status               = 'ACTIVE',
           current_period_start = now(),
           current_period_end   = now() + INTERVAL '30 days',
           updated_at           = now()
       WHERE user_id = $2`,
      [planId, userId],
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── D. Webhook audit ──────────────────────────────────────────────────────────

/**
 * Check whether a webhook event has already been processed.
 *
 * Called at the START of the webhook handler — before any DB writes.
 * If this returns true the handler returns 200 immediately (idempotent exit).
 *
 * @param {string} txRef — chapa_tx_ref from the webhook payload
 * @returns {Promise<boolean>}
 */
export async function paymentEventExists(txRef) {
  const result = await pool.query(
    'SELECT 1 FROM payment_events WHERE chapa_tx_ref = $1 LIMIT 1',
    [txRef],
  )
  return result.rowCount > 0
}

/**
 * Insert a row into the immutable payment_events audit log.
 *
 * This is done FIRST in the webhook handler — before calling the Chapa
 * Verify API or activating the subscription. The UNIQUE constraint on
 * chapa_tx_ref acts as a distributed lock: if two server instances process
 * the same webhook simultaneously, only one INSERT succeeds. The other
 * gets a PostgreSQL error 23505 (unique_violation) which the caller catches
 * and handles as an idempotent exit.
 *
 * @param {object} data
 * @param {string} data.txRef      — the chapa_tx_ref from the webhook
 * @param {string} data.eventType  — e.g. 'charge.completed'
 * @param {object} data.payload    — the full raw webhook body
 * @returns {Promise<void>}
 */
export async function insertPaymentEvent({ txRef, eventType, payload }) {
  await pool.query(
    `INSERT INTO payment_events (chapa_tx_ref, event_type, payload, processed_at)
     VALUES ($1, $2, $3, now())`,
    [txRef, eventType, JSON.stringify(payload)],
  )
}

// ── E. Expiry / cron ──────────────────────────────────────────────────────────

/**
 * Find all ACTIVE subscriptions whose billing period has already ended.
 * Called by the daily expiry cron job.
 *
 * A subscription can be ACTIVE in the database but past its end date if
 * the cron job hasn't run yet today. The publish gate also checks the date
 * directly for this reason (see advertisements.service.js).
 *
 * @returns {Promise<object[]>} array of { id, user_id, plan_id }
 */
export async function findExpiredActiveSubscriptions() {
  const result = await pool.query(
    `SELECT id, user_id, plan_id
     FROM user_subscriptions
     WHERE status = 'ACTIVE'
       AND current_period_end < NOW()`,
  )
  return result.rows
}

/**
 * Atomically expire a subscription and pause all of that user's PUBLISHED ads.
 *
 * Three things happen in ONE transaction:
 *   1. user_subscriptions → status = EXPIRED, plan_id downgraded to FREE
 *   2. advertisements     → status = PAUSED  (all PUBLISHED ads for this user)
 *
 * If either UPDATE fails the whole thing rolls back.
 *
 * @param {string} subscriptionId — UUID of the user_subscriptions row
 * @param {string} userId         — UUID of the user
 * @param {string} freePlanId     — UUID of the FREE plan (from findFreePlan)
 * @returns {Promise<number>} count of advertisements that were paused
 */
export async function expireSubscription(subscriptionId, userId, freePlanId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Mark subscription as expired and downgrade to FREE plan
    await client.query(
      `UPDATE user_subscriptions
       SET status     = 'EXPIRED',
           plan_id    = $1,
           updated_at = now()
       WHERE id = $2`,
      [freePlanId, subscriptionId],
    )

    // 2. Pause all of this user's currently PUBLISHED advertisements
    const pauseResult = await client.query(
      `UPDATE advertisements
       SET status     = 'PAUSED',
           updated_at = now()
       WHERE user_id = $1
         AND status  = 'PUBLISHED'
       RETURNING id`,
      [userId],
    )

    await client.query('COMMIT')
    return pauseResult.rowCount
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Mark a PENDING payment record as FAILED.
 * Called when the user abandons the Chapa checkout.
 *
 * @param {string} txRef — our transaction reference
 * @returns {Promise<void>}
 */
export async function markPaymentFailed(txRef) {
  await pool.query(
    `UPDATE payment_records
     SET status     = 'FAILED',
         updated_at = now()
     WHERE tx_ref = $1
       AND status  = 'PENDING'`,
    [txRef],
  )
}

// ── F. Payment history ────────────────────────────────────────────────────────

/**
 * Paginated payment history for a user.
 * Used by GET /api/subscriptions/history.
 *
 * Runs two queries:
 *   1. COUNT — to get the total so the frontend can render pagination controls
 *   2. SELECT — to get the current page of records
 *
 * @param {string} userId
 * @param {number} [page=1]       — 1-based page number
 * @param {number} [pageSize=20]  — items per page (max 100, enforced by service)
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findPaymentHistory(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize

  // Count query — needed for total_pages calculation
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM payment_records
     WHERE user_id = $1`,
    [userId],
  )
  const total = parseInt(countResult.rows[0].total, 10)

  // Data query — includes plan name for display
  const dataResult = await pool.query(
    `SELECT
       pr.id,
       pr.tx_ref,
       pr.chapa_tx_id,
       pr.amount_etb,
       pr.status,
       pr.payment_method,
       pr.created_at,
       pr.updated_at,
       sp.name          AS plan_name,
       sp.display_name  AS plan_display_name
     FROM payment_records pr
     JOIN subscription_plans sp ON pr.plan_id = sp.id
     WHERE pr.user_id = $1
     ORDER BY pr.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  )

  return { rows: dataResult.rows, total }
}

// ── G. Admin queries ──────────────────────────────────────────────────────────

/**
 * Platform-wide subscription statistics.
 * Used by GET /api/subscriptions/admin/overview.
 *
 * @returns {Promise<object>}
 */
export async function getSubscriptionStats() {
  const result = await pool.query(
    `SELECT
       COUNT(*)                                              AS total_users,
       COUNT(*) FILTER (WHERE us.status = 'ACTIVE')         AS active_subscriptions,
       COUNT(*) FILTER (WHERE us.status = 'EXPIRED')        AS expired_subscriptions,
       COUNT(*) FILTER (WHERE sp.name = 'FREE')             AS free_plan_users,
       COUNT(*) FILTER (WHERE sp.name = 'BASIC')            AS basic_plan_users,
       COUNT(*) FILTER (WHERE sp.name = 'PRO')              AS pro_plan_users,
       COUNT(*) FILTER (WHERE sp.name = 'BUSINESS')         AS business_plan_users,
       COALESCE(SUM(pr.amount_etb) FILTER (WHERE pr.status = 'SUCCESS'), 0) AS total_revenue_etb,
       COUNT(pr.id) FILTER (WHERE pr.status = 'SUCCESS')    AS total_successful_payments,
       COUNT(pr.id) FILTER (WHERE pr.status = 'PENDING')    AS pending_payments
     FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     LEFT JOIN payment_records pr ON pr.user_id = us.user_id`,
  )
  return result.rows[0]
}

/**
 * Paginated list of all user subscriptions for the admin view.
 * Joins users, subscription_plans, and user_subscriptions.
 *
 * @param {object} options
 * @param {number} options.page
 * @param {number} options.pageSize
 * @param {string|null} options.search  — matches against email or username
 * @param {string|null} options.status  — 'ACTIVE' | 'EXPIRED' | 'FREE' etc.
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAllSubscriptions({ page = 1, pageSize = 20, search = null, status = null }) {
  const offset = (page - 1) * pageSize
  const params = []

  let whereClause = 'WHERE 1=1'

  if (search) {
    params.push(`%${search}%`)
    whereClause += ` AND (u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`
  }

  if (status) {
    params.push(status.toUpperCase())
    whereClause += ` AND us.status = $${params.length}`
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM user_subscriptions us
     JOIN users u ON us.user_id = u.id
     ${whereClause}`,
    params,
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(pageSize, offset)
  const dataResult = await pool.query(
    `SELECT
       us.id,
       us.user_id,
       us.status,
       us.current_period_start,
       us.current_period_end,
       us.created_at,
       u.email,
       u.phone,
       sp.name          AS plan_name,
       sp.display_name  AS plan_display_name,
       sp.price_etb
     FROM user_subscriptions us
     JOIN users u  ON us.user_id = u.id
     JOIN subscription_plans sp ON us.plan_id = sp.id
     ${whereClause}
     ORDER BY us.updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )

  return { rows: dataResult.rows, total }
}

/**
 * Paginated list of all payment records for the admin view.
 *
 * @param {object} options
 * @param {number} options.page
 * @param {number} options.pageSize
 * @param {string|null} options.status — 'PENDING' | 'SUCCESS' | 'FAILED'
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function findAllPayments({ page = 1, pageSize = 20, status = null }) {
  const offset = (page - 1) * pageSize
  const params = []

  let whereClause = 'WHERE 1=1'

  if (status) {
    params.push(status.toUpperCase())
    whereClause += ` AND pr.status = $${params.length}`
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM payment_records pr ${whereClause}`,
    params,
  )
  const total = parseInt(countResult.rows[0].total, 10)

  params.push(pageSize, offset)
  const dataResult = await pool.query(
    `SELECT
       pr.id,
       pr.tx_ref,
       pr.chapa_tx_id,
       pr.amount_etb,
       pr.status,
       pr.payment_method,
       pr.created_at,
       pr.updated_at,
       u.email,
       u.phone,
       sp.name         AS plan_name,
       sp.display_name AS plan_display_name
     FROM payment_records pr
     JOIN users u  ON pr.user_id = u.id
     JOIN subscription_plans sp ON pr.plan_id = sp.id
     ${whereClause}
     ORDER BY pr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )

  return { rows: dataResult.rows, total }
}
