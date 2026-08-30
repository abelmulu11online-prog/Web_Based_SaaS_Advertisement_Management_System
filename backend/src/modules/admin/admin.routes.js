/**
 * admin.routes.js — Admin panel routes (role: ADMIN only).
 *
 * All routes require authenticate + requireRole('ADMIN').
 *
 * GET    /api/admin/stats                    — platform-wide statistics
 * GET    /api/admin/users                    — paginated user list
 * GET    /api/admin/users/:userId            — single user detail
 * PATCH  /api/admin/users/:userId/suspend    — suspend user
 * PATCH  /api/admin/users/:userId/activate   — activate/unsuspend user
 * PATCH  /api/admin/users/:userId/promote    — set role = ADMIN
 * PATCH  /api/admin/users/:userId/demote     — set role = USER
 * GET    /api/admin/ads                      — paginated ads (all statuses)
 * PATCH  /api/admin/ads/:adId/status         — force-set ad status
 * DELETE /api/admin/ads/:adId                — hard-delete any ad
 */
import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/requireRole.js'
import { validate } from '../../middleware/validate.js'
import * as ctrl from './admin.controller.js'

const router = Router()
const guard  = [authenticate, requireRole('ADMIN')]

const uuidParam = (name) => z.object({ params: z.object({ [name]: z.string().uuid() }) })

const setStatusSchema = z.object({
  params: z.object({ adId: z.string().uuid() }),
  body: z.object({
    status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED']),
  }),
})

const listQuerySchema = z.object({
  query: z.object({
    page:      z.coerce.number().int().positive().optional(),
    page_size: z.coerce.number().int().positive().max(100).optional(),
    search:    z.string().max(200).optional(),
    status:    z.string().max(50).optional(),
    role:      z.string().max(20).optional(),
  }).optional(),
})

router.get('/stats',                        ...guard,                                ctrl.getStats)
router.get('/users',                        ...guard, validate(listQuerySchema),      ctrl.listUsers)
router.get('/users/:userId',                ...guard, validate(uuidParam('userId')),  ctrl.getUserDetail)
router.patch('/users/:userId/suspend',      ...guard, validate(uuidParam('userId')),  ctrl.suspendUser)
router.patch('/users/:userId/activate',     ...guard, validate(uuidParam('userId')),  ctrl.activateUser)
router.patch('/users/:userId/promote',      ...guard, validate(uuidParam('userId')),  ctrl.promoteToAdmin)
router.patch('/users/:userId/demote',       ...guard, validate(uuidParam('userId')),  ctrl.demoteToUser)
router.get('/ads',                          ...guard, validate(listQuerySchema),       ctrl.listAds)
router.patch('/ads/:adId/status',           ...guard, validate(setStatusSchema),       ctrl.setAdStatus)
router.delete('/ads/:adId',                 ...guard, validate(uuidParam('adId')),     ctrl.deleteAd)

export default router
