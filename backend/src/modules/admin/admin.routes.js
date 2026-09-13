/**
 * admin.routes.js — Admin panel routes (role: ADMIN only).
 *
 * All routes require authenticate + requireRole('ADMIN').
 *
 * GET    /api/admin/stats                       — platform-wide statistics
 * GET    /api/admin/analytics                   — time-series analytics data
 *
 * GET    /api/admin/users                       — paginated user list
 * GET    /api/admin/users/:userId               — single user detail
 * GET    /api/admin/users/:userId/ads           — user's advertisements
 * PATCH  /api/admin/users/:userId/suspend       — suspend user
 * PATCH  /api/admin/users/:userId/activate      — activate/unsuspend user
 * PATCH  /api/admin/users/:userId/promote       — set role = ADMIN
 * PATCH  /api/admin/users/:userId/demote        — set role = USER
 *
 * GET    /api/admin/ads                         — paginated ads (all statuses)
 * GET    /api/admin/ads/:adId                   — single ad detail
 * PATCH  /api/admin/ads/:adId/status            — force-set ad status
 * DELETE /api/admin/ads/:adId                   — hard-delete any ad
 *
 * GET    /api/admin/categories                  — all categories (incl. inactive)
 * POST   /api/admin/categories                  — create category
 * PATCH  /api/admin/categories/:catId           — update category
 * PATCH  /api/admin/categories/:catId/toggle    — toggle is_active
 *
 * GET    /api/admin/subscriptions               — paginated subscriptions
 * GET    /api/admin/payments                    — paginated payment records
 * GET    /api/admin/revenue                     — revenue summary
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
    category_id: z.string().uuid().optional(),
  }).optional(),
})

const createCategorySchema = z.object({
  body: z.object({
    name:        z.string().min(1).max(100),
    slug:        z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, numbers, and hyphens'),
    description: z.string().max(500).optional(),
    icon:        z.string().max(50).optional(),
    parent_id:   z.string().uuid().optional().nullable(),
  }),
})

const updateCategorySchema = z.object({
  params: z.object({ catId: z.string().uuid() }),
  body: z.object({
    name:        z.string().min(1).max(100).optional(),
    slug:        z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(500).optional().nullable(),
    icon:        z.string().max(50).optional().nullable(),
    parent_id:   z.string().uuid().optional().nullable(),
  }),
})

// ── Stats & Analytics ─────────────────────────────────────────────────────────
router.get('/stats',                                ...guard,                                     ctrl.getStats)
router.get('/analytics',                            ...guard,                                     ctrl.getAnalytics)
router.get('/revenue',                              ...guard,                                     ctrl.getRevenue)

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users',                                ...guard, validate(listQuerySchema),           ctrl.listUsers)
router.get('/users/:userId',                        ...guard, validate(uuidParam('userId')),       ctrl.getUserDetail)
router.get('/users/:userId/ads',                    ...guard, validate(uuidParam('userId')),       ctrl.getUserAds)
router.patch('/users/:userId/suspend',              ...guard, validate(uuidParam('userId')),       ctrl.suspendUser)
router.patch('/users/:userId/activate',             ...guard, validate(uuidParam('userId')),       ctrl.activateUser)
router.patch('/users/:userId/promote',              ...guard, validate(uuidParam('userId')),       ctrl.promoteToAdmin)
router.patch('/users/:userId/demote',               ...guard, validate(uuidParam('userId')),       ctrl.demoteToUser)
router.delete('/users/:userId',                     ...guard, validate(uuidParam('userId')),       ctrl.deleteUser)

// ── Advertisements ────────────────────────────────────────────────────────────
router.get('/ads',                                  ...guard, validate(listQuerySchema),           ctrl.listAds)
router.get('/ads/:adId',                            ...guard, validate(uuidParam('adId')),         ctrl.getAdDetail)
router.patch('/ads/:adId/status',                   ...guard, validate(setStatusSchema),           ctrl.setAdStatus)
router.delete('/ads/:adId',                         ...guard, validate(uuidParam('adId')),         ctrl.deleteAd)

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories',                           ...guard,                                      ctrl.listCategories)
router.post('/categories',                          ...guard, validate(createCategorySchema),      ctrl.createCategory)
router.patch('/categories/:catId',                  ...guard, validate(updateCategorySchema),      ctrl.updateCategory)
router.patch('/categories/:catId/toggle',           ...guard, validate(uuidParam('catId')),        ctrl.toggleCategory)

// ── Subscriptions & Payments ──────────────────────────────────────────────────
router.get('/subscriptions',                        ...guard, validate(listQuerySchema),           ctrl.listSubscriptions)
router.get('/payments',                             ...guard, validate(listQuerySchema),           ctrl.listPayments)

// ── Subscription Plans ────────────────────────────────────────────────────────
const upsertPlanSchema = z.object({
  body: z.object({
    display_name:         z.string().min(1).max(100).optional(),
    price_etb:            z.coerce.number().min(0).optional(),
    max_profile_services: z.coerce.number().int().min(0).optional(),
    max_portfolio_items:  z.coerce.number().int().min(0).optional(),
    max_posts:            z.coerce.number().int().min(0).optional(),
    max_gallery_images:   z.coerce.number().int().min(0).optional(),
    max_social_links:     z.coerce.number().int().min(0).optional(),
    is_featured:          z.boolean().optional(),
    is_active:            z.boolean().optional(),
  }),
})

router.get('/plans',           ...guard,                                  ctrl.listPlans)
router.patch('/plans/:planId', ...guard, validate(z.object({
  params: z.object({ planId: z.string().uuid() }),
  body: upsertPlanSchema.shape.body,
})), ctrl.updatePlan)

export default router
