/**
 * advertisements.schemas.js — Zod validation schemas for advertisement endpoints.
 *
 * Security: explicitly rejects client-controlled fields
 * (user_id, status, published_at, created_at, updated_at, id).
 * Ownership is always derived from the authenticated JWT, never from the request body.
 */
import { z } from 'zod'

// ── Reusable field schemas ────────────────────────────────────────────────────

const titleSchema = z
  .string()
  .min(3, 'Title must be at least 3 characters')
  .max(200, 'Title must not exceed 200 characters')
  .trim()

const descriptionSchema = z
  .string()
  .min(10, 'Description must be at least 10 characters')
  .max(5000, 'Description must not exceed 5000 characters')
  .trim()

const uuidSchema = z.string().uuid('Invalid UUID format')

const priceSchema = z
  .number()
  .nonnegative('Price must be 0 or greater')
  .optional()

const priceTypeSchema = z
  .enum(['FIXED', 'NEGOTIABLE', 'CONTACT_FOR_PRICE', 'FREE'])
  .optional()

const contactPhoneSchema = z
  .string()
  .regex(
    /^\+?[1-9][\d\s]{6,14}$/,
    'Invalid phone format. Use international format (e.g., +1234567890)',
  )
  .transform((val) => val.replace(/\s/g, ''))
  .optional()

const contactEmailSchema = z
  .string()
  .email('Invalid email format')
  .transform((val) => val.toLowerCase().trim())
  .optional()

const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90')
  .optional()

const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180')
  .optional()

const addressSchema = z
  .string()
  .max(500, 'Address must not exceed 500 characters')
  .trim()
  .optional()

/** Fields that must NEVER be accepted from the client. */
const rejectedFields = {
  id: z.never().optional(),
  user_id: z.never().optional(),
  status: z.never().optional(),
  published_at: z.never().optional(),
  created_at: z.never().optional(),
  updated_at: z.never().optional(),
}

// ── Advertisement schemas ────────────────────────────────────────────────────

/**
 * Create advertisement schema.
 * Required: title, description.
 * Optional: category_id, price, price_type, contact info, location.
 */
export const createAdvertisementSchema = z.object({
  body: z
    .object({
      title: titleSchema,
      description: descriptionSchema,
      category_id: uuidSchema.optional(),
      price: priceSchema,
      price_type: priceTypeSchema,
      contact_phone: contactPhoneSchema,
      contact_email: contactEmailSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      address: addressSchema,
      ...rejectedFields,
    })
    .strict(),
})

/**
 * Update advertisement schema (PATCH — all fields optional).
 * At least one updatable field must be present.
 */
export const updateAdvertisementSchema = z.object({
  body: z
    .object({
      title: titleSchema.optional(),
      description: descriptionSchema.optional(),
      category_id: uuidSchema.optional(),
      price: priceSchema,
      price_type: priceTypeSchema,
      contact_phone: contactPhoneSchema,
      contact_email: contactEmailSchema,
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      address: addressSchema,
      expires_at: z.string().regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        'expires_at must be a valid ISO 8601 datetime (e.g. 2025-12-31T23:59:59Z)'
      ).optional(),
      ...rejectedFields,
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
      path: [],
    }),
})

/**
 * Advertisement ID param schema.
 */
export const advertisementParamSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
})

/**
 * Image ID param schema (advertisement/:id/images/:imageId).
 */
export const imageParamSchema = z.object({
  params: z.object({
    id: uuidSchema,
    imageId: uuidSchema,
  }),
})

/**
 * Add image schema.
 */
export const addImageSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z
    .object({
      image_url: z
        .string()
        .url('image_url must be a valid URL')
        .max(2000, 'image_url must not exceed 2000 characters'),
      storage_key: z.string().max(1000).optional(),
      alt_text: z.string().max(300, 'alt_text must not exceed 300 characters').optional(),
      sort_order: z.number().int().min(0).optional(),
      is_primary: z.boolean().optional(),
    })
    .strict(),
})

/**
 * Public listing query schema.
 * Supports standard filters plus optional geo-radius search.
 */
export const listPublicSchema = z.object({
  query: z
    .object({
      search: z.string().max(200).optional(),
      category_id: uuidSchema.optional(),
      min_price: z.coerce.number().nonnegative().optional(),
      max_price: z.coerce.number().nonnegative().optional(),
      page: z.coerce.number().int().positive().optional(),
      page_size: z.coerce.number().int().positive().max(100).optional(),
      // ── Geo-radius search (all three required together) ───────────────────
      lat: z.coerce
        .number()
        .min(-90, 'lat must be between -90 and 90')
        .max(90, 'lat must be between -90 and 90')
        .optional(),
      lng: z.coerce
        .number()
        .min(-180, 'lng must be between -180 and 180')
        .max(180, 'lng must be between -180 and 180')
        .optional(),
      radius_km: z.coerce
        .number()
        .positive('radius_km must be positive')
        .max(500, 'radius_km must not exceed 500')
        .optional(),
    })
    .optional(),
})

/**
 * My advertisements query schema.
 */
export const listMyAdsSchema = z.object({
  query: z
    .object({
      status: z
        .enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'EXPIRED', 'ARCHIVED'])
        .optional(),
      page: z.coerce.number().int().positive().optional(),
      page_size: z.coerce.number().int().positive().max(100).optional(),
    })
    .optional(),
})
