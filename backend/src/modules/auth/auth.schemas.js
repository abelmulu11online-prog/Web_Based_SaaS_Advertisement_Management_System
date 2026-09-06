/**
 * auth.schemas.js — Zod validation schemas for authentication.
 *
 * Defines schemas for registration, login, and token operations.
 * Used by the validate middleware (Phase 4.2).
 *
 * Security: explicitly rejects client-controlled authentication fields
 * (role, status, password_hash, is_verified, user_id, id, timestamps).
 */
import { z } from 'zod'

// ── Reusable field schemas ────────────────────────────────────────────────────

/**
 * Email validation with normalization.
 */
const emailSchema = z
  .string()
  .email('Invalid email format')
  .transform((val) => val.toLowerCase().trim())

/**
 * Phone validation (E.164 format, optional).
 */
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9][\d\s]{6,14}$/, 'Invalid phone format. Use international format (e.g., +251912455678)')
  .transform((val) => val.replace(/\s/g, ''))
  .optional()

/**
 * Password validation (min 8 chars, mixed case, digit, special char).
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

/**
 * Fields that must NEVER be accepted from the client.
 * These belong to account/security management or are server-generated.
 */
const rejectedFields = {
  id: z.never().optional(),
  user_id: z.never().optional(),
  role: z.never().optional(),
  status: z.never().optional(),
  password_hash: z.never().optional(),
  is_verified: z.never().optional(),
  created_at: z.never().optional(),
  updated_at: z.never().optional(),
}

// ── Authentication schemas ─────────────────────────────────────────────────────

/**
 * Registration schema.
 * Requires either email or phone (or both), plus password.
 */
export const registerSchema = z.object({
  body: z
    .object({
      email: emailSchema.optional(),
      phone: phoneSchema,
      password: passwordSchema,
      ...rejectedFields,
    })
    .strict()
    .refine((data) => data.email || data.phone, {
      message: 'At least one of email or phone is required',
      path: [],
    }),
})

/**
 * Login schema.
 * Accepts either email or phone as identifier.
 */
export const loginSchema = z.object({
  body: z
    .object({
      identifier: z.string().min(1, 'Identifier is required'),
      password: z.string().min(1, 'Password is required'),
      ...rejectedFields,
    })
    .strict(),
})

// ── Email verification schemas ─────────────────────────────────────────────────

/**
 * Verify email schema.
 * Accepts verification token from query parameter.
 */
export const verifyEmailSchema = z.object({
  query: z
    .object({
      token: z.string().min(1, 'Verification token is required'),
    })
    .strict(),
})

/**
 * Resend verification email schema.
 * Accepts email address.
 */
export const resendVerificationSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      ...rejectedFields,
    })
    .strict(),
})

/**
 * Refresh token schema.
 *
 * Requires:
 * - refreshToken
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
})

/**
 * Logout schema.
 *
 * Requires:
 * - refreshToken
 */
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
})

// ── Password reset schemas ────────────────────────────────────────────────────

/**
 * Forgot password schema.
 * Accepts email address.
 */
export const forgotPasswordSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      ...rejectedFields,
    })
    .strict(),
})

/**
 * Reset password schema.
 * Accepts reset token and new password.
 */
export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Reset token is required'),
      password: passwordSchema,
      ...rejectedFields,
    })
    .strict(),
})
