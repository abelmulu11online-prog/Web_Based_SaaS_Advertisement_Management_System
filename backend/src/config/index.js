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

  /** Email verification settings */
  emailVerification: {
    /** Token expiration time (e.g., '24h', '1h', '30m') */
    expiresIn: env('EMAIL_VERIFICATION_EXPIRES_IN', '24h'),
  },

  /** Password reset settings */
  passwordReset: {
    /** Token expiration time (e.g., '1h', '30m') - shorter than email verification for security */
    expiresIn: env('PASSWORD_RESET_EXPIRES_IN', '1h'),
  },

  /** Refresh token settings */
  refreshToken: {
    /** Token expiration time (e.g., '7d', '30d') - longer than access tokens for persistent sessions */
    expiresIn: env('REFRESH_TOKEN_EXPIRES_IN', '7d'),
  },

  /** Frontend URL for verification and reset links */
  frontendUrl: env('FRONTEND_URL', 'http://localhost:5173'),

  /** SMTP configuration for email delivery */
  smtp: {
    host: env('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(env('SMTP_PORT', '587'), 10),
    secure: env('SMTP_SECURE', 'false') === 'true',
    user: env('SMTP_USER', ''),
    password: env('SMTP_PASSWORD', ''),
    from: env('EMAIL_FROM', 'noreply@localdiscovery.com'),
  },

  /**
   * Chapa — Ethiopian payment gateway (Phase 6).
   *
   * secretKey:     Your Chapa API key. Starts with CHASECK_test_ in sandbox,
   *                CHASECK_live_ in production. Used in every API call to Chapa.
   *
   * webhookSecret: A string YOU choose and register in the Chapa dashboard.
   *                Chapa signs every webhook with it. We verify the signature
   *                before processing any payment event.
   *
   * Both keys are required in production. In development they default to empty
   * strings so the server starts without crashing — but payment flows will fail
   * until real credentials are provided.
   */
  chapa: {
    secretKey:     env('CHAPA_SECRET_KEY',     '', true),
    webhookSecret: env('CHAPA_WEBHOOK_SECRET', '', true),
  },
}
