/**
 * config/index.js — Centralised environment configuration.
 *
 * All process.env reads live here. Import `config` everywhere else —
 * never read process.env directly in application code.
 *
 * The application will fail fast at startup if required production
 * variables are missing.
 */
import 'dotenv/config'

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read a required environment variable.
 * In production, throws if the variable is absent or empty.
 * In development/test, falls back to `defaultValue` with a warning.
 *
 * @param {string}  key
 * @param {string}  [defaultValue]
 * @param {boolean} [requiredInProd=false]
 */
function env(key, defaultValue, requiredInProd = false) {
  const value = process.env[key]

  if (!value || value.trim() === '') {
    const isProd = (process.env.NODE_ENV || 'development') === 'production'

    if (isProd && requiredInProd) {
      // Fail fast — do not allow a missing secret to silently use a default
      throw new Error(
        `[config] Required environment variable "${key}" is not set. ` +
          'The application cannot start without it.',
      )
    }

    if (defaultValue === undefined) {
      throw new Error(
        `[config] Environment variable "${key}" is not set and has no default.`,
      )
    }

    return defaultValue
  }

  return value.trim()
}

// ── Build config object ──────────────────────────────────────────────────────

const NODE_ENV = process.env.NODE_ENV || 'development'

// Database: prefer DATABASE_URL; fall back to individual fields
const DATABASE_URL = process.env.DATABASE_URL

const dbConfig = DATABASE_URL
  ? { url: DATABASE_URL }
  : {
      host: env('DB_HOST', 'localhost'),
      port: parseInt(env('DB_PORT', '5432'), 10),
      name: env('DB_NAME', 'local_discovery'),
      user: env('DB_USER', 'postgres'),
      password: env('DB_PASSWORD', ''),
    }

export const config = {
  /** 'development' | 'production' | 'test' */
  env: NODE_ENV,

  /** Convenience booleans */
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',

  /** HTTP port */
  port: parseInt(env('PORT', '3000'), 10),

  /** PostgreSQL connection */
  db: dbConfig,

  /**
   * JWT settings — secret is required in production.
   * We read it here but it will be properly used only when auth is implemented.
   */
  jwt: {
    secret: env('JWT_SECRET', 'change-me-in-development', true),
    expiresIn: env('JWT_EXPIRES_IN', '7d'),
  },

  /** CORS — comma-separated list of allowed origins */
  cors: {
    allowedOrigins: env('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000, http://localhost:3001')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
}
