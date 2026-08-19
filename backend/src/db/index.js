/**
 * db/index.js — PostgreSQL connection pool.
 * All database queries go through this pool.
 *
 * Full implementation (connection string, pool sizing, error handling)
 * will be added in Phase 3 (Database Schema).
 */
import pg from 'pg'
import { config } from '../config/index.js'

const { Pool } = pg

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
})

export default pool
