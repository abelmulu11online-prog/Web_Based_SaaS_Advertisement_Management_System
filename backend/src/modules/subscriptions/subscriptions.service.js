/**
 * subscriptions.service.js — Business logic for the subscriptions module.
 *
 * Responsibilities:
 *  - Listing subscription plans
 *  - Getting a user's current subscription with live usage
 *  - Initialising a Chapa checkout session
 *  - Checking payment status (manual fallback for when webhook is delayed)
 *  - Activating a subscription after Chapa confirms payment
 *  - Returning paginated payment history
 *
 * Does NOT contain: SQL, HTTP logic, JWT, or request/response handling.
 * All SQL goes through subscriptions.repository.js.
 * All HTTP goes through subscriptions.controller.js.
 */
import { createError } from '../../utils/index.js'
import logger from '../../utils/logger.js'
import { config } from '../../config/index.js'
import * as repo from './subscriptions.repository.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHAPA_INITIALIZE_URL = 'https://api.chapa.co/v1/transaction/initialize'
const CHAPA_VERIFY_URL     = 'https://api.chapa.co/v1/transaction/verify'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE     = 100

// ── A. Plan listing ───────────────────────────────────────────────────────────

/**
 * List all active subscription plans.
 * Used by the public GET /api/subscriptions/plans endpoint.
 *
 * No auth required — anyone can see the pricing page.
 *
 * @returns {Promise<object[]>} array of plan objects
 */
export async function listPlans() {
  return repo.findAllActivePlans()
}

// ── B. Current subscription ───────────────────────────────────────────────────

/**
 * Get the authenticated user's subscription with live usage counts.
 *
 * Returns:
 *  - subscription status and billing period dates
 *  - the plan they are on (with all limits)
 *  - how many ads they have published right now vs their plan maximum
 *  - days_remaining until their plan expires (null for FREE — never expires)
 *
 * @param {string} userId — from req.user.id (JWT payload)
 * @returns {Promise<object>}
 */
export async function getMySubscription(userId) {
  const subscription = await repo.findByUserId(userId)

  if (!subscription) {
    // This should never happen after migration 020 trigger is active,
    // but we guard against users created before the trigger was added.
    throw createError(
      'Subscription record not found. Please contact support.',
      404,
      'SUBSCRIPTION_NOT_FOUND',
    )
  }

  // Count how many of the plan's ad slots are currently in use
  const activeAdCount = await repo.countPublishedAdsByUserId(userId)

  // Calculate days remaining in the current billing period.
  // FREE plan has no end date — days_remaining is null.
  let daysRemaining = null
  if (subscription.current_period_end) {
    const msRemaining = new Date(subscription.current_period_end) - new Date()
    daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
  }

  return {
    id:                   subscription.id,
    status:               subscription.status,
    current_period_start: subscription.current_period_start,
    current_period_end:   subscription.current_period_end,
    days_remaining:       daysRemaining,
    plan: {
      id:                subscription.plan_id,
      name:              subscription.plan_name,
      display_name:      subscription.plan_display_name,
      price_etb:         parseFloat(subscription.price_etb),
      max_active_ads:    subscription.max_active_ads,
      max_images_per_ad: subscription.max_images_per_ad,
      is_featured:       subscription.is_featured,
    },
    usage: {
      active_ads:    activeAdCount,
      remaining_ads: Math.max(0, subscription.max_active_ads - activeAdCount),
    },
  }
}

// ── C. Checkout ───────────────────────────────────────────────────────────────

/**
 * Initialise a Chapa payment session for the given plan.
 *
 * Steps:
 *  1. Validate the plan (must exist and be active, must not be FREE)
 *  2. Generate a server-side tx_ref — NEVER from client input
 *  3. Save a PENDING payment_record BEFORE calling Chapa
 *  4. Call Chapa initialize API
 *  5. Return { checkout_url, tx_ref } to the controller
 *
 * Security:
 *  - tx_ref is generated here, never from request body
 *  - amount is taken from the plan's price_etb in the DB, never from client
 *  - userId is from req.user.id (JWT), never from request body
 *
 * @param {string} userId       — from req.user.id
 * @param {string} planId       — validated plan UUID from request body
 * @param {object} userProfile  — { email, first_name, last_name } for Chapa's hosted page
 * @returns {Promise<{ checkout_url: string, tx_ref: string }>}
 */
