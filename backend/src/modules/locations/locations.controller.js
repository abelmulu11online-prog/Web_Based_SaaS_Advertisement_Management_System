/**
 * locations.controller.js — HTTP layer for location/geocoding endpoints.
 *
 * All geocoding is proxied through the backend to:
 *   1. Keep the Nominatim User-Agent consistent.
 *   2. Allow future server-side caching without frontend changes.
 *   3. Avoid CORS issues with direct Nominatim calls from the browser.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as locationsService from './locations.service.js'

/**
 * GET /api/locations/geocode?q=<address>&limit=<n>
 * Forward-geocode: address string → array of candidate lat/lng results.
 *
 * No authentication required (public).
 * Nominatim usage: ~1 req/s max, proxied here for rate-limit control.
 */
export const geocode = asyncHandler(async (req, res) => {
  const { q, limit = 5 } = req.query
  const results = await locationsService.geocode(q, Number(limit))
  sendSuccess(res, 'Geocoding results', results)
})

/**
 * GET /api/locations/reverse?lat=<lat>&lng=<lng>
 * Reverse-geocode: lat/lng coordinates → address string.
 *
 * No authentication required (public).
 */
export const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query
  const result = await locationsService.reverseGeocode(Number(lat), Number(lng))
  sendSuccess(res, 'Reverse geocoding result', result)
})

/**
 * GET /api/locations/nearby?lat=<lat>&lng=<lng>&radius_km=<r>&limit=<n>
 * Find published advertisements within `radius_km` of the given point.
 *
 * No authentication required — only PUBLISHED advertisements are returned.
 * Customer GPS coordinates are NEVER stored.
 */
export const nearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius_km = 10, limit = 100 } = req.query

  // Validate required params
  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  if (lat === undefined || isNaN(latNum) || latNum < -90 || latNum > 90) {
    return res.status(400).json({
      success: false,
      message: 'Valid lat parameter is required (-90 to 90)',
      error: { code: 'INVALID_PARAMS' },
    })
  }
  if (lng === undefined || isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({
      success: false,
      message: 'Valid lng parameter is required (-180 to 180)',
      error: { code: 'INVALID_PARAMS' },
    })
  }

  const results = await locationsService.findNearby(
    latNum,
    lngNum,
    Number(radius_km),
    Math.min(Number(limit), 200),
  )
  sendSuccess(res, 'Nearby advertisements retrieved successfully', results)
})

/**
 * GET /api/locations/map-pins
 * Return all published advertisements that have coordinates.
 * Minimal payload (id, title, lat, lng, price, image) for map markers.
 *
 * No authentication required.
 */
export const mapPins = asyncHandler(async (req, res) => {
  const results = await locationsService.findAllWithCoords()
  sendSuccess(res, 'Map pins retrieved successfully', results)
})
