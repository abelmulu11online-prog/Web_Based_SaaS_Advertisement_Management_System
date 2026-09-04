/**
 * optionalAuthenticate.js — Attach req.user when a valid Bearer token is present.
 * Does not fail the request when the token is missing or invalid.
 */
import { verifyToken } from '../utils/jwt.js'

export function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return next()

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next()

  try {
    req.user = verifyToken(parts[1])
  } catch {
    // Public routes still work for anonymous visitors
  }
  return next()
}
