/**
 * advertisements.service.js — API calls for the advertisement feature.
 *
 * All functions return the `data` field from the standardized API response.
 * Errors are thrown as Axios errors (handled by React Query).
 */
import apiClient from './apiClient.js'

// ── Public endpoints ─────────────────────────────────────────────────────────

export async function getPublishedAdvertisements(params = {}) {
  const response = await apiClient.get('/ads', { params })
  return response.data.data
}

export async function getAdvertisement(id) {
  const response = await apiClient.get(`/ads/${id}`)
  return response.data.data
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(flat = false) {
  const response = await apiClient.get('/categories', { params: flat ? { flat: 'true' } : {} })
  return response.data.data
}

// ── Advertiser endpoints (authenticated) ─────────────────────────────────────

export async function getMyAdvertisements(params = {}) {
  const response = await apiClient.get('/ads/me', { params })
  return response.data.data
}

export async function getMyAdvertisement(id) {
  const response = await apiClient.get(`/ads/me/${id}`)
  return response.data.data
}

export async function createAdvertisement(data) {
  const response = await apiClient.post('/ads', data)
  return response.data.data
}

export async function updateAdvertisement(id, data) {
  const response = await apiClient.patch(`/ads/${id}`, data)
  return response.data.data
}

export async function publishAdvertisement(id) {
  const response = await apiClient.patch(`/ads/${id}/publish`)
  return response.data.data
}

export async function pauseAdvertisement(id) {
  const response = await apiClient.patch(`/ads/${id}/pause`)
  return response.data.data
}

export async function archiveAdvertisement(id) {
  const response = await apiClient.patch(`/ads/${id}/archive`)
  return response.data.data
}

export async function deleteAdvertisement(id) {
  const response = await apiClient.delete(`/ads/${id}`)
  return response.data.data
}

// ── Image endpoints ──────────────────────────────────────────────────────────

/**
 * Upload image files to Supabase Storage via the backend.
 * @param {string} advertisementId
 * @param {File[]} files  - Array of File objects
 */
export async function uploadAdvertisementImages(advertisementId, files) {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))
  const response = await apiClient.post(
    `/ads/${advertisementId}/images/upload`,
    formData,
    { headers: { 'Content-Type': undefined } },
  )
  return response.data.data
}

/**
 * Add an image via URL (legacy / backward-compat).
 */
export async function addAdvertisementImage(advertisementId, imageData) {
  const response = await apiClient.post(`/ads/${advertisementId}/images`, imageData)
  return response.data.data
}

export async function deleteAdvertisementImage(advertisementId, imageId) {
  const response = await apiClient.delete(`/ads/${advertisementId}/images/${imageId}`)
  return response.data.data
}

export async function setPrimaryImage(advertisementId, imageId) {
  const response = await apiClient.patch(`/ads/${advertisementId}/images/${imageId}/primary`)
  return response.data.data
}
