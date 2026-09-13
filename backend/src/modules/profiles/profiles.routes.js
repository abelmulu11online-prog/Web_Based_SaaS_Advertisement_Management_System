/**
 * profiles.routes.js — Public profile discovery + private dashboard content management.
 *
 * Public (no auth):
 *   GET /api/profiles/search                        — search profiles
 *   GET /api/profiles/check-slug/:slug              — slug availability
 *   GET /api/profiles/@:slug                        — full public profile
 *   GET /api/profiles/@:slug/products               — public products
 *   GET /api/profiles/@:slug/services               — public services
 *   GET /api/profiles/@:slug/portfolio              — public portfolio
 *   GET /api/profiles/@:slug/posts                  — public posts
 *   GET /api/profiles/@:slug/achievements           — public achievements
 *
 * Private dashboard (auth required) — mounted under /api/profile:
 *   GET  /api/profile/completion                    — completion score + checklist
 *   POST /api/profile/avatar/upload                 — upload avatar
 *   DELETE /api/profile/avatar                      — remove avatar
 *   POST /api/profile/cover/upload                  — upload cover image
 *   DELETE /api/profile/cover                       — remove cover
 *
 *   GET/POST       /api/profile/products            — list / create
 *   PATCH/DELETE   /api/profile/products/:id        — update / delete
 *   POST           /api/profile/products/:id/images/upload
 *   DELETE         /api/profile/products/:id/images/:imageId
 *
 *   (same pattern for /services, /portfolio, /posts, /achievements)
 */
import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { uploadImagesMiddleware } from '../../middleware/uploadImages.js'
import * as ctrl from './profiles.controller.js'
import {
  slugParamSchema,
  searchProfilesSchema,
  updateExtendedProfileSchema,
  createProductSchema, updateProductSchema, productParamSchema,
  createServiceSchema, updateServiceSchema, serviceParamSchema,
  createPortfolioSchema, updatePortfolioSchema, portfolioParamSchema,
  createPostSchema, updatePostSchema, postParamSchema,
  createAchievementSchema, updateAchievementSchema, achievementParamSchema,
  contentImageParamSchema,
  listProductsSchema,
  reviewSlugParamSchema, reviewIdParamSchema, createReviewSchema, updateReviewSchema,
  reviewReplySchema,
} from './profiles.schemas.js'

// Single-file upload for avatar / cover
const singleImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Unsupported file type. Use JPEG, PNG, or WEBP.'))
  },
}).single('image')

function singleUploadMiddleware(req, res, next) {
  singleImageUpload(req, res, (err) => {
    if (!err) return next()
    next(err)
  })
}

// ── Public router ─────────────────────────────────────────────────────────────
export const publicProfilesRouter = Router()

publicProfilesRouter.get('/search',           validate(searchProfilesSchema), ctrl.searchProfiles)
publicProfilesRouter.get('/check-slug/:slug', validate(slugParamSchema),      ctrl.checkSlug)

// All @slug routes — slug param without the @ prefix after route match
publicProfilesRouter.get('/@:slug',               ctrl.getPublicProfile)
publicProfilesRouter.get('/@:slug/products',      ctrl.getPublicProducts)
publicProfilesRouter.get('/@:slug/services',      ctrl.getPublicServices)
publicProfilesRouter.get('/@:slug/portfolio',     ctrl.getPublicPortfolio)
publicProfilesRouter.get('/@:slug/posts',         ctrl.getPublicPosts)
publicProfilesRouter.get('/@:slug/achievements',  ctrl.getPublicAchievements)

// Reviews (public reads)
publicProfilesRouter.get('/@:slug/reviews', validate(reviewSlugParamSchema), ctrl.listReviews)

// Profile map pins
publicProfilesRouter.get('/map-pins', ctrl.getProfileMapPins)

// ── Private dashboard router ──────────────────────────────────────────────────
export const dashboardProfileRouter = Router()

// All private routes require authentication
dashboardProfileRouter.use(authenticate)

// Profile images
dashboardProfileRouter.post('/avatar/upload',  singleUploadMiddleware, ctrl.uploadAvatar)
dashboardProfileRouter.delete('/avatar',       ctrl.deleteAvatar)
dashboardProfileRouter.post('/cover/upload',   singleUploadMiddleware, ctrl.uploadCover)
dashboardProfileRouter.delete('/cover',        ctrl.deleteCover)

// Profile completion
dashboardProfileRouter.get('/completion', ctrl.getCompletion)

// ── Products ──────────────────────────────────────────────────────────────────
dashboardProfileRouter.get('/products',         validate(listProductsSchema),    ctrl.listMyProducts)
dashboardProfileRouter.post('/products',        validate(createProductSchema),   ctrl.createProduct)
dashboardProfileRouter.patch('/products/:id',   validate(updateProductSchema),   ctrl.updateProduct)
dashboardProfileRouter.delete('/products/:id',  validate(productParamSchema),    ctrl.deleteProduct)

dashboardProfileRouter.post(
  '/products/:id/images/upload',
  validate(productParamSchema),
  uploadImagesMiddleware,
  (req, res, next) => { req.params.type = 'products'; next() },
  ctrl.uploadContentImages,
)
dashboardProfileRouter.delete(
  '/products/:id/images/:imageId',
  validate(contentImageParamSchema),
  (req, res, next) => { req.params.type = 'products'; next() },
  ctrl.deleteContentImage,
)

