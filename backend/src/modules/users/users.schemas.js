/**
 * users.schemas.js — Zod validation schemas for profile & business details.
 *
 * Defines schemas for profile creation, update, and business-details upsert.
 * Used by the validate middleware (Phase 4.4).
 *
 * Security: explicitly rejects client-controlled authentication fields
 * (role, status, password, password_hash, is_verified, user_id, id, timestamps).
 */
import { z } from 'zod'

// ── Reusable field schemas ────────────────────────────────────────────────────

/**
 * Display name — the public name shown on the profile.
 */
const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(200, 'Display name must not exceed 200 characters')
  .trim()

/**
 * Slug — URL-safe unique identifier used in public URLs: /p/{slug}
 * Lowercase, alphanumeric, hyphens between segments.
 */
const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(100, 'Slug must not exceed 100 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must be lowercase, alphanumeric, with hyphens between segments (e.g., my-cafe)',
  )

/**
 * Description — long-form text about the provider.
 */
const descriptionSchema = z
  .string()
  .max(2000, 'Description must not exceed 2000 characters')
  .optional()

/**
 * UUID — for category_id and location_id references.
 */
const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Contact phone — international format (E.164).
 * Spaces are allowed and removed automatically.
 */
const contactPhoneSchema = z
  .string()
  .regex(
    /^\+?[1-9][\d\s]{6,14}$/,
    'Invalid phone format. Use international format (e.g., +1234567890)',
  )
  .transform((val) => val.replace(/\s/g, ''))
  .optional()

/**
 * Contact email — normalized to lowercase.
 */
const contactEmailSchema = z
  .string()
  .email('Invalid email format')
  .transform((val) => val.toLowerCase().trim())
  .optional()

/**
 * Website URL — must be a valid URL when provided.
 */
const websiteUrlSchema = z
  .string()
  .url('Invalid website URL')
  .max(500, 'Website URL must not exceed 500 characters')
  .optional()

/**
 * Fields that must NEVER be accepted from the client.
 * These belong to account/security management or are server-generated.
 */
const rejectedFields = {
  id: z.never().optional(),
  user_id: z.never().optional(),
  role: z.never().optional(),
  status: z.never().optional(),
  password: z.never().optional(),
  password_hash: z.never().optional(),
  is_verified: z.never().optional(),
  created_at: z.never().optional(),
  updated_at: z.never().optional(),
}

// ── Profile schemas ───────────────────────────────────────────────────────────

/**
 * Profile creation schema.
 *
 * Required: display_name, slug
 * Optional: description, category_id, location_id, contact_phone,
 *           contact_email, website_url, is_published
 */
export const createProfileSchema = z.object({
  body: z
    .object({
      display_name: displayNameSchema,
      slug: slugSchema,
      description: descriptionSchema,
      category_id: uuidSchema.optional(),
      location_id: uuidSchema.optional(),
      contact_phone: contactPhoneSchema,
      contact_email: contactEmailSchema,
      website_url: websiteUrlSchema,
      is_published: z.boolean().optional(),
      ...rejectedFields,
    })
    .strict(),
})

/**
 * Profile update schema (PATCH semantics — all profile fields optional).
 *
 * At least one updatable field must be provided.
 */
export const updateProfileSchema = z.object({
  body: z
    .object({
      display_name: displayNameSchema.optional(),
      slug: slugSchema.optional(),
      description: descriptionSchema,
      category_id: uuidSchema.optional(),
      location_id: uuidSchema.optional(),
      contact_phone: contactPhoneSchema,
      contact_email: contactEmailSchema,
      website_url: websiteUrlSchema,
      is_published: z.boolean().optional(),
      ...rejectedFields,
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
      path: [],
    }),
})

// ── Business details schema ───────────────────────────────────────────────────

/**
 * Day-of-week — 0 (Sunday) through 6 (Saturday).
 */
const dayOfWeekSchema = z
  .number()
  .int('Day of week must be an integer')
  .min(0, 'Day of week must be between 0 and 6')
  .max(6, 'Day of week must be between 0 and 6')

/**
 * Time string — HH:MM or HH:MM:SS format.
 */
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Time must be in HH:MM or HH:MM:SS format')

/**
 * Business hours entry.
 * If is_closed is true, opens_at and closes_at are ignored.
 */
const businessHourSchema = z
  .object({
    day_of_week: dayOfWeekSchema,
    opens_at: timeSchema.optional(),
    closes_at: timeSchema.optional(),
    is_closed: z.boolean().optional(),
  })
  .refine(
    (data) => data.is_closed === true || (data.opens_at && data.closes_at),
    {
      message: 'opens_at and closes_at are required when not closed',
      path: ['opens_at'],
    },
  )

/**
 * Social link entry.
 * Platform must match the database CHECK constraint values.
 */
const socialLinkSchema = z.object({
  platform: z.enum([
    'FACEBOOK',
    'INSTAGRAM',
    'TELEGRAM',
    'WHATSAPP',
    'TIKTOK',
    'LINKEDIN',
    'YOUTUBE',
    'TWITTER',
    'SNAPCHAT',
    'OTHER',
  ]),
  url: z.string().url('Invalid URL').max(500, 'URL must not exceed 500 characters'),
})

/**
 * Business details upsert schema.
 *
 * Accepts arrays of business_hours and/or social_links.
 * The service replaces all existing records within a transaction.
 */
export const businessDetailsSchema = z.object({
  body: z
    .object({
      business_hours: z.array(businessHourSchema).max(7, 'Maximum 7 business hours entries (one per day)').optional(),
      social_links: z.array(socialLinkSchema).max(10, 'Maximum 10 social links').optional(),
      ...rejectedFields,
    })
    .strict()
    .refine(
      (data) => data.business_hours !== undefined || data.social_links !== undefined,
      {
        message: 'At least one of business_hours or social_links must be provided',
        path: [],
      },
    ),
})
