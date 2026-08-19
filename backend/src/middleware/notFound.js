/**
 * notFound.js — 404 handler middleware.
 * Catches any request that doesn't match a registered route.
 * Register this just before errorHandler in app.js.
 */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  })
}
