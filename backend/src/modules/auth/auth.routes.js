/**
 * auth.routes.js — Authentication routes.
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh-token
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 */
import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { registerSchema, loginSchema, refreshTokenSchema, logoutSchema, verifyEmailSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schemas.js'
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
 * Public endpoint - requires refresh token
 */
router.post('/logout', validate(logoutSchema), authController.logout)

/**
 * POST /api/auth/refresh-token
 * Public endpoint - requires refresh token
 */
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken)

/**
 * GET /api/auth/verify-email
 * Public endpoint - no authentication required
 * Uses verification token as credential
 */
router.get('/verify-email', validate(verifyEmailSchema), authController.verifyEmail)

/**
 * POST /api/auth/resend-verification
 * Public endpoint - no authentication required
 * For security, returns same response whether email exists or not
 */
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification)

/**
 * POST /api/auth/forgot-password
 * Public endpoint - no authentication required
 * For security, returns same response whether email exists or not
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword)

/**
 * POST /api/auth/reset-password
 * Public endpoint - no authentication required
 * Uses reset token as credential
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)

export default router
