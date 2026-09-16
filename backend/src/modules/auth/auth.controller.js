/**
 * auth.controller.js — Handles HTTP layer for auth endpoints.
 * Validates request, delegates to authService, returns response.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as authService from './auth.service.js'
import * as verificationService from './verification.service.js'
import * as passwordResetService from './passwordReset.service.js'

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

  const result = await authService.register({ email, phone, password })

  // Surface email send status to the frontend so it can show accurate feedback.
  // Account creation always succeeds; email delivery may fail independently.
  const { emailSent, ...user } = result

  let message = 'Account created successfully'
  if (email) {
    message = emailSent
      ? 'Account created. Verification email sent — please check your inbox.'
      : 'Account created, but the verification email could not be sent. Please use "Resend verification" or contact support.'
  }

  sendSuccess(res, message, { ...user, emailSent }, 201)
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
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: "Revoke a refresh token to prevent future token refresh. Note: This does not immediately invalidate existing stateless access JWTs - they remain valid until their normal expiration."
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
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to revoke
 *                 example: "a1b2c3d4e5f6..."
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken: rawRefreshToken } = req.body

  await authService.logout(rawRefreshToken)

  sendSuccess(res, 'Logout successful')
})

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Use a refresh token to obtain a new access token. Implements token rotation - the old refresh token is revoked and a new one is issued.
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
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *                 example: "a1b2c3d4e5f6..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
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
 *                         accessToken:
 *                           type: string
 *                           description: New JWT access token
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                         refreshToken:
 *                           type: string
 *                           description: New refresh token (old one is revoked)
 *                           example: "f6e5d4c3b2a1..."
 *       401:
 *         description: Invalid, expired, or revoked refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account suspended, deleted, or inactive
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
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: rawRefreshToken } = req.body

  const result = await authService.refreshToken(rawRefreshToken)

  sendSuccess(res, 'Token refreshed successfully', result)
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

/**
 * Request a password reset email.
 * POST /api/auth/forgot-password
 * 
 * Public endpoint - no authentication required.
 * For security, returns the same response whether the email exists or not.
 * 
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send a password reset email to the specified address. For security, returns the same response whether the email exists or not.
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
 *         description: Password reset email sent (or would be sent if email exists)
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
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  
  await passwordResetService.createAndSendPasswordResetToken(email)
  
  // Always return success message for security (enumeration protection)
  sendSuccess(res, 'If an account exists with this email, a password reset email has been sent')
})

/**
 * Reset password using a reset token.
 * POST /api/auth/reset-password
 * 
 * Public endpoint - no authentication required.
 * The reset token itself serves as the credential.
 * 
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset a user's password using a valid password reset token
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
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token from email
 *                 example: "a1b2c3d4e5f6..."
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password (min 8 chars, mixed case, digit, special char)
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid, expired, or already used token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account deleted or not eligible for password reset
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
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body
  
  await passwordResetService.resetPassword(token, password)
  
  sendSuccess(res, 'Password reset successfully')
})
