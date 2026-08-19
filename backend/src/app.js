/**
 * app.js — Express application factory.
 * Registers global middleware and mounts module routers.
 *
 * Implementation will be added in Phase 2 (Backend API Foundation).
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

const app = express()

// ── Global middleware ─────────────────────────────────────────────
app.use(helmet())
app.use(cors())
app.use(express.json())

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// ── Module routers (mounted in Phase 2) ───────────────────────────
// import authRouter from './modules/auth/auth.routes.js'
// import usersRouter from './modules/users/users.routes.js'
// import adsRouter from './modules/advertisements/advertisements.routes.js'
// import subscriptionsRouter from './modules/subscriptions/subscriptions.routes.js'
// import locationsRouter from './modules/locations/locations.routes.js'
// import analyticsRouter from './modules/analytics/analytics.routes.js'
// import adminRouter from './modules/admin/admin.routes.js'
//
// app.use('/api/auth', authRouter)
// app.use('/api/users', usersRouter)
// app.use('/api/ads', adsRouter)
// app.use('/api/subscriptions', subscriptionsRouter)
// app.use('/api/locations', locationsRouter)
// app.use('/api/analytics', analyticsRouter)
// app.use('/api/admin', adminRouter)

export default app
