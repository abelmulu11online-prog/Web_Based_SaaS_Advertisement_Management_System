/**
 * users.routes.js — Profile & business details routes.
 *
 * All routes are protected by the authenticate middleware.
 * User identity is derived from req.user.id — never from the request body.
 *
 * GET   /api/profile           — Get own profile
 * POST  /api/profile           — Create profile
 * PATCH /api/profile           — Update profile
 * GET   /api/profile/business  — Get business details
 * POST  /api/profile/business  — Upsert business details
 */
import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { uploadDocumentMiddleware } from '../../middleware/uploadDocument.js'
import {
  createProfileSchema,
  updateProfileSchema,
  businessDetailsSchema,
} from './users.schemas.js'
import * as profileController from './users.controller.js'

const router = Router()

// All profile routes require authentication
router.use(authenticate)

/**
 * GET /api/profile
 * Retrieve the authenticated user's profile.
 */
router.get('/', profileController.getProfile)

/**
 * POST /api/profile
 * Create a new profile for the authenticated user.
 */
router.post('/', validate(createProfileSchema), profileController.createProfile)

/**
 * PATCH /api/profile
 * Update the authenticated user's profile.
 */
router.patch('/', validate(updateProfileSchema), profileController.updateProfile)

/**
 * GET /api/profile/business
 * Retrieve business details (hours + social links).
 */
router.get('/business', profileController.getBusinessDetails)

/**
 * POST /api/profile/business
 * Upsert (replace) business details in a transaction.
 */
router.post('/business', validate(businessDetailsSchema), profileController.upsertBusinessDetails)

// ── Verification workflow ─────────────────────────────────────────────────────

/**
 * POST /api/profile/verification-document/upload
 * Upload a verification document (JPG/PNG/PDF, max 10 MB).
 */
router.post(
  '/verification-document/upload',
  uploadDocumentMiddleware,
  profileController.uploadVerificationDocument,
)

/**
 * GET /api/profile/verification-document
 * Get the current user's verification document metadata.
 */
router.get('/verification-document', profileController.getMyVerificationDocument)

/**
 * POST /api/profile/submit-review
 * Submit the profile for admin verification review.
 */
router.post('/submit-review', profileController.submitForReview)

/**
 * POST /api/profile/resubmit
 * Resubmit a rejected profile for admin review.
 */
router.post('/resubmit', profileController.resubmitForReview)

/**
 * POST /api/profile/publish
 * Publish the profile (make it publicly visible).
 */
router.post('/publish', profileController.publishProfile)

/**
 * POST /api/profile/unpublish
 * Unpublish the profile (take it private).
 */
router.post('/unpublish', profileController.unpublishProfile)

export default router
