/**
 * locations.schemas.js — Zod validation schemas for location/geocoding endpoints.
 */
import { z } from 'zod'

/**
 * Geocode query: address → coordinates
 * GET /api/locations/geocode?q=Bole+Addis+Ababa
 */
export const geocodeQuerySchema = z.object({
  query: z.object({
    q: z
      .string()
      .min(2, 'Search query must be at least 2 characters')
      .max(300, 'Search query must not exceed 300 characters')
      .trim(),
    limit: z.coerce.number().int().positive().max(10).optional().default(5),
  }),
})

/**
 * Reverse geocode query: coordinates → address
 * GET /api/locations/reverse?lat=9.005&lng=38.763
 */
export const reverseGeocodeQuerySchema = z.object({
  query: z.object({
    lat: z.coerce
      .number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    lng: z.coerce
      .number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  }),
})
