/**
 * advertisements.routes.js — Ad listing routes.
 * GET    /api/ads          — list / search ads (public)
 * GET    /api/ads/:id      — single ad detail (public)
 * POST   /api/ads          — create ad (advertiser, auth required)
 * PUT    /api/ads/:id      — update ad (owner only)
 * DELETE /api/ads/:id      — delete ad (owner only)
 *
 * Implementation in Phase 5 (Advertisement Features).
 */
import { Router } from 'express'

const router = Router()

export default router
