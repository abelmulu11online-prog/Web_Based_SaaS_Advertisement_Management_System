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
 *
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API and database health
 *     description: Returns the health status of the API and database connection
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy and database is connected
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: ok
 *                         database:
 *                           type: string
 *                           example: connected
 *       503:
 *         description: API is degraded due to database connection issues
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: degraded
 *                         database:
 *                           type: string
 *                           example: disconnected
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
