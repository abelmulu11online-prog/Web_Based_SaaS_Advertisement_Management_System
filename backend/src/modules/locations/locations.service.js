/**
 * locations.service.js — Business logic for geocoding and location queries.
 *
 * Geocoding provider: OpenStreetMap Nominatim (free, no API key required).
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 *   - Do not send more than 1 request per second.
 *   - Provide a descriptive User-Agent.
 *   - Cache results where possible.
 *
 * All geocoding is routed through this service so the provider can be
 * swapped out later without touching controllers or routes.
 */
import * as locationsRepo from './locations.repository.js'
import { createError } from '../../utils/index.js'
import logger from '../../utils/logger.js'

// ── Nominatim configuration ───────────────────────────────────────────────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

/** User-Agent required by Nominatim policy */
const USER_AGENT = 'GebetaMarket/1.0 (saas-ad-platform; contact@gebetamarket.com)'

// ── Geocoding ─────────────────────────────────────────────────────────────────

/**
 * Geocode: address string → array of candidate locations.
 * Returns up to `limit` results sorted by relevance (Nominatim default).
 *
 * @param {string} query   - Human-readable address / place name
 * @param {number} limit   - Max results (1–10, default 5)
 * @returns {Promise<Array<{display_name,lat,lon,place_id,type,importance}>>}
 */
export async function geocode(query, limit = 5) {
  const url = new URL(`${NOMINATIM_BASE}/search`)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', String(Math.min(limit, 10)))
  url.searchParams.set('addressdetails', '0')

  logger.info({ query, limit }, 'Nominatim geocode request')

  let response
  try {
    response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    logger.error({ err }, 'Nominatim geocode fetch error')
    throw createError('Geocoding service unavailable', 503, 'GEOCODING_UNAVAILABLE')
  }

  if (!response.ok) {
    logger.error({ status: response.status }, 'Nominatim geocode HTTP error')
    throw createError('Geocoding service returned an error', 502, 'GEOCODING_ERROR')
  }

  const raw = await response.json()

  return raw.map((item) => ({
    place_id: item.place_id,
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type,
    importance: item.importance,
  }))
}

/**
 * Reverse geocode: coordinates → address string.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{display_name:string, address:object}>}
 */
export async function reverseGeocode(lat, lng) {
  const url = new URL(`${NOMINATIM_BASE}/reverse`)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')

  logger.info({ lat, lng }, 'Nominatim reverse geocode request')

  let response
  try {
    response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    logger.error({ err }, 'Nominatim reverse geocode fetch error')
    throw createError('Reverse geocoding service unavailable', 503, 'GEOCODING_UNAVAILABLE')
  }

  if (!response.ok) {
    logger.error({ status: response.status }, 'Nominatim reverse geocode HTTP error')
    throw createError('Reverse geocoding service returned an error', 502, 'GEOCODING_ERROR')
  }

  const raw = await response.json()

  if (raw.error) {
    // Nominatim returns 200 with { error: "..." } for points in the sea etc.
    return { display_name: null, address: {} }
  }

  return {
    display_name: raw.display_name || null,
    address: raw.address || {},
  }
}

// ── Map data queries ──────────────────────────────────────────────────────────

/**
 * Find published advertisements near a point.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm - Search radius in kilometres
 * @param {number} [limit]
 * @returns {Promise<Array>}
 */
export async function findNearby(lat, lng, radiusKm, limit = 100) {
  if (radiusKm <= 0 || radiusKm > 500) {
    throw createError('Radius must be between 1 and 500 km', 400, 'INVALID_RADIUS')
  }
  return locationsRepo.findNearby(lat, lng, radiusKm, limit)
}

/**
 * Return all published ads with coordinates for the full map view.
 *
 * @returns {Promise<Array>}
 */
export async function findAllWithCoords() {
  return locationsRepo.findAllWithCoords(500)
}
