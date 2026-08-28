/**
 * subscriptions.routes.js — Subscription and payment routes.
 *
 * Route layout:
 *
 * Public (no auth):
 *   GET  /api/subscriptions/plans               — list all active plans (pricing page)
 *
 * Authenticated (Bearer token required):
 *   GET  /api/subscriptions/my                  — current subscription + usage
 *   POST /api/subscriptions/checkout            — init Chapa checkout, returns checkout_url
 *   GET  /api/subscriptions/payment-status/:tx_ref — poll payment status after redirect
 *   GET  /api/subscriptions/history             — paginated payment history
 *
 * Webhook (called by Chapa only — NOT by users):
 *   POST /api/subscriptions/webhook             — HMAC-verified, raw body parser
 *
 * IMPORTANT — webhook body parser:
 *   The webhook route uses express.raw() inline so the raw Buffer is available
 *   for HMAC signature verification. This MUST be declared before the global
 *   express.json() middleware would otherwise consume the body.
 *   In app.js, the subscriptions router is mounted BEFORE express.json().
 */
import { Router } from 'express'
import express from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validate } from '../../middleware/validate.js'
import {
  checkoutSchema,
  paymentStatusParamSchema,
  paymentHistoryQuerySchema,
  cancelCheckoutSchema,
  adminSubscriptionQuerySchema,
} from './subscriptions.schemas.js'
import * as ctrl from './subscriptions.controller.js'
import { handleWebhook } from './subscriptions.webhook.js'

const router = Router()

// ── Webhook — raw body parser applied inline ──────────────────────────────────
// express.raw() gives us the raw Buffer so the HMAC signature can be computed.
// This must come before any other middleware that would parse the body as JSON.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook,
)

// ── JSON body parser for all non-webhook routes ───────────────────────────────
// The subscriptions router is mounted in app.js BEFORE the global
// express.json() so the webhook route above gets the raw Buffer. That means
// every other route in this router also misses the global json parser —
// so we apply it here explicitly for everything that isn't /webhook.
router.use((req, _res, next) => {
  if (req.path === '/webhook') return next()
  express.json({ limit: '1mb' })(req, _res, next)
})

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/plans', ctrl.getPlans)

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get('/my', authenticate, ctrl.getMySubscription)

router.post(
  '/checkout',
  authenticate,
  validate(checkoutSchema),
  ctrl.createCheckout,
)

router.get(
  '/payment-status/:tx_ref',
  authenticate,
  validate(paymentStatusParamSchema),
  ctrl.getPaymentStatus,
)

router.get(
  '/history',
  authenticate,
  validate(paymentHistoryQuerySchema),
  ctrl.getPaymentHistory,
)

// Cancel an abandoned checkout — marks the PENDING payment record as FAILED
router.post(
  '/cancel-checkout',
  authenticate,
  validate(cancelCheckoutSchema),
  ctrl.cancelCheckout,
)

// ── Admin endpoints (role: admin only) ────────────────────────────────────────
// GET /api/subscriptions/admin/overview   — platform-wide subscription stats
// GET /api/subscriptions/admin/list       — paginated list of all user subscriptions
// GET /api/subscriptions/admin/payments   — paginated list of all payment records

router.get(
  '/admin/overview',
  authenticate,
  requireRole('admin'),
  ctrl.getAdminSubscriptionOverview,
)

router.get(
  '/admin/list',
  authenticate,
  requireRole('admin'),
  validate(adminSubscriptionQuerySchema),
  ctrl.getAdminSubscriptionList,
)

router.get(
  '/admin/payments',
  authenticate,
  requireRole('admin'),
  validate(adminSubscriptionQuerySchema),
  ctrl.getAdminPaymentList,
)

export default router
