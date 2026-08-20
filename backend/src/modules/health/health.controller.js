/**
 * health.controller.js — HTTP layer for the health-check endpoint.
 */
import { getHealthStatus } from './health.service.js'
import { asyncHandler } from '../../utils/index.js'

/**
 * GET /api/health
 *
 * Returns 200 when the API and database are healthy.
 * Returns 503 when the database is unreachable.
 */
export const getHealth = asyncHandler(async (_req, res) => {
  const data = await getHealthStatus()

  const isHealthy = data.database === 'connected'
  const statusCode = isHealthy ? 200 : 503

  res.status(statusCode).json({
    success: isHealthy,
    message: isHealthy ? 'API is healthy' : 'API is degraded',
    data,
  })
})
