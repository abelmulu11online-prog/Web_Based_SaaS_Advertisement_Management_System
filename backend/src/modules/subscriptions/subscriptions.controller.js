/**
 * subscriptions.controller.js — HTTP layer for subscription endpoints.
 *
 * Thin controllers only:
 *  - Extract values from req (params, query, body, user)
 *  - Call the service
 *  - Send a standardised JSON response
 *
 * User identity is ALWAYS derived from req.user.id (set by the
 * authenticate middleware from the signed JWT token).
 * It is NEVER read from req.body or req.query.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as service from './subscriptions.service.js'

// ── Public endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/plans
 * List all active subscription plans.
 * Public — no authentication required.
 */
export const getPlans = asyncHandler(async (req, res) => {
  const plans = await service.listPlans()
  sendSuccess(res, 'Subscription plans retrieved successfully', plans)
})

// ── Authenticated endpoints ───────────────────────────────────────────────────

/**
 * GET /api/subscriptions/my
 * Get the authenticated user's current subscription, plan details, and usage.
 *
 * Returns:
 *  - subscription status (FREE / ACTIVE / EXPIRED)
 *  - billing period dates and days remaining
 *  - plan details (name, ETB price, limits)
 *  - usage (active_ads vs max_active_ads)
 */
export const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await service.getMySubscription(req.user.id)
  sendSuccess(res, 'Subscription retrieved successfully', subscription)
})

/**
 * POST /api/subscriptions/checkout
 * Initialise a Chapa checkout session for the given plan.
 *
 * Request body (validated by checkoutSchema):
 *  { plan_id: "uuid" }
 *
 * Response:
 *  { checkout_url: "https://checkout.chapa.co/...", tx_ref: "sub_..." }
 *
 * The frontend redirects to checkout_url immediately.
 * tx_ref is stored by the frontend to poll /payment-status/:tx_ref.
 */
export const createCheckout = asyncHandler(async (req, res) => {
  // Build user profile from the JWT payload.
  // Chapa's hosted page uses name + email to pre-fill its form.
  const userProfile = {
    email:      req.user.email      || '',
    first_name: req.user.first_name || req.user.name || 'User',
    last_name:  req.user.last_name  || '',
  }

  const result = await service.initializeCheckout(
    req.user.id,
    req.body.plan_id,
    userProfile,
  )

  sendSuccess(res, 'Checkout session created', result, 201)
})

/**
 * GET /api/subscriptions/payment-status/:tx_ref
 * Manual fallback: check whether a payment has been confirmed.
 *
 * Used by the frontend PaymentCallbackPage, which polls this endpoint
 * every 3 seconds after being redirected back from Chapa.
 *
 * Response:
 *  { status: "pending" | "success" | "failed", subscription?: object }
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const result = await service.checkPaymentStatus(
    req.params.tx_ref,
    req.user.id,
  )
  sendSuccess(res, 'Payment status retrieved', result)
})

/**
 * GET /api/subscriptions/history
 * Paginated list of the authenticated user's payment records.
 *
 * Query params (validated by paymentHistoryQuerySchema):
 *  ?page=1&page_size=20
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const result = await service.getPaymentHistory(req.user.id, req.query || {})
  sendSuccess(res, 'Payment history retrieved successfully', result)
})

/**
 * POST /api/subscriptions/cancel-checkout
 * Mark a PENDING payment as FAILED when the user abandons Chapa checkout.
 *
 * Request body (validated by cancelCheckoutSchema):
 *  { tx_ref: "sub_..." }
 *
 * Idempotent — if the payment is already resolved, returns cancelled: false.
 */
export const cancelCheckout = asyncHandler(async (req, res) => {
  const result = await service.cancelCheckout(req.body.tx_ref, req.user.id)
  sendSuccess(res, 'Checkout cancelled', result)
})

// ── Admin endpoints ────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/admin/overview
 * Platform-wide subscription statistics. Role: admin only.
 */
export const getAdminSubscriptionOverview = asyncHandler(async (_req, res) => {
  const stats = await service.getAdminSubscriptionOverview()
  sendSuccess(res, 'Subscription overview retrieved', stats)
})

/**
 * GET /api/subscriptions/admin/list
 * Paginated list of all user subscriptions. Role: admin only.
 * Query: ?page=1&page_size=20&search=email&status=ACTIVE
 */
export const getAdminSubscriptionList = asyncHandler(async (req, res) => {
  const result = await service.getAdminSubscriptionList(req.query || {})
  sendSuccess(res, 'Subscription list retrieved', result)
})

/**
 * GET /api/subscriptions/admin/payments
 * Paginated list of all payment records. Role: admin only.
 * Query: ?page=1&page_size=20&status=SUCCESS
 */
export const getAdminPaymentList = asyncHandler(async (req, res) => {
  const result = await service.getAdminPaymentList(req.query || {})
  sendSuccess(res, 'Payment list retrieved', result)
})
