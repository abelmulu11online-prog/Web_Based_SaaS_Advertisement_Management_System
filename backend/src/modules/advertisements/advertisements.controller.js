/**
 * advertisements.controller.js — HTTP layer for advertisement endpoints.
 *
 * Thin controllers: validate input, delegate to service, return standardized response.
 * User identity is always derived from req.user.id (set by authenticate middleware).
 * Never trusts user_id or advertiser_id from the request body.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as adsService from './advertisements.service.js'

// ── Public endpoints ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: List published advertisements
 *     description: Returns paginated published advertisements with optional search and filtering. No authentication required.
 *     tags:
 *       - Advertisements (Public)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term (matches title and description)
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category UUID
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Advertisements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 */
export const listPublished = asyncHandler(async (req, res) => {
  const result = await adsService.listPublished(req.query || {})
  sendSuccess(res, 'Advertisements retrieved successfully', result)
})

/**
 * @swagger
 * /api/ads/{id}:
 *   get:
 *     summary: Get a published advertisement by ID
 *     description: Returns full advertisement detail. Only works for PUBLISHED advertisements.
 *     tags:
 *       - Advertisements (Public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement retrieved successfully
 *       404:
 *         description: Advertisement not found or not published
 */
export const getPublicById = asyncHandler(async (req, res) => {
  const ad = await adsService.getPublicById(req.params.id)
  sendSuccess(res, 'Advertisement retrieved successfully', ad)
})

// ── Advertiser — my advertisements ────────────────────────────────────────────

/**
 * @swagger
 * /api/ads/me:
 *   get:
 *     summary: List the authenticated user's advertisements
 *     description: Returns all the authenticated user's advertisements (all statuses), with pagination.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, PAUSED, EXPIRED, ARCHIVED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Advertisements retrieved successfully
 *       401:
 *         description: Authentication required
 */
export const listMyAdvertisements = asyncHandler(async (req, res) => {
  const result = await adsService.listMyAdvertisements(req.user.id, req.query || {})
  sendSuccess(res, 'Your advertisements retrieved successfully', result)
})

/**
 * @swagger
 * /api/ads/me/{id}:
 *   get:
 *     summary: Get one of the authenticated user's advertisements by ID
 *     description: Returns full detail for an advertisement owned by the caller, regardless of status.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement not found or not owned by caller
 */
export const getMyAdvertisementById = asyncHandler(async (req, res) => {
  const ad = await adsService.getMyAdvertisementById(req.params.id, req.user.id)
  sendSuccess(res, 'Advertisement retrieved successfully', ad)
})

/**
 * @swagger
 * /api/ads:
 *   post:
 *     summary: Create a new advertisement
 *     description: Creates a new advertisement in DRAFT status. Authentication required.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               price:
 *                 type: number
 *                 minimum: 0
 *               price_type:
 *                 type: string
 *                 enum: [FIXED, NEGOTIABLE, CONTACT_FOR_PRICE, FREE]
 *               contact_phone:
 *                 type: string
 *               contact_email:
 *                 type: string
 *                 format: email
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *       401:
 *         description: Authentication required
 *       422:
 *         description: Validation failed
 */
export const createAdvertisement = asyncHandler(async (req, res) => {
  const ad = await adsService.createAdvertisement(req.user.id, req.body)
  sendSuccess(res, 'Advertisement created successfully', ad, 201)
})

/**
 * @swagger
 * /api/ads/{id}:
 *   patch:
 *     summary: Update an advertisement
 *     description: Updates an advertisement owned by the caller. Only DRAFT or PAUSED ads can be edited.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               price:
 *                 type: number
 *               price_type:
 *                 type: string
 *                 enum: [FIXED, NEGOTIABLE, CONTACT_FOR_PRICE, FREE]
 *               contact_phone:
 *                 type: string
 *               contact_email:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Advertisement updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement not found or not owned by caller
 *       409:
 *         description: Advertisement is not in an editable state
 */
export const updateAdvertisement = asyncHandler(async (req, res) => {
  const ad = await adsService.updateAdvertisement(req.params.id, req.user.id, req.body)
  sendSuccess(res, 'Advertisement updated successfully', ad)
})

