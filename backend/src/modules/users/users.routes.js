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

export default router
