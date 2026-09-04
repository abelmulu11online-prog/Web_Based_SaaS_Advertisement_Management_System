/**
 * profiles.controller.js — HTTP layer for the profiles module.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as svc from './profiles.service.js'
import * as profilesRepo from './profiles.repository.js'

// ── Private helper ─────────────────────────────────────────────────────────────
async function _resolveProfile(userId) {
  const profile = await profilesRepo.findProfileByUserId(userId)
  if (!profile) {
    const err = new Error('Profile not found')
    err.statusCode = 404; err.code = 'PROFILE_NOT_FOUND'; err.isOperational = true
    throw err
  }
  return { profileId: profile.id, profile }
}

// ── Public profile ─────────────────────────────────────────────────────────────

export const getPublicProfile = asyncHandler(async (req, res) => {
  const viewerUserId = req.user?.id || null
  const profile = await svc.getPublicProfile(req.params.slug, viewerUserId)
  sendSuccess(res, 'Profile retrieved', profile)
})

export const getPublicProducts = asyncHandler(async (req, res) => {
  const profile = await svc.getPublicProfile(req.params.slug, null)
  const result  = await svc.listProducts(profile.id, { publishedOnly: true, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Products retrieved', result)
})

export const getPublicServices = asyncHandler(async (req, res) => {
  const profile = await svc.getPublicProfile(req.params.slug, null)
  const result  = await svc.listServicesOffered(profile.id, { publishedOnly: true, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Services retrieved', result)
})

export const getPublicPortfolio = asyncHandler(async (req, res) => {
  const profile = await svc.getPublicProfile(req.params.slug, null)
  const result  = await svc.listPortfolioItems(profile.id, { publishedOnly: true, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Portfolio retrieved', result)
})

export const getPublicPosts = asyncHandler(async (req, res) => {
  const profile = await svc.getPublicProfile(req.params.slug, null)
  const result  = await svc.listPosts(profile.id, { publishedOnly: true, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Posts retrieved', result)
})

export const getPublicAchievements = asyncHandler(async (req, res) => {
  const profile      = await svc.getPublicProfile(req.params.slug, null)
  const achievements = await svc.listAchievements(profile.id, { publishedOnly: true })
  sendSuccess(res, 'Achievements retrieved', achievements)
})

// ── Discovery ─────────────────────────────────────────────────────────────────

export const searchProfiles = asyncHandler(async (req, res) => {
  const result = await svc.searchProfiles(req.query || {})
  sendSuccess(res, 'Search results', result)
})

export const checkSlug = asyncHandler(async (req, res) => {
  const result = await svc.checkSlugAvailability(req.params.slug)
  sendSuccess(res, 'Slug availability checked', result)
})

// ── Dashboard: profile images ─────────────────────────────────────────────────

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(422).json({ success: false, message: 'No file provided', error: { code: 'NO_FILE' } })
  const result = await svc.uploadAvatar(req.user.id, req.file)
  sendSuccess(res, 'Avatar uploaded', result)
})

export const deleteAvatar = asyncHandler(async (req, res) => {
  await svc.deleteAvatar(req.user.id)
  sendSuccess(res, 'Avatar removed', null)
})

export const uploadCover = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(422).json({ success: false, message: 'No file provided', error: { code: 'NO_FILE' } })
  const result = await svc.uploadCover(req.user.id, req.file)
  sendSuccess(res, 'Cover image uploaded', result)
})

export const deleteCover = asyncHandler(async (req, res) => {
  await svc.deleteCover(req.user.id)
  sendSuccess(res, 'Cover image removed', null)
})

// ── Dashboard: profile completion ─────────────────────────────────────────────

export const getCompletion = asyncHandler(async (req, res) => {
  const result = await svc.getProfileCompletion(req.user.id)
  sendSuccess(res, 'Profile completion retrieved', result)
})

// ── Dashboard: products ────────────────────────────────────────────────────────

export const listMyProducts = asyncHandler(async (req, res) => {
  const { profileId } = await _resolveProfile(req.user.id)
  const result = await svc.listProducts(profileId, { publishedOnly: false, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Products retrieved', result)
})

export const createProduct = asyncHandler(async (req, res) => {
  const product = await svc.createProduct(req.user.id, req.body)
  sendSuccess(res, 'Product created', product, 201)
})

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await svc.updateProduct(req.user.id, req.params.id, req.body)
  sendSuccess(res, 'Product updated', product)
})

export const deleteProduct = asyncHandler(async (req, res) => {
  await svc.deleteProduct(req.user.id, req.params.id)
  sendSuccess(res, 'Product deleted', null)
})

// ── Dashboard: services ────────────────────────────────────────────────────────

export const listMyServices = asyncHandler(async (req, res) => {
  const { profileId } = await _resolveProfile(req.user.id)
  const result = await svc.listServicesOffered(profileId, { publishedOnly: false, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Services retrieved', result)
})

export const createService = asyncHandler(async (req, res) => {
  const service = await svc.createServiceOffered(req.user.id, req.body)
  sendSuccess(res, 'Service created', service, 201)
})

export const updateService = asyncHandler(async (req, res) => {
  const service = await svc.updateServiceOffered(req.user.id, req.params.id, req.body)
  sendSuccess(res, 'Service updated', service)
})

export const deleteService = asyncHandler(async (req, res) => {
  await svc.deleteServiceOffered(req.user.id, req.params.id)
  sendSuccess(res, 'Service deleted', null)
})

// ── Dashboard: portfolio ───────────────────────────────────────────────────────

export const listMyPortfolio = asyncHandler(async (req, res) => {
  const { profileId } = await _resolveProfile(req.user.id)
  const result = await svc.listPortfolioItems(profileId, { publishedOnly: false, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Portfolio retrieved', result)
})

export const createPortfolioItem = asyncHandler(async (req, res) => {
  const item = await svc.createPortfolioItem(req.user.id, req.body)
  sendSuccess(res, 'Portfolio item created', item, 201)
})

export const updatePortfolioItem = asyncHandler(async (req, res) => {
  const item = await svc.updatePortfolioItem(req.user.id, req.params.id, req.body)
  sendSuccess(res, 'Portfolio item updated', item)
})

export const deletePortfolioItem = asyncHandler(async (req, res) => {
  await svc.deletePortfolioItem(req.user.id, req.params.id)
  sendSuccess(res, 'Portfolio item deleted', null)
})

// ── Dashboard: posts ───────────────────────────────────────────────────────────

export const listMyPosts = asyncHandler(async (req, res) => {
  const { profileId } = await _resolveProfile(req.user.id)
  const result = await svc.listPosts(profileId, { publishedOnly: false, page: req.query.page, page_size: req.query.page_size })
  sendSuccess(res, 'Posts retrieved', result)
})

export const createPost = asyncHandler(async (req, res) => {
  const post = await svc.createPost(req.user.id, req.body)
  sendSuccess(res, 'Post created', post, 201)
})

export const updatePost = asyncHandler(async (req, res) => {
  const post = await svc.updatePost(req.user.id, req.params.id, req.body)
  sendSuccess(res, 'Post updated', post)
})

export const deletePost = asyncHandler(async (req, res) => {
  await svc.deletePost(req.user.id, req.params.id)
  sendSuccess(res, 'Post deleted', null)
})

// ── Dashboard: achievements ────────────────────────────────────────────────────

export const listMyAchievements = asyncHandler(async (req, res) => {
  const { profileId } = await _resolveProfile(req.user.id)
  const achievements = await svc.listAchievements(profileId, { publishedOnly: false })
  sendSuccess(res, 'Achievements retrieved', achievements)
})

export const createAchievement = asyncHandler(async (req, res) => {
  const achievement = await svc.createAchievement(req.user.id, req.body)
  sendSuccess(res, 'Achievement created', achievement, 201)
})

export const updateAchievement = asyncHandler(async (req, res) => {
  const achievement = await svc.updateAchievement(req.user.id, req.params.id, req.body)
  sendSuccess(res, 'Achievement updated', achievement)
})

export const deleteAchievement = asyncHandler(async (req, res) => {
  await svc.deleteAchievement(req.user.id, req.params.id)
  sendSuccess(res, 'Achievement deleted', null)
})

// ── Content image upload ───────────────────────────────────────────────────────

export const uploadContentImages = asyncHandler(async (req, res) => {
  const { type, id } = req.params
  if (!req.files || req.files.length === 0)
    return res.status(422).json({ success: false, message: 'No files provided', error: { code: 'NO_FILES' } })
  const images = await svc.uploadContentImages(req.user.id, type, id, req.files)
  sendSuccess(res, 'Images uploaded', images, 201)
})

export const deleteContentImage = asyncHandler(async (req, res) => {
  await svc.deleteContentImage(req.user.id, req.params.type, req.params.id, req.params.imageId)
  sendSuccess(res, 'Image deleted', null)
})

// ── Reviews ────────────────────────────────────────────────────────────────────

export const listReviews = asyncHandler(async (req, res) => {
  const result = await svc.listProfileReviews(req.params.slug, req.query)
  sendSuccess(res, 'Reviews retrieved', result)
})

export const submitReview = asyncHandler(async (req, res) => {
  const review = await svc.submitReview(req.params.slug, req.user.id, req.body)
  sendSuccess(res, 'Review submitted', review, 201)
})

export const updateReview = asyncHandler(async (req, res) => {
  const review = await svc.updateMyReview(req.params.slug, req.params.reviewId, req.user.id, req.body)
  sendSuccess(res, 'Review updated', review)
})

export const deleteReview = asyncHandler(async (req, res) => {
  await svc.deleteMyReview(req.params.slug, req.params.reviewId, req.user.id)
  sendSuccess(res, 'Review deleted', null)
})

export const getProfileMapPins = asyncHandler(async (req, res) => {
  const pins = await svc.getProfileMapPins(req.query)
  sendSuccess(res, 'Profile map pins retrieved', pins)
})

// ── Review replies ────────────────────────────────────────────────────────────

export const addReviewReply = asyncHandler(async (req, res) => {
  const reply = await svc.addReviewReply(req.params.slug, req.params.reviewId, req.user.id, req.body.body)
  sendSuccess(res, 'Reply added', reply, 201)
})

export const deleteReviewReply = asyncHandler(async (req, res) => {
  await svc.deleteReviewReply(req.params.slug, req.params.reviewId, req.user.id)
  sendSuccess(res, 'Reply deleted', null)
})

// ── Notifications ─────────────────────────────────────────────────────────────

export const getMyNotifications = asyncHandler(async (req, res) => {
  const result = await svc.getMyNotifications(req.user.id)
  sendSuccess(res, 'Notifications retrieved', result)
})

export const markNotificationRead = asyncHandler(async (req, res) => {
  await svc.markNotificationRead(req.params.id, req.user.id)
  sendSuccess(res, 'Marked as read', null)
})

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await svc.markAllNotificationsRead(req.user.id)
  sendSuccess(res, 'All marked as read', null)
})
