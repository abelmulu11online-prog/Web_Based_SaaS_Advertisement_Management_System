/**
 * health.service.js — Business logic for the health-check endpoint.
 */
import { checkHealth } from '../../db/index.js'

/**
 * Gather the current health status of the application.
 *
 * @returns {Promise<{ status: string, database: string }>}
 */
export async function getHealthStatus() {
  const dbConnected = await checkHealth()

  return {
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
  }
}