// ── Services ──────────────────────────────────────────────────────────────────
dashboardProfileRouter.get('/services',        validate(listProductsSchema),   ctrl.listMyServices)
dashboardProfileRouter.post('/services',       validate(createServiceSchema),  ctrl.createService)
dashboardProfileRouter.patch('/services/:id',  validate(updateServiceSchema),  ctrl.updateService)
dashboardProfileRouter.delete('/services/:id', validate(serviceParamSchema),   ctrl.deleteService)

dashboardProfileRouter.post(
  '/services/:id/images/upload',
  validate(serviceParamSchema),
  uploadImagesMiddleware,
  (req, res, next) => { req.params.type = 'services'; next() },
  ctrl.uploadContentImages,
)
dashboardProfileRouter.delete(
  '/services/:id/images/:imageId',
  validate(contentImageParamSchema),
  (req, res, next) => { req.params.type = 'services'; next() },
  ctrl.deleteContentImage,
)

// ── Portfolio ─────────────────────────────────────────────────────────────────
dashboardProfileRouter.get('/portfolio',        validate(listProductsSchema),     ctrl.listMyPortfolio)
dashboardProfileRouter.post('/portfolio',       validate(createPortfolioSchema),  ctrl.createPortfolioItem)
dashboardProfileRouter.patch('/portfolio/:id',  validate(updatePortfolioSchema),  ctrl.updatePortfolioItem)
dashboardProfileRouter.delete('/portfolio/:id', validate(portfolioParamSchema),   ctrl.deletePortfolioItem)

dashboardProfileRouter.post(
  '/portfolio/:id/images/upload',
  validate(portfolioParamSchema),
  uploadImagesMiddleware,
  (req, res, next) => { req.params.type = 'portfolio'; next() },
  ctrl.uploadContentImages,
)
dashboardProfileRouter.delete(
  '/portfolio/:id/images/:imageId',
  validate(contentImageParamSchema),
  (req, res, next) => { req.params.type = 'portfolio'; next() },
  ctrl.deleteContentImage,
)

// ── Posts ─────────────────────────────────────────────────────────────────────
dashboardProfileRouter.get('/posts',        validate(listProductsSchema),  ctrl.listMyPosts)
dashboardProfileRouter.post('/posts',       validate(createPostSchema),    ctrl.createPost)
dashboardProfileRouter.patch('/posts/:id',  validate(updatePostSchema),    ctrl.updatePost)
dashboardProfileRouter.delete('/posts/:id', validate(postParamSchema),     ctrl.deletePost)

dashboardProfileRouter.post(
  '/posts/:id/images/upload',
  validate(postParamSchema),
  uploadImagesMiddleware,
  (req, res, next) => { req.params.type = 'posts'; next() },
  ctrl.uploadContentImages,
)
dashboardProfileRouter.delete(
  '/posts/:id/images/:imageId',
  validate(contentImageParamSchema),
  (req, res, next) => { req.params.type = 'posts'; next() },
  ctrl.deleteContentImage,
)

// ── Achievements ──────────────────────────────────────────────────────────────
dashboardProfileRouter.get('/achievements',        ctrl.listMyAchievements)
dashboardProfileRouter.post('/achievements',       validate(createAchievementSchema),  ctrl.createAchievement)
dashboardProfileRouter.patch('/achievements/:id',  validate(updateAchievementSchema),  ctrl.updateAchievement)
dashboardProfileRouter.delete('/achievements/:id', validate(achievementParamSchema),   ctrl.deleteAchievement)

dashboardProfileRouter.post(
  '/achievements/:id/images/upload',
  validate(achievementParamSchema),
  uploadImagesMiddleware,
  (req, res, next) => { req.params.type = 'achievements'; next() },
  ctrl.uploadContentImages,
)
dashboardProfileRouter.delete(
  '/achievements/:id/images/:imageId',
  validate(contentImageParamSchema),
  (req, res, next) => { req.params.type = 'achievements'; next() },
  ctrl.deleteContentImage,
)

// ── Reviews ──────────────────────────────────────────────────────────────────
dashboardProfileRouter.post('/:slug/reviews',                    validate(createReviewSchema),   ctrl.submitReview)
dashboardProfileRouter.patch('/:slug/reviews/:reviewId',         validate(updateReviewSchema),   ctrl.updateReview)
dashboardProfileRouter.delete('/:slug/reviews/:reviewId',        validate(reviewIdParamSchema),  ctrl.deleteReview)

// Review replies — owner only
dashboardProfileRouter.post('/:slug/reviews/:reviewId/reply',   validate(reviewReplySchema),    ctrl.addReviewReply)
dashboardProfileRouter.delete('/:slug/reviews/:reviewId/reply', validate(reviewIdParamSchema),  ctrl.deleteReviewReply)

// Notifications
dashboardProfileRouter.get('/notifications',            ctrl.getMyNotifications)
dashboardProfileRouter.patch('/notifications/:id/read', ctrl.markNotificationRead)
dashboardProfileRouter.patch('/notifications/read-all', ctrl.markAllNotificationsRead)
