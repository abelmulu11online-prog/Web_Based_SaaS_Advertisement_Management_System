/**
 * profiles.service.js — API calls for the profiles module.
 * All functions return the `data` field from the standardized API response.
 */
import apiClient from './apiClient.js'

// ── Public profile ─────────────────────────────────────────────────────────────

export async function getPublicProfile(slug) {
  const res = await apiClient.get(`/profiles/@${slug}`)
  return res.data.data
}

export async function getPublicServices(slug, params = {}) {
  const res = await apiClient.get(`/profiles/@${slug}/services`, { params })
  return res.data.data
}

export async function getPublicPortfolio(slug, params = {}) {
  const res = await apiClient.get(`/profiles/@${slug}/portfolio`, { params })
  return res.data.data
}

export async function getPublicPosts(slug, params = {}) {
  const res = await apiClient.get(`/profiles/@${slug}/posts`, { params })
  return res.data.data
}

export async function getPublicAchievements(slug) {
  const res = await apiClient.get(`/profiles/@${slug}/achievements`)
  return res.data.data
}

// ── Discovery ─────────────────────────────────────────────────────────────────

export async function searchProfiles(params = {}) {
  const res = await apiClient.get('/profiles/search', { params })
  return res.data.data
}

export async function checkSlugAvailability(slug) {
  const res = await apiClient.get(`/profiles/check-slug/${slug}`)
  return res.data.data
}

// ── Own profile ────────────────────────────────────────────────────────────────

export async function getMyProfile() {
  const res = await apiClient.get('/profile')
  return res.data.data
}

export async function createProfile(data) {
  const res = await apiClient.post('/profile', data)
  return res.data.data
}

export async function updateMyProfile(data) {
  const res = await apiClient.patch('/profile', data)
  return res.data.data
}

export async function getProfileCompletion() {
  const res = await apiClient.get('/profile/completion')
  return res.data.data
}

// ── Profile images ─────────────────────────────────────────────────────────────

export async function uploadAvatar(file) {
  const fd = new FormData()
  fd.append('image', file)
  const res = await apiClient.post('/profile/avatar/upload', fd, { headers: { 'Content-Type': undefined } })
  return res.data.data
}

export async function deleteAvatar() {
  const res = await apiClient.delete('/profile/avatar')
  return res.data.data
}

export async function uploadCover(file) {
  const fd = new FormData()
  fd.append('image', file)
  const res = await apiClient.post('/profile/cover/upload', fd, { headers: { 'Content-Type': undefined } })
  return res.data.data
}

export async function deleteCover() {
  const res = await apiClient.delete('/profile/cover')
  return res.data.data
}

// ── Business details (existing) ────────────────────────────────────────────────

export async function getBusinessDetails() {
  const res = await apiClient.get('/profile/business')
  return res.data.data
}

export async function upsertBusinessDetails(data) {
  const res = await apiClient.post('/profile/business', data)
  return res.data.data
}

// ── Services ───────────────────────────────────────────────────────────────────

export async function getMyServices(params = {}) {
  const res = await apiClient.get('/profile/services', { params })
  return res.data.data
}

export async function createService(data) {
  const res = await apiClient.post('/profile/services', data)
  return res.data.data
}

export async function updateService(id, data) {
  const res = await apiClient.patch(`/profile/services/${id}`, data)
  return res.data.data
}

export async function deleteService(id) {
  const res = await apiClient.delete(`/profile/services/${id}`)
  return res.data.data
}

export async function uploadServiceImages(id, files) {
  const fd = new FormData()
  files.forEach(f => fd.append('images', f))
  const res = await apiClient.post(`/profile/services/${id}/images/upload`, fd, { headers: { 'Content-Type': undefined } })
  return res.data.data
}

export async function deleteServiceImage(serviceId, imageId) {
  const res = await apiClient.delete(`/profile/services/${serviceId}/images/${imageId}`)
  return res.data.data
}

// ── Portfolio ──────────────────────────────────────────────────────────────────

export async function getMyPortfolio(params = {}) {
  const res = await apiClient.get('/profile/portfolio', { params })
  return res.data.data
}

export async function createPortfolioItem(data) {
  const res = await apiClient.post('/profile/portfolio', data)
  return res.data.data
}

export async function updatePortfolioItem(id, data) {
  const res = await apiClient.patch(`/profile/portfolio/${id}`, data)
  return res.data.data
}

export async function deletePortfolioItem(id) {
  const res = await apiClient.delete(`/profile/portfolio/${id}`)
  return res.data.data
}

