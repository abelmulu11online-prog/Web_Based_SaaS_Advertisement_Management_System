/**
 * auth.schemas.js — Zod validation schemas for authentication.
 *
 * Defines schemas for registration and login validation.
 * Used by the validate middleware in Phase 4.3.
 */
import { z } from 'zod'

/**
 * Email validation — normalizes to lowercase and validates format.
 */
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .transform((val) => val.toLowerCase().trim())

/**
 * Phone validation — expects international format (E.164).
 * Example: +1234567890 or +44 20 7123 4567
 * Spaces are allowed and will be removed automatically.
 */
const phoneSchema = z
  .string()
  .min(1, 'Phone is required')
  .regex(/^\+?[1-9][\d\s]{1,14}$/, 'Invalid phone format. Use international format (e.g., +1234567890)')
  .transform((val) => val.replace(/\s/g, '')) // Remove spaces

/**
 * Password validation — enforces reasonable password policy.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

/**
 * Registration schema.
 *
 * Requires:
 * - email OR phone (at least one)
 * - password
 *
 * Rejects:
 * - role field (server-controlled)
 * - status field (server-controlled)
 * - password_hash (never allowed from client)
 */
export const registerSchema = z.object({
  body: z
    .object({
      email: emailSchema.optional(),
      phone: phoneSchema.optional(),
      password: passwordSchema,
      // Explicitly reject client-controlled fields
      role: z.never().optional(),
      status: z.never().optional(),
      password_hash: z.never().optional(),
    })
    .refine((data) => data.email || data.phone, {
      message: 'At least one of email or phone is required',
      path: ['email'],
    }),
})

/**
 * Login schema.
 *
 * Accepts:
 * - email OR phone (identifier)
 * - password
 *
 * Uses a single "identifier" field to avoid account enumeration.
 */
export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Identifier (email or phone) is required'),
    password: z.string().min(1, 'Password is required'),
  }),
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
