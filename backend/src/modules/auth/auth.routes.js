/**
 * auth.routes.js — Authentication routes.
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh-token
 */
import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schemas.js'
import * as authController from './auth.controller.js'

const router = Router()

/**
 * POST /api/auth/register
 * Public endpoint - no authentication required
 */
router.post('/register', validate(registerSchema), authController.register)

/**
 * POST /api/auth/login
 * Public endpoint - no authentication required
 */
router.post('/login', validate(loginSchema), authController.login)

/**
 * POST /api/auth/logout
 * Protected endpoint - requires authentication
 * NOTE: Returns 501 Not Implemented in Phase 4.3
 *       Requires refresh-token infrastructure for secure logout
 */
router.post('/logout', authController.logout)

/**
 * POST /api/auth/refresh-token
 * Protected endpoint - requires authentication
 * NOTE: Returns 501 Not Implemented in Phase 4.3
 *       Requires refresh-token infrastructure
 */
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken)

export default router
