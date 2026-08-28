/**
 * middleware/requireRole.js — Role‑based authorization middleware.
 *
 * Usage: `app.get('/admin', authenticate, requireRole('admin'), handler)`
 * Checks that `req.user?.role` is one of the allowedRoles.
 * If not, responds with 403 and standardized error.
 */
import { sendError } from '../utils/index.js';
import logger from '../utils/logger.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return sendError(res, 'Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }
    if (!allowedRoles.includes(userRole)) {
      logger.warn({ userId: req.user?.id, role: userRole, allowedRoles }, 'Forbidden access attempt');
      return sendError(res, 'Forbidden', 403, 'FORBIDDEN');
    }
    next();
  };
}
