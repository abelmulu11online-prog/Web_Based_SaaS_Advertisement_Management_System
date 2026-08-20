/**
 * authenticate.js — JWT authentication middleware stub.
 * Will verify the Bearer token on protected routes.
 *
 * Full implementation in Phase 4 (Authentication).
 */
export function authenticate(req, res, next) {
  // TODO (Phase 4): extract and verify JWT from Authorization header
  // const token = req.headers.authorization?.split(' ')[1]
  // if (!token) return res.status(401).json({ success: false, error: 'Unauthorised' })
  // verify token, attach req.user, then call next()
  next()
}
