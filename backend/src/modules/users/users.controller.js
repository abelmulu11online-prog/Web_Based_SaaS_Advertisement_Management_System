/**
 * users.controller.js — HTTP layer for profile & business details endpoints.
 *
 * All endpoints derive user identity from req.user.id (set by authenticate
 * middleware). Never trusts a user ID from the request body.
 *
 * Flow: authenticate → validate → controller → service → repository → PostgreSQL
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as profileService from './users.service.js'

// ── GET /api/profile ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     description: Retrieves the caller's profile, including business hours and social links.
 *     tags:
 *       - Profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         user_id:
 *                           type: string
 *                           format: uuid
 *                         display_name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         category_id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         location_id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         contact_phone:
 *                           type: string
 *                           nullable: true
 *                         contact_email:
 *                           type: string
 *                           format: email
 *                           nullable: true
 *                         website_url:
 *                           type: string
 *                           nullable: true
 *                         is_published:
 *                           type: boolean
 *                         is_verified:
 *                           type: boolean
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *                         business_hours:
 *                           type: array
 *                           items:
 *                             type: object
 *                         social_links:
 *                           type: array
 *                           items:
 *                             type: object
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.user.id)
  sendSuccess(res, 'Profile retrieved successfully', profile)
})

// ── POST /api/profile ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/profile:
 *   post:
 *     summary: Create a profile for the authenticated user
 *     description: Creates a new provider/business profile. One profile per user account.
 *     tags:
 *       - Profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - display_name
 *               - slug
 *             properties:
 *               display_name:
 *                 type: string
 *                 example: "Sunrise Coffee Shop"
 *               slug:
 *                 type: string
 *                 example: "sunrise-coffee"
 *               description:
 *                 type: string
 *                 example: "Local coffee roaster and cafe"
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               location_id:
 *                 type: string
 *                 format: uuid
 *               contact_phone:
 *                 type: string
 *                 example: "+1234567890"
 *               contact_email:
 *                 type: string
 *                 format: email
 *               website_url:
 *                 type: string
 *                 example: "https://sunrisecoffee.example.com"
 *               is_published:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Profile already exists or slug is taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
export const createProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.createProfile(req.user.id, req.body)
  sendSuccess(res, 'Profile created successfully', profile, 201)
})

// ── PATCH /api/profile ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/profile:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     description: Updates profile fields. All fields are optional (PATCH semantics).
 *     tags:
 *       - Profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               location_id:
 *                 type: string
 *                 format: uuid
 *               contact_phone:
 *                 type: string
 *               contact_email:
 *                 type: string
 *                 format: email
 *               website_url:
 *                 type: string
 *               is_published:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Slug is already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.updateProfile(req.user.id, req.body)
  sendSuccess(res, 'Profile updated successfully', profile)
})

// ── GET /api/profile/business ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/profile/business:
 *   get:
 *     summary: Get the authenticated user's business details
 *     description: Retrieves business hours and social links for the caller's profile.
 *     tags:
 *       - Business Details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Business details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         business_hours:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               profile_id:
 *                                 type: string
 *                                 format: uuid
 *                               day_of_week:
 *                                 type: integer
 *                                 minimum: 0
 *                                 maximum: 6
 *                               opens_at:
 *                                 type: string
 *                                 nullable: true
 *                               closes_at:
 *                                 type: string
 *                                 nullable: true
 *                               is_closed:
 *                                 type: boolean
 *                         social_links:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               profile_id:
 *                                 type: string
 *                                 format: uuid
 *                               platform:
 *                                 type: string
 *                                 enum: [FACEBOOK, INSTAGRAM, TELEGRAM, WHATSAPP, TIKTOK, LINKEDIN, YOUTUBE, TWITTER, SNAPCHAT, OTHER]
 *                               url:
 *                                 type: string
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getBusinessDetails = asyncHandler(async (req, res) => {
  const details = await profileService.getBusinessDetails(req.user.id)
  sendSuccess(res, 'Business details retrieved successfully', details)
})

// ── POST /api/profile/business ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/profile/business:
 *   post:
 *     summary: Upsert business details
 *     description: |
 *       Replaces all existing business hours and/or social links for the caller's profile.
 *       Uses a transaction — if any entry fails, no changes are applied.
 *     tags:
 *       - Business Details
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               business_hours:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - day_of_week
 *                   properties:
 *                     day_of_week:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                     opens_at:
 *                       type: string
 *                       description: "HH:MM format"
 *                     closes_at:
 *                       type: string
 *                       description: "HH:MM format"
 *                     is_closed:
 *                       type: boolean
 *               social_links:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - platform
 *                     - url
 *                   properties:
 *                     platform:
 *                       type: string
 *                       enum: [FACEBOOK, INSTAGRAM, TELEGRAM, WHATSAPP, TIKTOK, LINKEDIN, YOUTUBE, TWITTER, SNAPCHAT, OTHER]
 *                     url:
 *                       type: string
 *     responses:
 *       200:
 *         description: Business details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
export const upsertBusinessDetails = asyncHandler(async (req, res) => {
  const details = await profileService.upsertBusinessDetails(req.user.id, req.body)
  sendSuccess(res, 'Business details updated successfully', details)
})

// ── Verification workflow ─────────────────────────────────────────────────────

export const uploadVerificationDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(422).json({
      success: false,
      message: 'No document file provided',
      error: { code: 'NO_FILE' },
    })
  }
  const doc = await profileService.uploadVerificationDocument(req.user.id, req.file)
  sendSuccess(res, 'Verification document uploaded', doc, 201)
})

export const getMyVerificationDocument = asyncHandler(async (req, res) => {
  const doc = await profileService.getMyVerificationDocument(req.user.id)
  sendSuccess(res, 'Verification document retrieved', doc)
})

export const submitForReview = asyncHandler(async (req, res) => {
  const profile = await profileService.submitForReview(req.user.id)
  sendSuccess(res, 'Profile submitted for review', profile)
})

export const resubmitForReview = asyncHandler(async (req, res) => {
  const profile = await profileService.resubmitForReview(req.user.id)
  sendSuccess(res, 'Profile resubmitted for review', profile)
})

export const publishProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.publishProfile(req.user.id)
  sendSuccess(res, 'Profile published', profile)
})

export const unpublishProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.unpublishProfile(req.user.id)
  sendSuccess(res, 'Profile unpublished', profile)
})
