/**
 * app.js — Express application factory.
 *
 * Responsibilities:
 *  - Configure global middleware (security, CORS, logging, body parsing)
 *  - Mount module routers
 *  - Register 404 handler
 *  - Register centralised error handler (must be last)
 *
 * This file only configures the app — it does NOT start the server.
 * See server.js for the HTTP lifecycle.
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

import { config } from './config/index.js'
import logger from './utils/logger.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

// ── Module routers ────────────────────────────────────────────────────────────
import healthRouter from './modules/health/health.routes.js'
import authRouter from './modules/auth/auth.routes.js'
import usersRouter from './modules/users/users.routes.js'
import adsRouter from './modules/advertisements/advertisements.routes.js'
import subscriptionsRouter from './modules/subscriptions/subscriptions.routes.js'
import locationsRouter from './modules/locations/locations.routes.js'
import analyticsRouter from './modules/analytics/analytics.routes.js'
import adminRouter from './modules/admin/admin.routes.js'
import notificationsRouter from './modules/notifications/notifications.routes.js'

// ── CORS configuration ───────────────────────────────────────────────────────

const allowedOrigins = config.cors.allowedOrigins

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    logger.warn({ origin }, 'CORS: blocked request from unlisted origin')
    return callback(new Error(`Origin ${origin} is not allowed by CORS policy`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// ── Application ───────────────────────────────────────────────────────────────

const app = express()

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet())
app.use(cors(corsOptions))

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    // Don't log the health endpoint on every poll — keeps logs clean
    autoLogging: {
      ignore: (req) => req.url === '/api/health',
    },
    // Redact sensitive headers from log output
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  }),
)

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/ads', adsRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/locations', locationsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// ── 404 handler (after all routes) ───────────────────────────────────────────
app.use(notFound)

// ── Centralised error handler (must be last) ─────────────────────────────────
app.use(errorHandler)

export default app