export async function initializeCheckout(userId, planId, userProfile) {
  // 1. Validate the plan
  const plan = await repo.findPlanById(planId)

  if (!plan) {
    throw createError('Plan not found or no longer available', 404, 'PLAN_NOT_FOUND')
  }

  if (plan.name === 'FREE') {
    throw createError(
      'The FREE plan does not require a payment',
      409,
      'FREE_PLAN_NO_CHECKOUT',
    )
  }

  // 2. Generate tx_ref server-side
  // Chapa constraints: ≤ 50 chars, alphanumeric + underscores only (no hyphens).
  // We use the last 13 digits of Date.now() (ms timestamp) + first 8 hex chars
  // of the userId to guarantee uniqueness without exceeding 50 chars.
  // Result example: sub_aaec798d_1787941955123  (28 chars — well under 50)
  const shortUserId = userId.replace(/-/g, '').substring(0, 8)
  const txRef = `sub_${shortUserId}_${Date.now()}`

  // 3. Save PENDING record BEFORE calling Chapa
  // If Chapa is unreachable, the PENDING row stays so reconciliation is possible.
  await repo.createPaymentRecord({
    userId,
    planId:    plan.id,
    txRef,
    amountEtb: plan.price_etb,
  })

  // 4. Build Chapa request body — respecting all field length limits:
  //   email                    ≤ 50 chars
  //   tx_ref                   ≤ 50 chars  (guaranteed above)
  //   customization.title      ≤ 16 chars
  //   customization.description≤ 50 chars, only [a-zA-Z0-9 ._-]
  const safeEmail = (userProfile.email || `pay_${shortUserId}@demo.et`).substring(0, 50)
  const safeTitle = `${plan.display_name} Plan`.substring(0, 16)
  const safeDesc  = `${plan.display_name} plan - ETB ${plan.price_etb}`.substring(0, 50)

  const chapaBody = {
    amount:      plan.price_etb.toString(),
    currency:    'ETB',
    email:       safeEmail,
    first_name:  (userProfile.first_name || 'User').substring(0, 50),
    last_name:   (userProfile.last_name  || '').substring(0, 50),
    tx_ref:      txRef,
    return_url:  `${config.frontendUrl}/subscription/callback?tx_ref=${txRef}`,
    customization: {
      title:       safeTitle,
      description: safeDesc,
    },
  }

  let chapaData
  try {
    const chapaRes = await fetch(CHAPA_INITIALIZE_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${config.chapa.secretKey}`,
      },
      body: JSON.stringify(chapaBody),
    })
    chapaData = await chapaRes.json()
  } catch (fetchErr) {
    logger.error({ err: fetchErr, userId, planId }, 'Chapa initialize fetch failed')
    throw createError(
      'Payment gateway is unreachable. Please try again.',
      502,
      'CHAPA_ERROR',
    )
  }

  if (chapaData.status !== 'success' || !chapaData.data?.checkout_url) {
    logger.error({ userId, planId, chapaData }, 'Chapa initialize returned non-success')
    throw createError(
      'Payment gateway error. Please try again.',
      502,
      'CHAPA_ERROR',
    )
  }

  logger.info({ userId, planId: plan.id, txRef }, 'Chapa checkout session initialized')

  return {
    checkout_url: chapaData.data.checkout_url,
    tx_ref:       txRef,
  }
}

// ── D. Payment status fallback ────────────────────────────────────────────────

/**
 * Check the status of a payment and activate if confirmed.
 *
 * This is the fallback for when the Chapa webhook hasn't arrived yet —
 * e.g. the user completed payment and was redirected back to our site
 * before Chapa fired the webhook.
 *
 * The frontend polls this endpoint every 3 seconds after the redirect.
 *
 * @param {string} txRef   — from the URL param (validated by Zod schema)
 * @param {string} userId  — from req.user.id (ownership check)
 * @returns {Promise<{ status: 'pending'|'success'|'failed', subscription?: object }>}
 */
export async function checkPaymentStatus(txRef, userId) {
  const paymentRecord = await repo.findPaymentByTxRef(txRef)

  if (!paymentRecord) {
    throw createError('Payment not found', 404, 'PAYMENT_NOT_FOUND')
  }

  // Ownership check — user can only query their own payments
  if (paymentRecord.user_id !== userId) {
    throw createError('Payment not found', 404, 'PAYMENT_NOT_FOUND')
  }

  // Already confirmed — return current subscription immediately
  if (paymentRecord.status === 'SUCCESS') {
    const subscription = await getMySubscription(userId)
    return { status: 'success', subscription }
  }

  // Still PENDING — check with Chapa directly
  let verifyData
  try {
    const verifyRes = await fetch(`${CHAPA_VERIFY_URL}/${txRef}`, {
      headers: { Authorization: `Bearer ${config.chapa.secretKey}` },
    })
    verifyData = await verifyRes.json()
  } catch (fetchErr) {
    logger.error({ err: fetchErr, txRef }, 'Chapa verify fetch failed in status check')
    return { status: 'pending' }
  }

  if (verifyData.status !== 'success') {
    return { status: 'pending' }
  }

  // Chapa confirmed — activate the subscription using the shared helper
  try {
    await activateSubscriptionFromVerify({ txRef, verifyData, paymentRecord })
  } catch (err) {
    if (err.code === 'PAYMENT_AMOUNT_MISMATCH') throw err
    logger.error({ err, txRef }, 'Subscription activation failed in status check')
    return { status: 'pending' }
  }

  const subscription = await getMySubscription(userId)
  return { status: 'success', subscription }
}

// ── E. Shared activation helper ───────────────────────────────────────────────

/**
 * Activate a subscription from a verified Chapa response.
 *
 * This function is shared by TWO callers:
 *   1. The webhook handler (subscriptions.webhook.js) — primary path
 *   2. checkPaymentStatus above — fallback path
 *
 * Both paths call this after independently verifying with Chapa.
 *
 * Validates:
 *   - The amount Chapa reports matches what we charged
 *   - Delegates the actual DB writes to repo.activateSubscription
 *
 * @param {object} params
 * @param {string} params.txRef           — our transaction reference
 * @param {object} params.verifyData      — Chapa verify API response
 * @param {object} params.paymentRecord   — row from payment_records
 * @returns {Promise<void>}
 */
export async function activateSubscriptionFromVerify({ txRef, verifyData, paymentRecord }) {
  const verifiedAmount = parseFloat(verifyData.data?.amount)
  const expectedAmount = parseFloat(paymentRecord.price_etb ?? paymentRecord.amount_etb)

  // Cross-check the amount to catch any tampering
  if (isNaN(verifiedAmount) || verifiedAmount !== expectedAmount) {
    logger.error(
      { txRef, verifiedAmount, expectedAmount },
      'Payment amount mismatch — possible tampering, subscription NOT activated',
    )
    throw createError(
      'Payment amount does not match the plan price',
      400,
      'PAYMENT_AMOUNT_MISMATCH',
    )
  }

  // Extract Chapa's transaction ID — field name varies by payment method
  const chapaTxId     = verifyData.data?.id
                     || verifyData.data?.reference
                     || verifyData.data?.charge_id
                     || null

  const paymentMethod = verifyData.data?.payment_method
                     || verifyData.data?.type
                     || 'unknown'

  await repo.activateSubscription({
    txRef,
    chapaTxId,
    paymentMethod,
    chapaResponse: verifyData,
    userId:        paymentRecord.user_id,
    planId:        paymentRecord.plan_id,
  })

  logger.info(
    { txRef, userId: paymentRecord.user_id, planId: paymentRecord.plan_id, paymentMethod },
    'Subscription activated successfully',
  )
}

// ── F. Payment history ────────────────────────────────────────────────────────

/**
 * Get paginated payment history for the authenticated user.
 *
 * @param {string} userId  — from req.user.id
 * @param {object} query   — { page?, page_size? } (already Zod-validated)
 * @returns {Promise<{ payments: object[], pagination: object }>}
 */
export async function getPaymentHistory(userId, query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10)      || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE,
  )

  const { rows, total } = await repo.findPaymentHistory(userId, page, pageSize)
  const totalPages = Math.ceil(total / pageSize)

  return {
    payments: rows,
    pagination: {
      page,
      page_size:   pageSize,
      total,
      total_pages: totalPages,
      has_next:    page < totalPages,
      has_prev:    page > 1,
    },
  }
}

// ── G. Cancel / abandon a pending checkout ────────────────────────────────────

/**
 * Mark a PENDING payment record as FAILED when the user abandons checkout.
 *
 * Called by POST /api/subscriptions/cancel-checkout.
 * The user clicks "Cancel" on the Chapa page and is redirected back.
 * This cleans up the PENDING row so payment history is accurate.
 *
 * Only marks PENDING records — does nothing if the payment already
 * succeeded or was already failed (idempotent).
 *
 * @param {string} txRef   — from request body (validated by schema)
 * @param {string} userId  — from req.user.id (ownership check)
 * @returns {Promise<{ cancelled: boolean }>}
 */
export async function cancelCheckout(txRef, userId) {
  const paymentRecord = await repo.findPaymentByTxRef(txRef)

  if (!paymentRecord) {
    throw createError('Payment not found', 404, 'PAYMENT_NOT_FOUND')
  }

  // Ownership check — user can only cancel their own payments
  if (paymentRecord.user_id !== userId) {
    throw createError('Payment not found', 404, 'PAYMENT_NOT_FOUND')
  }

  // Only cancel if still PENDING — ignore if already resolved
  if (paymentRecord.status !== 'PENDING') {
    return { cancelled: false, reason: 'Payment already resolved' }
  }

  await repo.markPaymentFailed(txRef)

  logger.info({ txRef, userId }, 'Checkout cancelled — payment marked FAILED')
  return { cancelled: true }
}

// ── H. Admin — subscription overview and lists ────────────────────────────────

/**
 * Platform-wide subscription statistics for the admin dashboard.
 *
 * @returns {Promise<object>}
 */
export async function getAdminSubscriptionOverview() {
  return repo.getSubscriptionStats()
}

/**
 * Paginated list of all user subscriptions (admin view).
 *
 * @param {object} query — { page?, page_size?, search?, status? }
 * @returns {Promise<{ subscriptions: object[], pagination: object }>}
 */
export async function getAdminSubscriptionList(query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)

  const { rows, total } = await repo.findAllSubscriptions({
    page,
    pageSize,
    search: query.search || null,
    status: query.status || null,
  })

  const totalPages = Math.ceil(total / pageSize)
  return {
    subscriptions: rows,
    pagination: {
      page,
      page_size:   pageSize,
      total,
      total_pages: totalPages,
      has_next:    page < totalPages,
      has_prev:    page > 1,
    },
  }
}

/**
 * Paginated list of all payment records (admin view).
 *
 * @param {object} query — { page?, page_size?, status? }
 * @returns {Promise<{ payments: object[], pagination: object }>}
 */
export async function getAdminPaymentList(query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)

  const { rows, total } = await repo.findAllPayments({
    page,
    pageSize,
    status: query.status || null,
  })

  const totalPages = Math.ceil(total / pageSize)
  return {
    payments: rows,
    pagination: {
      page,
      page_size:   pageSize,
      total,
      total_pages: totalPages,
      has_next:    page < totalPages,
      has_prev:    page > 1,
    },
  }
}
