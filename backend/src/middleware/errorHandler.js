/**
 * middleware/errorHandler.js — Global Express error-handling middleware.
 *
 * Must be registered LAST in app.js (after all routes and notFound).
 *
 * Rules:
 *  - Never expose stack traces, SQL errors, or internal details in production.
 *  - Always return the standard { success, message, error: { code } } shape.
 *  - Log full details server-side for debugging.
 */
import { ZodError } from 'zod'
import logger from '../utils/logger.js'
import { config } from '../config/index.js'

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // ── Zod validation errors (thrown directly, not via our validate middleware) ─
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: { code: 'VALIDATION_ERROR', issues },
    })
  }

  // ── PostgreSQL unique constraint violations ───────────────────────────────────
  if (err.code === '23505') {
    // Extract constraint name from error message
    const constraintMatch = err.message.match(/constraint "(.+?)"/)
    const constraint = constraintMatch ? constraintMatch[1] : 'unknown'

    // Map constraints to user-friendly error codes
    if (constraint === 'users_email_key') {
      logger.warn({ constraint }, 'Duplicate email attempt')
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        error: { code: 'DUPLICATE_EMAIL' },
      })
    }

    if (constraint === 'users_phone_key') {
      logger.warn({ constraint }, 'Duplicate phone attempt')
      return res.status(409).json({
        success: false,
        message: 'An account with this phone number already exists',
        error: { code: 'DUPLICATE_PHONE' },
      })
    }

    if (constraint === 'idx_profiles_user_id' || constraint === 'profiles_user_id_key') {
      logger.warn({ constraint }, 'Duplicate profile attempt')
      return res.status(409).json({
        success: false,
        message: 'A profile already exists for this account',
        error: { code: 'DUPLICATE_PROFILE' },
      })
    }

    if (constraint === 'profiles_slug_key') {
      logger.warn({ constraint }, 'Duplicate slug attempt')
      return res.status(409).json({
        success: false,
        message: 'This slug is already taken',
        error: { code: 'DUPLICATE_SLUG' },
      })
    }

    if (constraint === 'business_hours_profile_id_day_of_week_key') {
      logger.warn({ constraint }, 'Duplicate business hours entry')
      return res.status(409).json({
        success: false,
        message: 'Duplicate business hours entry for the same day',
        error: { code: 'DUPLICATE_BUSINESS_HOURS' },
      })
    }

    if (constraint === 'social_links_profile_id_platform_key') {
      logger.warn({ constraint }, 'Duplicate social link entry')
      return res.status(409).json({
        success: false,
        message: 'A social link for this platform already exists',
        error: { code: 'DUPLICATE_SOCIAL_LINK' },
      })
    }

    // Generic duplicate error for other constraints
    logger.warn({ constraint }, 'Duplicate constraint violation')
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists',
      error: { code: 'DUPLICATE_RECORD' },
    })
  }

  // ── Operational errors (intentionally thrown with statusCode + code) ─────────
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      error: { code: err.code || 'REQUEST_ERROR' },
    })
  }

  // ── JSON parse errors (malformed request body) ───────────────────────────────
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: { code: 'INVALID_JSON' },
    })
  }

  // ── Payload too large ────────────────────────────────────────────────────────
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large',
      error: { code: 'PAYLOAD_TOO_LARGE' },
    })
  }

  // ── Unexpected server errors ─────────────────────────────────────────────────
  const statusCode = err.statusCode || 500

  // Log the full error server-side (includes stack trace)
  logger.error(
    {
      err,
      req: {
        method: req.method,
        url: req.originalUrl,
        // Do NOT log Authorization header or body here
      },
    },
    `Unhandled error: ${err.message}`,
  )

  // Return a safe response — no stack trace, no SQL, no internals
  const isDevelopment = config.isDevelopment

  res.status(statusCode >= 100 && statusCode < 600 ? statusCode : 500).json({
    success: false,
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    error: {
      code: err.code || 'INTERNAL_ERROR',
      // Stack only in development to aid debugging
      ...(isDevelopment && { stack: err.stack }),
    },
  })
}