/**
 * @swagger
 * /api/ads/{id}/publish:
 *   patch:
 *     summary: Publish an advertisement
 *     description: Transitions status from DRAFT or PAUSED to PUBLISHED.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement published successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement not found
 *       409:
 *         description: Invalid status transition
 */
export const publishAdvertisement = asyncHandler(async (req, res) => {
  const ad = await adsService.publishAdvertisement(req.params.id, req.user.id)
  sendSuccess(res, 'Advertisement published successfully', ad)
})

/**
 * @swagger
 * /api/ads/{id}/pause:
 *   patch:
 *     summary: Pause an advertisement
 *     description: Transitions status from PUBLISHED to PAUSED.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement paused successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement not found
 *       409:
 *         description: Invalid status transition
 */
export const pauseAdvertisement = asyncHandler(async (req, res) => {
  const ad = await adsService.pauseAdvertisement(req.params.id, req.user.id)
  sendSuccess(res, 'Advertisement paused successfully', ad)
})

/**
 * @swagger
 * /api/ads/{id}/archive:
 *   patch:
 *     summary: Archive an advertisement
 *     description: Transitions status to ARCHIVED from any non-expired status.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement archived successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement not found
 *       409:
 *         description: Invalid status transition
 */
export const archiveAdvertisement = asyncHandler(async (req, res) => {
  const ad = await adsService.archiveAdvertisement(req.params.id, req.user.id)
  sendSuccess(res, 'Advertisement archived successfully', ad)
})

/**
 * @swagger
 * /api/ads/{id}:
 *   delete:
 *     summary: Delete an advertisement
 *     description: Permanently deletes a DRAFT or ARCHIVED advertisement owned by the caller.
 *     tags:
 *       - Advertisements (Advertiser)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Advertisement deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement not found
 *       409:
 *         description: Advertisement cannot be deleted in its current state
 */
export const deleteAdvertisement = asyncHandler(async (req, res) => {
  await adsService.deleteAdvertisement(req.params.id, req.user.id)
  sendSuccess(res, 'Advertisement deleted successfully', null)
})

// ── Image endpoints ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/ads/{id}/images:
 *   post:
 *     summary: Add an image to an advertisement
 *     description: Adds an image record to an advertisement. Maximum 10 images per advertisement.
 *     tags:
 *       - Advertisement Images
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image_url
 *             properties:
 *               image_url:
 *                 type: string
 *                 format: uri
 *               storage_key:
 *                 type: string
 *               alt_text:
 *                 type: string
 *               sort_order:
 *                 type: integer
 *                 minimum: 0
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Image added successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement not found
 *       409:
 *         description: Maximum images reached
 */
export const addImage = asyncHandler(async (req, res) => {
  const image = await adsService.addImage(req.params.id, req.user.id, req.body)
  sendSuccess(res, 'Image added successfully', image, 201)
})

/**
 * @swagger
 * /api/ads/{id}/images/{imageId}:
 *   delete:
 *     summary: Delete an image from an advertisement
 *     tags:
 *       - Advertisement Images
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement or image not found
 */
export const deleteImage = asyncHandler(async (req, res) => {
  await adsService.deleteImage(req.params.id, req.params.imageId, req.user.id)
  sendSuccess(res, 'Image deleted successfully', null)
})

/**
 * @swagger
 * /api/ads/{id}/images/{imageId}/primary:
 *   patch:
 *     summary: Set an image as the primary image
 *     tags:
 *       - Advertisement Images
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Primary image updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Advertisement or image not found
 */
export const setPrimaryImage = asyncHandler(async (req, res) => {
  const image = await adsService.setPrimaryImage(req.params.id, req.params.imageId, req.user.id)
  sendSuccess(res, 'Primary image updated successfully', image)
})

/**
 * POST /api/ads/:id/images/upload
 * Upload image files (multipart/form-data) and store them in Supabase Storage.
 * Files must be uploaded with field name "images".
 * Returns the created image records including public URLs.
 */
export const uploadImages = asyncHandler(async (req, res) => {
  const images = await adsService.uploadImages(req.params.id, req.user.id, req.files || [])
  sendSuccess(res, 'Images uploaded successfully', images, 201)
})
