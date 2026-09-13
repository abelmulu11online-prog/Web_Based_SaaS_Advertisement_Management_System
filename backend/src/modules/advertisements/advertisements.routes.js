/**
 * advertisements.routes.js — Advertisement listing routes.
 *
 * Route layout:
 *
 * Public (no auth):
 *   GET  /api/ads             — list/search published advertisements
 *   GET  /api/ads/:id         — get a single published advertisement
 *
 * Advertiser (auth required):
 *   GET    /api/ads/me              — list the caller's advertisements (all statuses)
 *   GET    /api/ads/me/:id          — get one of the caller's advertisements
 *   POST   /api/ads                 — create advertisement (starts as DRAFT)
 *   PATCH  /api/ads/:id             — update advertisement fields (DRAFT or PAUSED only)
 *   DELETE /api/ads/:id             — delete advertisement (DRAFT or ARCHIVED only)
 *   PATCH  /api/ads/:id/publish     — publish (DRAFT → PUBLISHED or PAUSED → PUBLISHED)
 *   PATCH  /api/ads/:id/pause       — pause  (PUBLISHED → PAUSED)
 *   PATCH  /api/ads/:id/archive     — archive (DRAFT|PUBLISHED|PAUSED → ARCHIVED)
 *   POST   /api/ads/:id/images      — add image
 *   DELETE /api/ads/:id/images/:imageId   — delete image
 *   PATCH  /api/ads/:id/images/:imageId/primary — set primary image
 *
 * IMPORTANT: /api/ads/me must be registered BEFORE /api/ads/:id
 * to prevent Express from treating "me" as an ID parameter.
 */
import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { uploadImagesMiddleware } from '../../middleware/uploadImages.js'
import {
  createAdvertisementSchema,
  updateAdvertisementSchema,
  advertisementParamSchema,
  imageParamSchema,
  addImageSchema,
  listPublicSchema,
  listMyAdsSchema,
} from './advertisements.schemas.js'
import * as adsController from './advertisements.controller.js'

const router = Router()

// ── Public routes (no authentication required) ───────────────────────────────

/**
 * GET /api/ads
 * List/search published advertisements with pagination and filtering.
 */
router.get('/', validate(listPublicSchema), adsController.listPublished)

/**
 * GET /api/ads/map
 * Return minimal map-pin data for all published advertisements with coordinates.
 * Must be registered BEFORE /:id to prevent Express treating "map" as an ID.
 */
router.get('/map', adsController.listMapPins)

// ── Advertiser routes (/me — must come before /:id) ──────────────────────────

/**
 * GET /api/ads/me
 * List all of the authenticated user's advertisements.
 */
router.get('/me', authenticate, validate(listMyAdsSchema), adsController.listMyAdvertisements)

/**
 * GET /api/ads/me/:id
 * Get one of the authenticated user's advertisements by ID.
 */
router.get('/me/:id', authenticate, validate(advertisementParamSchema), adsController.getMyAdvertisementById)

// ── Authenticated advertiser operations ──────────────────────────────────────

/**
 * POST /api/ads
 * Create a new advertisement (starts in DRAFT status).
 */
router.post('/', authenticate, validate(createAdvertisementSchema), adsController.createAdvertisement)

/**
 * PATCH /api/ads/:id
 * Update an advertisement's fields. Only DRAFT or PAUSED ads can be edited.
 */
router.patch('/:id', authenticate, validate(updateAdvertisementSchema), adsController.updateAdvertisement)

/**
 * PATCH /api/ads/:id/publish
 * Publish: DRAFT → PUBLISHED or PAUSED → PUBLISHED.
 */
router.patch('/:id/publish', authenticate, validate(advertisementParamSchema), adsController.publishAdvertisement)

/**
 * PATCH /api/ads/:id/pause
 * Pause: PUBLISHED → PAUSED.
 */
router.patch('/:id/pause', authenticate, validate(advertisementParamSchema), adsController.pauseAdvertisement)

/**
 * PATCH /api/ads/:id/archive
 * Archive: any non-expired status → ARCHIVED.
 */
router.patch('/:id/archive', authenticate, validate(advertisementParamSchema), adsController.archiveAdvertisement)

/**
 * DELETE /api/ads/:id
 * Hard-delete a DRAFT or ARCHIVED advertisement.
 */
router.delete('/:id', authenticate, validate(advertisementParamSchema), adsController.deleteAdvertisement)

// ── Image endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/ads/:id/images/upload
 * Upload image files via multipart/form-data to Supabase Storage.
 * Field name must be "images". Max 5 files, 5 MB each. JPEG/PNG/WEBP only.
 * IMPORTANT: This route must come BEFORE /:id/images (the URL-based route)
 * so "upload" is not treated as an imageId param.
 */
router.post(
  '/:id/images/upload',
  authenticate,
  validate(advertisementParamSchema),
  uploadImagesMiddleware,
  adsController.uploadImages,
)

/**
 * POST /api/ads/:id/images
 * Add an image to an advertisement (URL-based — kept for backward compatibility).
 */
router.post('/:id/images', authenticate, validate(addImageSchema), adsController.addImage)

/**
 * DELETE /api/ads/:id/images/:imageId
 * Remove an image from an advertisement.
 */
router.delete('/:id/images/:imageId', authenticate, validate(imageParamSchema), adsController.deleteImage)

/**
 * PATCH /api/ads/:id/images/:imageId/primary
 * Set an image as the primary/cover image.
 */
router.patch('/:id/images/:imageId/primary', authenticate, validate(imageParamSchema), adsController.setPrimaryImage)

// ── Public single ad (must come after /me and action routes) ─────────────────

/**
 * GET /api/ads/:id
 * Get a single published advertisement by ID.
 */
router.get('/:id', validate(advertisementParamSchema), adsController.getPublicById)

export default router
