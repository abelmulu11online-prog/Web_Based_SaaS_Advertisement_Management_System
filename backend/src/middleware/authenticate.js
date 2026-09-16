/**
 * middleware/authenticate.js — JWT authentication middleware.
 *
 * Extracts Bearer token from Authorization header, verifies it, and attaches
 * the decoded payload to `req.user`.
 */
import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/index.js';
import logger from '../utils/logger.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return sendError(res, 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return sendError(res, 'Invalid Authorization header format', 400, 'INVALID_AUTH_HEADER');
  }

  const token = parts[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    logger.error({ err, path: req.path }, 'Authentication middleware error');
    const status = err.statusCode || 401;
    const code = err.code || 'INVALID_TOKEN';
    return sendError(res, err.message || 'Invalid token', status, code);
  }
}
