/**
 * health.routes.js — Public health-check route.
 *
 * GET /api/health — no authentication required
 */
import { Router } from 'express'
import { getHealth } from './health.controller.js'

const router = Router()

router.get('/', getHealth)

export default router
