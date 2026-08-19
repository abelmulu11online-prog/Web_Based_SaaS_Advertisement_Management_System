/**
 * subscriptions.routes.js — Subscription plan routes.
 * GET  /api/subscriptions/plans        — list available plans (public)
 * GET  /api/subscriptions/my           — current user's subscription (auth)
 * POST /api/subscriptions              — subscribe to a plan (auth)
 * PUT  /api/subscriptions/:id/cancel   — cancel subscription (owner)
 *
 * Implementation in Phase 6 (Subscriptions).
 */
import { Router } from 'express'

const router = Router()

export default router
