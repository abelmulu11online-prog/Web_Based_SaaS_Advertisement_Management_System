/**
 * auth.controller.js — Handles HTTP layer for auth endpoints.
 * Validates request, delegates to authService, returns response.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as authService from './auth.service.js'
import * as verificationService from './verification.service.js'

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email or phone and password
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               phone:
 *                 type: string
 *                 description: Phone number in international format (E.164)
 *                 example: "+1234567890"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Password (min 8 chars, mixed case, digit, special char)
 *                 example: "SecurePass123!"
 *             oneOf:
 *               - required: [email, password]
 *               - required: [phone, password]
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           example: "550e8400-e29b-41d4-a716-446655440000"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: user@example.com
 *                         phone:
 *                           type: string
 *                           example: "+1234567890"
 *                         role:
 *                           type: string
 *                           enum: [USER, ADMIN]
 *                           example: USER
 *                         status:
 *                           type: string
 *                           enum: [ACTIVE, SUSPENDED, DELETED]
 *                           example: ACTIVE
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: Duplicate account (email or phone already exists)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const register = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body

  const user = await authService.register({ email, phone, password })

  sendSuccess(res, 'Account created successfully', user, 201)
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     description: Authenticate with email or phone and password to receive an access token
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email address or phone number
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                               example: "550e8400-e29b-41d4-a716-446655440000"
 *                             email:
 *                               type: string
 *                               format: email
 *                               example: user@example.com
 *                             phone:
 *                               type: string
 *                               example: "+1234567890"
 *                             role:
 *                               type: string
 *                               enum: [USER, ADMIN]
 *                               example: USER
 *                             status:
 *                               type: string
 *                               enum: [ACTIVE, SUSPENDED, DELETED]
 *                               example: ACTIVE
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                         accessToken:
 *                           type: string
 *                           description: JWT access token
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials or account not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account suspended or deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body

  const result = await authService.login({ identifier, password })

  sendSuccess(res, 'Login successful', result)
})

/**
 * Logout a user.
 * POST /api/auth/logout
 * 
 * NOTE: This endpoint is intentionally not implemented in Phase 4.3.
 * The current architecture uses stateless JWT access tokens without
 * server-side session storage. Secure logout requires refresh-token
 * infrastructure (Phase 4.4+) for token revocation.
 * 
 * Returning 501 Not Implemented to avoid security theater.
 */
export const logout = asyncHandler(async (req, res) => {
  // Intentionally not implemented - requires refresh-token infrastructure
  res.status(501).json({
    success: false,
    message: 'Logout not yet implemented - requires refresh-token infrastructure',
    error: { code: 'NOT_IMPLEMENTED' },
  })
})

/**
 * Refresh an access token.
 * POST /api/auth/refresh-token
 * 
 * NOTE: This endpoint is intentionally not implemented in Phase 4.3.
 * Refresh-token storage, rotation, and revocation infrastructure
 * has not been implemented yet (deferred to Phase 4.4+).
 * 
 * Returning 501 Not Implemented to avoid accepting arbitrary tokens.
 */
export const refreshToken = asyncHandler(async (req, res) => {
  // Intentionally not implemented - requires refresh-token infrastructure
  res.status(501).json({
    success: false,
    message: 'Refresh token not yet implemented - requires refresh-token infrastructure',
    error: { code: 'NOT_IMPLEMENTED' },
  })
})

/**
 * Verify email using a verification token.
 * GET /api/auth/verify-email?token=<token>
 * 
 * Public endpoint - no authentication required.
 * The verification token itself serves as the credential.
 * 
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email address
 *     description: Verify a user's email address using a verification token sent via email
 *     tags:
 *       - Authentication
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         emailVerifiedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid, expired, or already used token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query
  
  const result = await verificationService.verifyEmail(token)
  
  sendSuccess(res, 'Email verified successfully', result)
})

/**
 * Resend verification email.
 * POST /api/auth/resend-verification
 * 
 * Public endpoint - no authentication required.
 * For security, returns the same response whether the email exists or not.
 * 
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     description: Send a new verification email to the specified address. For security, returns the same response whether the email exists or not.
 *     tags:
 *       - Authentication
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Verification email sent (or would be sent if email exists)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body
  
  await verificationService.resendVerificationEmail(email)
  
  // Always return success message for security (enumeration protection)
  sendSuccess(res, 'If the email exists and requires verification, a verification email has been sent')
})
