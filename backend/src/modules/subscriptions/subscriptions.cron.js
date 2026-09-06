/**
 * subscriptions.cron.js — Daily subscription expiry sweep.
 *
 * Runs once daily at 00:05 (server local time).
 * Finds all ACTIVE subscriptions whose billing period has ended,
 * marks them EXPIRED, downgrades to FREE, and pauses all their
 * PUBLISHED advertisements atomically.
 *
 * Called once from server.js after the HTTP server starts listening.
 *
 * Usage:
 *   import { startExpiryJob } from './modules/subscriptions/subscriptions.cron.js'
 *   startExpiryJob()
 */
import cron from 'node-cron'
import logger from '../../utils/logger.js'
import * as repo from './subscriptions.repository.js'

// ── Core sweep function ───────────────────────────────────────────────────────

/**
 * Find and expire all ACTIVE subscriptions past their billing period end.
 *
 * For each expired subscription (in a single atomic transaction per sub):
 *   1. Sets status = EXPIRED
 *   2. Downgrades plan_id to the FREE plan UUID
 *   3. Sets all PUBLISHED advertisements → PAUSED
 *
 * Errors for individual subscriptions are caught and logged so one failure
 * does not prevent the rest of the sweep from completing.
 *
 * @returns {Promise<void>}
 */
export async function runExpiryJob() {
  logger.info('Expiry job: starting subscription expiry sweep')

  // Get the FREE plan UUID once — used for all downgrades in this sweep
  const freePlan = await repo.findFreePlan()
  if (!freePlan) {
    logger.error('Expiry job: FREE plan not found in database — aborting sweep')
    return
  }

  // Find all subscriptions that are ACTIVE but past their end date
  const expiredSubs = await repo.findExpiredActiveSubscriptions()

  logger.info({ count: expiredSubs.length }, 'Expiry job: found expired subscriptions')

  if (expiredSubs.length === 0) {
    logger.info('Expiry job: nothing to expire')
    return
  }

  for (const sub of expiredSubs) {
    try {
      const pausedAds = await repo.expireSubscription(sub.id, sub.user_id, freePlan.id)

      logger.info(
        {
          userId:         sub.user_id,
          subscriptionId: sub.id,
          pausedAds,
        },
        'Expiry job: subscription expired, ads paused',
      )
    } catch (err) {
      // Log and continue — one failure must not stop the entire sweep
      logger.error(
        {
          err,
          userId:         sub.user_id,
          subscriptionId: sub.id,
        },
        'Expiry job: failed to expire subscription — continuing with next',
      )
    }
  }

  logger.info('Expiry job: sweep complete')
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

/**
 * Schedule the expiry sweep to run daily at 00:05.
 *
 * 00:05 instead of 00:00 avoids contention with other midnight jobs
 * and any period-end timestamps that are exactly at midnight.
 *
 * Call this once from server.js after the server starts listening.
 */
export function startExpiryJob() {
  cron.schedule('5 0 * * *', () => {
    runExpiryJob().catch((err) =>
      logger.error({ err }, 'Expiry job: unhandled top-level error'),
    )
  })

  logger.info('Expiry job: scheduled — runs daily at 00:05 server time')
}