export async function uploadPortfolioImages(id, files) {
  const fd = new FormData()
  files.forEach(f => fd.append('images', f))
  const res = await apiClient.post(`/profile/portfolio/${id}/images/upload`, fd, { headers: { 'Content-Type': undefined } })
  return res.data.data
}

// ── Posts ──────────────────────────────────────────────────────────────────────

export async function getMyPosts(params = {}) {
  const res = await apiClient.get('/profile/posts', { params })
  return res.data.data
}

export async function createPost(data) {
  const res = await apiClient.post('/profile/posts', data)
  return res.data.data
}

export async function updatePost(id, data) {
  const res = await apiClient.patch(`/profile/posts/${id}`, data)
  return res.data.data
}

export async function deletePost(id) {
  const res = await apiClient.delete(`/profile/posts/${id}`)
  return res.data.data
}

export async function uploadPostImages(id, files) {
  const fd = new FormData()
  files.forEach(f => fd.append('images', f))
  const res = await apiClient.post(`/profile/posts/${id}/images/upload`, fd, { headers: { 'Content-Type': undefined } })
  return res.data.data
}

// ── Achievements ───────────────────────────────────────────────────────────────

export async function getMyAchievements() {
  const res = await apiClient.get('/profile/achievements')
  return res.data.data
}

export async function createAchievement(data) {
  const res = await apiClient.post('/profile/achievements', data)
  return res.data.data
}

export async function updateAchievement(id, data) {
  const res = await apiClient.patch(`/profile/achievements/${id}`, data)
  return res.data.data
}

export async function deleteAchievement(id) {
  const res = await apiClient.delete(`/profile/achievements/${id}`)
  return res.data.data
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function getPublicReviews(slug, params = {}) {
  const res = await apiClient.get(`/profiles/@${slug}/reviews`, { params })
  return res.data.data
}

export async function submitReview(slug, data) {
  const res = await apiClient.post(`/profile/${slug}/reviews`, data)
  return res.data.data
}

export async function updateReview(slug, reviewId, data) {
  const res = await apiClient.patch(`/profile/${slug}/reviews/${reviewId}`, data)
  return res.data.data
}

export async function deleteReview(slug, reviewId) {
  const res = await apiClient.delete(`/profile/${slug}/reviews/${reviewId}`)
  return res.data.data
}

// ── Review replies ────────────────────────────────────────────────────────────

export async function addReviewReply(slug, reviewId, body) {
  const res = await apiClient.post(`/profile/${slug}/reviews/${reviewId}/reply`, { body })
  return res.data.data
}

export async function deleteReviewReply(slug, reviewId) {
  const res = await apiClient.delete(`/profile/${slug}/reviews/${reviewId}/reply`)
  return res.data.data
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications() {
  const res = await apiClient.get('/profile/notifications')
  return res.data.data
}

export async function markNotificationRead(id) {
  const res = await apiClient.patch(`/profile/notifications/${id}/read`)
  return res.data.data
}

export async function markAllNotificationsRead() {
  const res = await apiClient.patch('/profile/notifications/read-all')
  return res.data.data
}

// ── Verification workflow ─────────────────────────────────────────────────────

/**
 * Upload a verification document (JPG/PNG/PDF, max 10 MB).
 * @param {File} file
 * @param {function} [onUploadProgress] - optional Axios progress callback
 */
export async function uploadVerificationDocument(file, onUploadProgress) {
  const fd = new FormData()
  fd.append('document', file)
  const res = await apiClient.post('/profile/verification-document/upload', fd, {
    headers: { 'Content-Type': undefined },
    onUploadProgress,
  })
  return res.data.data
}

/** Get the current user's verification document metadata. */
export async function getMyVerificationDocument() {
  const res = await apiClient.get('/profile/verification-document')
  return res.data.data
}

/** Submit the profile for admin review (UNVERIFIED/REJECTED → UNDER_REVIEW). */
export async function submitProfileForReview() {
  const res = await apiClient.post('/profile/submit-review')
  return res.data.data
}

/** Resubmit a rejected profile for admin review (REJECTED → UNDER_REVIEW). */
export async function resubmitProfileForReview() {
  const res = await apiClient.post('/profile/resubmit')
  return res.data.data
}

/** Publish the profile (set is_published = true). Backend enforces approval gate. */
export async function publishProfile() {
  const res = await apiClient.post('/profile/publish')
  return res.data.data
}

/** Unpublish the profile (set is_published = false). */
export async function unpublishProfile() {
  const res = await apiClient.post('/profile/unpublish')
  return res.data.data
}
