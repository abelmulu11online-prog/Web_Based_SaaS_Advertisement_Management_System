/**
 * locationsService.js — Frontend API wrapper for location/geocoding endpoints.
 *
 * All geocoding is routed through our own backend (/api/locations/…),
 * which proxies to OpenStreetMap Nominatim. This keeps the User-Agent
 * consistent, allows server-side caching, and avoids browser CORS issues.
 *
 * To swap the geocoding provider later, only the backend service needs
 * to change — this frontend service stays identical.
 */
import apiClient from '../../../services/apiClient.js'

/**
 * Forward-geocode: address/place string → array of candidate results.
 * Debounce calls on the UI side; do not hammer this on every keystroke.
 *
 * @param {string} query  - Place name or address
 * @param {number} [limit=5] - Max candidates to return (1–10)
 * @returns {Promise<Array<{place_id,display_name,lat,lon,type,importance}>>}
 */
export async function geocodeAddress(query, limit = 5) {
  const response = await apiClient.get('/locations/geocode', {
    params: { q: query, limit },
  })
  return response.data.data
}

/**
 * Reverse-geocode: coordinates → human-readable address.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{display_name: string|null, address: object}>}
 */
export async function reverseGeocode(lat, lng) {
  const response = await apiClient.get('/locations/reverse', {
    params: { lat, lng },
  })
  return response.data.data
}

/**
 * Find published advertisements within a radius of the given point.
 * Distance calculated on the backend using Haversine formula.
 * Customer coordinates are NEVER stored server-side.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @param {number} [limit=100]
 * @returns {Promise<Array>}
 */
/**
 * Find published profiles within a radius of the given point using the profiles search API.
 * Customer coordinates are NEVER stored server-side.
 */
export async function findNearby(lat, lng, radiusKm, limit = 100) {
  const response = await apiClient.get('/profiles/search', {
    params: { lat, lng, radius_km: radiusKm, limit },
  })
  // Return profiles array for map pin compatibility
  return (response.data.data?.profiles || [])
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => ({
      id: p.id,
      slug: p.slug,
      display_name: p.display_name,
      headline: p.headline,
      avatar_url: p.avatar_url,
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
      city: p.city,
      country: p.country,
      category_name: p.category_name,
      is_verified: p.is_verified,
      avg_rating: p.avg_rating,
      review_count: p.review_count,
    }))
}

/**
 * Fetch all published advertisements with coordinates for the map view.
 * Returns minimal payload (id, title, lat, lng, price, image).
 *
 * @returns {Promise<Array>}
 */
/**
 * Fetch published profiles with coordinates for the map view.
 * @param {object} params - optional filters: search, category_id, city, country
 */
export async function getProfileMapPins(params = {}) {
  const response = await apiClient.get('/profiles/map-pins', { params })
  return response.data.data
}
