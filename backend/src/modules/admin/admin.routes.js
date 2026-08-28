/**
 * admin.routes.js — Admin panel routes (role: admin only).
 * GET  /api/admin/users        — list all users
 * GET  /api/admin/ads          — list all ads with moderation status
 * PUT  /api/admin/ads/:id      — approve / reject an ad
 * GET  /api/admin/stats        — platform-wide statistics
 *
 * Implementation in Phase 8 (Admin Dashboard).
 */
import { Router } from 'express'

const router = Router()

export default router
