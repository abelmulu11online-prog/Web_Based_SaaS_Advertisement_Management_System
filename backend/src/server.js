/**
 * server.js — HTTP server entry point.
 *
 * Responsibilities:
 *  - Start the Express application
 *  - Log startup status (including database connection)
 *  - Handle graceful shutdown on SIGINT / SIGTERM
 *
 * Business logic and middleware configuration live in app.js, NOT here.
 */
import app from './app.js'
import { config } from './config/index.js'
import { checkHealth, disconnect } from './db/index.js'
import logger from './utils/logger.js'
import { startExpiryJob } from './modules/subscriptions/subscriptions.cron.js'
import { verifySmtpConnection, resetTransporter } from './services/email.service.js'

// ── Start server ──────────────────────────────────────────────────────────────

const server = app.listen(config.port, async () => {
  logger.info(
    { port: config.port, env: config.env },
    `Server listening on http://localhost:${config.port}`,
  )

  // Verify database connectivity at startup (non-fatal — DB may start later)
  const dbOk = await checkHealth()
  if (dbOk) {
    logger.info('PostgreSQL connection verified')
  } else {
    logger.warn(
      'PostgreSQL is not reachable at startup — the server is running but ' +
        'database-dependent endpoints will fail until the connection is established.',
    )
  }

  // Verify SMTP configuration at startup so delivery issues are visible immediately.
  // Reset cached transporter first in case port/config changed since last boot.
  resetTransporter()
  if (config.smtp.user && config.smtp.password) {
    verifySmtpConnection().then(smtpOk => {
      if (smtpOk) {
        logger.info(
          { smtpHost: config.smtp.host, smtpPort: config.smtp.port, from: config.smtp.from },
          'SMTP connection verified — email delivery ready',
        )
      } else {
        logger.warn(
          {
            smtpHost: config.smtp.host,
            smtpPort: config.smtp.port,
            smtpUser: config.smtp.user ? config.smtp.user.slice(0, 8) + '***' : 'not-set',
            from:     config.smtp.from,
          },
          'SMTP connection check failed — email delivery will not work. ' +
          'Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and that the ' +
          'EMAIL_FROM sender is verified in your email provider (Brevo).',
        )
      }
    }).catch(() => {})
  } else {
    logger.warn(
      'SMTP_USER or SMTP_PASSWORD not set — email delivery is disabled. ' +
      'Set these in .env to enable verification and password reset emails.',
    )
  }

  // Start the daily subscription expiry job (Phase 6)
  startExpiryJob()
})

server.on('error', (err) => {
  logger.error({ err }, 'HTTP server error')
  process.exit(1)
})

// ── Graceful shutdown ─────────────────────────────────────────────────────────

/**
 * Gracefully stop the server and release all resources.
 *
 * Order:
 *  1. Stop accepting new HTTP connections
 *  2. Wait for in-flight requests to complete (Express closes the server)
 *  3. Close the database connection pool
 *  4. Exit the process
 *
 * @param {string} signal  The OS signal that triggered the shutdown
 */
async function shutdown(signal) {
  logger.info({ signal }, 'Graceful shutdown initiated')

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error while closing HTTP server')
      process.exit(1)
    }

    logger.info('HTTP server closed')

    try {
      await disconnect()
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Error while closing PostgreSQL pool')
    }

    logger.info('Shutdown complete')
    process.exit(0)
  })

  // Safety timeout — force-exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Catch unhandled promise rejections and uncaught exceptions so they
// are logged before the process exits
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection')
  // Let the process exit naturally — a process manager will restart it
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — shutting down')
  process.exit(1)
})
