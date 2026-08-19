/**
 * errorHandler.js — Global Express error-handling middleware.
 * Must be registered LAST in app.js (after all routes).
 *
 * Full implementation in Phase 2.
 */

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  console.error(`[Error] ${statusCode} — ${message}`, err.stack)

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
