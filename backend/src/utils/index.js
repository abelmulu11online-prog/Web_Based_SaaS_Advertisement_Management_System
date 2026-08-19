/**
 * utils/index.js — Shared backend utility functions.
 */

/**
 * Wrap an async Express route handler to forward errors to next().
 * Eliminates repetitive try/catch in every controller.
 *
 * @param {Function} fn  async (req, res, next) => void
 * @returns {Function}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Send a standardised JSON success response.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {number} [statusCode=200]
 */
export function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data })
}

/**
 * Send a standardised JSON error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=500]
 */
export function sendError(res, message, statusCode = 500) {
  res.status(statusCode).json({ success: false, error: message })
}
