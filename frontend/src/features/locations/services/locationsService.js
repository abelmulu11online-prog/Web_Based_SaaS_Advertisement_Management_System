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
export async function findNearby(lat, lng, radiusKm, limit = 100) {
  const response = await apiClient.get('/locations/nearby', {
    params: { lat, lng, radius_km: radiusKm, limit },
  })
  return response.data.data
}

/**
 * Fetch all published advertisements with coordinates for the map view.
 * Returns minimal payload (id, title, lat, lng, price, image).
 *
 * @returns {Promise<Array>}
 */
export async function getMapPins() {
  const response = await apiClient.get('/ads/map')
  return response.data.data
}
