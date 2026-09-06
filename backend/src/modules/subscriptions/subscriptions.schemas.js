/**
 * subscriptions.schemas.js — Zod 4 validation schemas for the subscriptions module.
 *
 * These schemas run BEFORE the controller, via the validate() middleware.
 * They are the first line of defence against bad or malicious input.
 *
 * Key rule: the client is NEVER allowed to send:
 *   - user_id    (always taken from req.user.id — the signed JWT)
 *   - status     (only the webhook handler and cron job can write this)
 *   - tx_ref     (generated server-side — format: sub_{userId}_{timestamp})
 *   - amount     (always taken from the plan's price in the database)
 *
 * Using .strict() on the checkout body means any extra field causes a 422.
 * This blocks injection attempts like { plan_id: "...", status: "ACTIVE" }.
 */
import { z } from 'zod'

// ── Reusable primitives ────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Must be a valid UUID')

// ── POST /api/subscriptions/checkout ─────────────────────────────────────────
/**
 * Only plan_id is accepted from the client.
 * .strict() means any extra field (amount, tx_ref, user_id, status, etc.)
 * causes an immediate 422 VALIDATION_ERROR — it never reaches the service.
 */
export const checkoutSchema = z.object({
  body: z
    .object({
      plan_id: uuidSchema,
    })
    .strict(), // ← rejects any field that is not plan_id
})

// ── GET /api/subscriptions/payment-status/:tx_ref ────────────────────────────
/**
 * Validates the tx_ref URL parameter.
 *
 * tx_ref format: sub_{userId}_{unixTimestampMs}
 * Example:       sub_abc123def-..._1724000000000
 *
 * The regex allows letters, numbers, underscores, and hyphens only.
 * This blocks path traversal attempts and ensures only our own references
 * can be queried.
 */
export const paymentStatusParamSchema = z.object({
  params: z.object({
    tx_ref: z
      .string()
      .min(1, 'tx_ref is required')
      .max(200, 'tx_ref is too long')
      .regex(
        /^sub_[a-zA-Z0-9_-]+$/,
        'Invalid tx_ref format — must start with sub_ and contain only letters, numbers, underscores, or hyphens',
      ),
  }),
})

// ── POST /api/subscriptions/cancel-checkout ───────────────────────────────────
/**
 * Accepts tx_ref in the body so the user can cancel an abandoned checkout.
 * .strict() blocks any injection fields beyond tx_ref.
 */
export const cancelCheckoutSchema = z.object({
  body: z
    .object({
      tx_ref: z
        .string()
        .min(1, 'tx_ref is required')
        .max(200, 'tx_ref is too long')
        .regex(
          /^sub_[a-zA-Z0-9_-]+$/,
          'Invalid tx_ref format',
        ),
    })
    .strict(),
})

// ── GET /api/subscriptions/admin/* ───────────────────────────────────────────
/**
 * Shared pagination + optional search for admin list endpoints.
 */
export const adminSubscriptionQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce
        .number()
        .int('page must be a whole number')
        .positive('page must be greater than 0')
        .optional(),
      page_size: z.coerce
        .number()
        .int('page_size must be a whole number')
        .positive('page_size must be greater than 0')
        .max(100, 'page_size cannot exceed 100')
        .optional(),
      search: z.string().max(200).optional(),
      status: z.string().max(50).optional(),
    })
    .optional(),
})
/**
 * Validates optional pagination query parameters.
 *
 * z.coerce.number() converts the URL string "?page=2" into the number 2
 * automatically — query parameters always arrive as strings in Express.
 *
 * page_size max 100 prevents a client from requesting all records in one call
 * and overloading the database.
 */
export const paymentHistoryQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce
        .number()
        .int('page must be a whole number')
        .positive('page must be greater than 0')
        .optional(),
      page_size: z.coerce
        .number()
        .int('page_size must be a whole number')
        .positive('page_size must be greater than 0')
        .max(100, 'page_size cannot exceed 100')
        .optional(),
    })
    .optional(),
})
