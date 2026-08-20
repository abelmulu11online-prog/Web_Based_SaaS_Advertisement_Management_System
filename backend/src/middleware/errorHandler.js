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
  const isDevelopment = process.env.NODE_ENV === 'development'

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
