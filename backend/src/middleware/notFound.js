/**
 * middleware/notFound.js — 404 handler.
 *
 * Catches any request that doesn't match a registered route.
 * Register this after all routes, but before errorHandler, in app.js.
 */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: { code: 'NOT_FOUND' },
  })
}
