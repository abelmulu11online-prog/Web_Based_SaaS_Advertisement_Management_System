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
 *
 * Shape: { success: true, message, data }
 *
 * @param {import('express').Response} res
 * @param {string} message   Human-readable description of the result
 * @param {any}    data      Payload to return to the client
 * @param {number} [statusCode=200]
 */
export function sendSuccess(res, message, data = null, statusCode = 200) {
  res.status(statusCode).json({ success: true, message, data })
}

/**
 * Send a standardised JSON error response.
 *
 * Shape: { success: false, message, error: { code } }
 *
 * @param {import('express').Response} res
 * @param {string} message     Human-readable error description
 * @param {number} [statusCode=500]
 * @param {string} [code='INTERNAL_ERROR']  Machine-readable error code
 */
export function sendError(
  res,
  message,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
) {
  res.status(statusCode).json({
    success: false,
    message,
    error: { code },
  })
}

/**
 * Create a structured application error that carries an HTTP status code
 * and a machine-readable error code for the centralised error handler.
 *
 * @param {string} message      Human-readable error description
 * @param {number} statusCode   HTTP status (e.g. 400, 404, 422)
 * @param {string} [code]       Machine-readable code (e.g. 'VALIDATION_ERROR')
 * @returns {Error}
 */
export function createError(message, statusCode = 500, code = 'INTERNAL_ERROR') {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  err.isOperational = true
  return err
}
