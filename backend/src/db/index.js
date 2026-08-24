/**
 * db/index.js — PostgreSQL connection pool (node-postgres).
 *
 * All database queries go through this pool.
 * Uses a single Pool instance for the lifetime of the process.
 *
 * Provides:
 *  - pool          : the pg Pool instance (for queries)
 *  - checkHealth() : resolves true when the DB is reachable
 *  - disconnect()  : gracefully ends the pool (used during shutdown)
 */
import pg from 'pg'
import { config } from '../config/index.js'
import logger from '../utils/logger.js'

const { Pool } = pg

// Build pool options — prefer DATABASE_URL when available
const poolOptions = config.db.url
  ? {
      connectionString: config.db.url,
      // Allow self-signed TLS certs in development when connecting via URL
      ssl:
        config.isProduction
          ? { rejectUnauthorized: true }
          : false,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    }

const pool = new Pool({
  ...poolOptions,
  // Connection pool sizing
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

// Log unexpected pool-level errors so they are never silently swallowed
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client')
})

/**
 * Verify the database connection is alive by running a trivial query.
 *
 * @returns {Promise<boolean>} true when connected, false otherwise
 */
export async function checkHealth() {
  const client = await pool.connect().catch(() => null)
  if (!client) return false
  try {
    await client.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    client.release()
  }
}

/**
 * Gracefully close all connections in the pool.
 * Call this during server shutdown.
 */
export async function disconnect() {
  await pool.end()
  logger.info('PostgreSQL pool closed')
}

export default pool
