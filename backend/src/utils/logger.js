/**
 * utils/logger.js — Structured application logger (Pino).
 *
 * Usage:
 *   import logger from './utils/logger.js'
 *   logger.info('Server started')
 *   logger.error({ err }, 'Database connection failed')
 *
 * Never log passwords, JWT tokens, authorization headers, or
 * database credentials through this logger.
 */
import pino from 'pino'
import { config } from '../config/index.js'

const logger = pino({
  level: config.isProduction ? 'info' : 'debug',

  // Human-readable output in development; structured JSON in production
  transport: config.isDevelopment
    ? { target: 'pino/file', options: { destination: 1 } } // stdout, no pretty-print needed for dev simplicity
    : undefined,

  // Redact sensitive fields before they reach the log sink
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.passwordConfirm',
      'req.body.token',
    ],
    censor: '[REDACTED]',
  },

  // Consistent timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
})

export default logger
