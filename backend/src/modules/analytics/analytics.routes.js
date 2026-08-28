/**
 * analytics.routes.js — Analytics routes.
 * GET /api/analytics/ads/:id   — views/clicks for a specific ad (owner/admin)
 * GET /api/analytics/summary   — aggregate stats for the advertiser's account
 *
 * Implementation in Phase 9 (Analytics).
 */
import { Router } from 'express'

const router = Router()

export default router
