/**
 * advertisements.service.js — API calls for the advertisement feature.
 *
 * All functions return the `data` field from the standardized API response.
 * Errors are thrown as Axios errors (handled by React Query).
 */
import apiClient from './apiClient.js'

// ── Public endpoints ─────────────────────────────────────────────────────────

/**
 * List published advertisements with optional filtering and pagination.
 * @param {object} params - { search?, category_id?, min_price?, max_price?, page?, page_size? }
 */
export async function getPublishedAdvertisements(params = {}) {
  const response = await apiClient.get('/ads', { params })
  return response.data.data
}

/**
 * Get a single published advertisement by ID.
 * @param {string} id
 */
export async function getAdvertisement(id) {
  const response = await apiClient.get(`/ads/${id}`)
  return response.data.data
}

// ── Categories ───────────────────────────────────────────────────────────────

/**
 * Get all active categories as a tree.
 * @param {boolean} flat - If true, returns a flat list
 */
export async function getCategories(flat = false) {
  const response = await apiClient.get('/categories', { params: flat ? { flat: 'true' } : {} })
  return response.data.data
}

// ── Advertiser endpoints (authenticated) ─────────────────────────────────────

/**
 * List the authenticated user's advertisements.
 * @param {object} params - { status?, page?, page_size? }
 */
export async function getMyAdvertisements(params = {}) {
  const response = await apiClient.get('/ads/me', { params })
  return response.data.data
}

/**
 * Get one of the authenticated user's advertisements by ID (any status).
 * @param {string} id
 */
export async function getMyAdvertisement(id) {
  const response = await apiClient.get(`/ads/me/${id}`)
  return response.data.data
}

/**
 * Create a new advertisement (starts as DRAFT).
 * @param {object} data
 */
export async function createAdvertisement(data) {
  const response = await apiClient.post('/ads', data)
  return response.data.data
}

/**
 * Update an advertisement's fields.
 * @param {string} id
 * @param {object} data
 */
export async function updateAdvertisement(id, data) {
  const response = await apiClient.patch(`/ads/${id}`, data)
  return response.data.data
}

/**
 * Publish an advertisement (DRAFT → PUBLISHED or PAUSED → PUBLISHED).
 * @param {string} id
 */
export async function publishAdvertisement(id) {
  const response = await apiClient.patch(`/ads/${id}/publish`)
  return response.data.data
}

/**
 * Pause a published advertisement (PUBLISHED → PAUSED).
 * @param {string} id
 */
export async function pauseAdvertisement(id) {
  const response = await apiClient.patch(`/ads/${id}/pause`)
  return response.data.data
}

/**
 * Archive an advertisement.
 * @param {string} id
 */
export async function archiveAdvertisement(id) {
  const response = await apiClient.patch(`/ads/${id}/archive`)
  return response.data.data
}

/**
 * Delete a DRAFT or ARCHIVED advertisement.
 * @param {string} id
 */
export async function deleteAdvertisement(id) {
  const response = await apiClient.delete(`/ads/${id}`)
  return response.data.data
}

// ── Image endpoints ──────────────────────────────────────────────────────────

/**
 * Add an image to an advertisement.
 * @param {string} advertisementId
 * @param {object} imageData - { image_url, storage_key?, alt_text?, sort_order?, is_primary? }
 */
export async function addAdvertisementImage(advertisementId, imageData) {
  const response = await apiClient.post(`/ads/${advertisementId}/images`, imageData)
  return response.data.data
}

/**
 * Delete an image from an advertisement.
 * @param {string} advertisementId
 * @param {string} imageId
 */
export async function deleteAdvertisementImage(advertisementId, imageId) {
  const response = await apiClient.delete(`/ads/${advertisementId}/images/${imageId}`)
  return response.data.data
}

/**
 * Set an image as the primary/cover image.
 * @param {string} advertisementId
 * @param {string} imageId
 */
export async function setPrimaryImage(advertisementId, imageId) {
  const response = await apiClient.patch(`/ads/${advertisementId}/images/${imageId}/primary`)
  return response.data.data
}
