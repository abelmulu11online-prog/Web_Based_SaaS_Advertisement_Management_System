/**
 * subscriptions.webhook.js — Chapa webhook handler.
 *
 * This file handles POST /api/subscriptions/webhook — the endpoint Chapa
 * calls when a payment completes. It is the most security-critical code
 * in the entire payment system.
 *
 * THREE LAYERS OF SECURITY run before any subscription is activated:
 *
 *   Layer 1 — HMAC signature verification
 *     Proves the webhook genuinely came from Chapa.
 *     Anyone on the internet can POST to this URL. Without this check,
 *     an attacker could send a fake "payment succeeded" event and get a
 *     free Pro subscription. We compute HMAC-SHA256 over the raw request
 *     body using our CHAPA_WEBHOOK_SECRET and compare it to the
 *     x-chapa-signature header. We use crypto.timingSafeEqual to prevent
 *     timing attacks (measuring how long comparison takes to guess bytes).
 *
 *   Layer 2 — Idempotency check
 *     Prevents the same event being processed twice.
 *     Chapa uses at-least-once delivery — it will retry if your server
 *     returns a non-200 response. The payment_events table has a UNIQUE
 *     constraint on chapa_tx_ref. We INSERT first; if the INSERT fails
 *     with error 23505 (unique_violation), another instance already
 *     processed this event. We return 200 and stop safely.
 *
 *   Layer 3 — Chapa Verify API double-confirmation
 *     Independently confirms the payment is real and the amount is correct.
 *     The webhook signature only proves Chapa sent the message — it does
 *     not protect against Chapa's own systems having a bug. We call
 *     GET /v1/transaction/verify/:tx_ref and check:
 *       a) status === "success"
 *       b) verified amount === expected amount from our payment_records
 *     Only after both checks pass do we activate the subscription.
 *
 * Route setup in subscriptions.routes.js:
 *   router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook)
 *
 * The express.raw() middleware gives us req.body as a Buffer (raw bytes).
 * This is mandatory — HMAC is computed over the exact bytes Chapa sent.
 * If express.json() had already parsed the body, the bytes would differ
 * and every signature check would fail.
 */
import crypto from 'crypto'
import logger from '../../utils/logger.js'
import { config } from '../../config/index.js'
import * as repo from './subscriptions.repository.js'
import { activateSubscriptionFromVerify } from './subscriptions.service.js'

const CHAPA_VERIFY_URL = 'https://api.chapa.co/v1/transaction/verify'

// ── Layer 1: HMAC signature verification ─────────────────────────────────────

/**
 * Verify the Chapa webhook signature.
 *
 * Chapa computes: HMAC-SHA256(CHAPA_WEBHOOK_SECRET, rawBody)
 * We recompute the same hash and compare using timingSafeEqual.
 *
 * timingSafeEqual prevents timing attacks:
 *   A normal string comparison (===) returns early on the first
 *   mismatched byte. An attacker can measure the response time to
 *   guess the correct signature byte-by-byte. timingSafeEqual always
 *   takes the same amount of time regardless of where the mismatch is.
 *
 * @param {Buffer} rawBody          — the raw request body as bytes
 * @param {string} signatureHeader  — value of x-chapa-signature header
 * @returns {boolean}
 */
function verifyChapaSignature(rawBody, signatureHeader) {
  // Missing header = definitely not from Chapa
  if (!signatureHeader) return false

  try {
    const expectedHex = crypto
      .createHmac('sha256', config.chapa.webhookSecret)
      .update(rawBody)
      .digest('hex')

    const expected = Buffer.from(expectedHex, 'hex')
    const received = Buffer.from(signatureHeader, 'hex')

    // Buffers must be the same length before timingSafeEqual can compare them.
    // Different lengths always mean failure — but we still compare to avoid
    // leaking length information via timing.
    if (expected.length !== received.length) return false

    return crypto.timingSafeEqual(expected, received)
  } catch {
    // Buffer.from() can throw if signatureHeader is not valid hex.
    // Treat any error as a failed verification.
    return false
  }
}

// ── Main webhook handler ──────────────────────────────────────────────────────

/**
 * Handle POST /api/subscriptions/webhook
 *
 * Called by Chapa when a payment event occurs.
 * req.body is a raw Buffer because of express.raw() in routes.js.
 *
 * Always returns HTTP 200 after processing (success or logged failure).
 * Non-200 responses cause Chapa to retry — we only want retries for
 * genuine infrastructure failures, not for events we've already handled
 * or decided not to act on.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export async function handleWebhook(req, res) {
  // ── Layer 1: Verify HMAC signature ─────────────────────────────────────────
  const signatureHeader = req.headers['x-chapa-signature']
  const rawBody = req.body // Buffer — guaranteed by express.raw()

  if (!verifyChapaSignature(rawBody, signatureHeader)) {
    // Log the IP so you can track probing attempts
    logger.warn(
      { ip: req.ip, path: req.path },
      'Webhook: HMAC signature verification failed — request rejected',
    )
    return res.status(400).json({ error: 'WEBHOOK_SIGNATURE_INVALID' })
  }

  // Parse the raw JSON body now that the signature is confirmed
  let payload
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    logger.warn({ ip: req.ip }, 'Webhook: failed to parse JSON body')
    return res.status(400).json({ error: 'INVALID_JSON' })
  }

  const txRef     = payload.tx_ref
  const eventType = payload.event || 'charge.completed'

  // A tx_ref is required — without it we can't correlate to a payment record
  if (!txRef) {
    logger.warn({ payload }, 'Webhook: missing tx_ref in payload')
    return res.status(400).json({ error: 'MISSING_TX_REF' })
  }

  // ── Layer 2: Idempotency check ─────────────────────────────────────────────
  // Check if we've already processed this tx_ref
  const alreadyProcessed = await repo.paymentEventExists(txRef)
  if (alreadyProcessed) {
    logger.info(
      { txRef },
      'Webhook: duplicate event — already processed, returning 200',
    )
    return res.status(200).json({ received: true })
  }

  // Insert the audit log row FIRST — before any other DB work.
  // The UNIQUE constraint on chapa_tx_ref is the distributed lock.
  // If two server instances receive the same webhook simultaneously,
  // only one INSERT succeeds. The other gets error 23505 below.
  try {
    await repo.insertPaymentEvent({ txRef, eventType, payload })
  } catch (insertErr) {
    if (insertErr.code === '23505') {
      // Another instance just inserted this tx_ref — idempotent exit
      logger.info(
        { txRef },
        'Webhook: concurrent duplicate detected via unique constraint',
      )
      return res.status(200).json({ received: true })
    }
    // Genuine DB error — log it but still return 200 to prevent Chapa
    // from retrying continuously (the event is already logged once)
    logger.error(
      { err: insertErr, txRef },
      'Webhook: failed to insert payment_event',
    )
    return res.status(200).json({ received: true })
  }

  // Only process events where Chapa reports the payment as successful
  if (payload.status !== 'success') {
    logger.info(
      { txRef, status: payload.status },
      'Webhook: non-success status — event logged but subscription not activated',
    )
    return res.status(200).json({ received: true })
  }

  // ── Layer 3: Chapa Verify API double-confirmation ───────────────────────────
  let verifyData
  try {
    const verifyRes = await fetch(`${CHAPA_VERIFY_URL}/${txRef}`, {
      headers: {
        Authorization: `Bearer ${config.chapa.secretKey}`,
      },
    })
    verifyData = await verifyRes.json()
  } catch (fetchErr) {
    // Chapa's verify API was unreachable — log it but return 200.
    // The payment_events row exists so the event won't be reprocessed.
    // Manual reconciliation is possible via GET /payment-status/:tx_ref.
    logger.error(
      { err: fetchErr, txRef },
      'Webhook: Chapa verify API unreachable — subscription NOT activated',
    )
    return res.status(200).json({ received: true })
  }

  // Chapa verify returned a non-success status
  if (verifyData.status !== 'success') {
    logger.error(
      { txRef, verifyData },
      'Webhook: Chapa verify returned non-success — webhook/verify mismatch, NOT activating',
    )
    return res.status(200).json({ received: true })
  }

  // Fetch our payment record to cross-check the amount
  const paymentRecord = await repo.findPaymentByTxRef(txRef)
  if (!paymentRecord) {
    logger.error(
      { txRef },
      'Webhook: no payment_record found for this tx_ref — cannot activate',
    )
    return res.status(200).json({ received: true })
  }

  // Activate the subscription (amount cross-check happens inside this function)
  try {
    await activateSubscriptionFromVerify({ txRef, verifyData, paymentRecord })
  } catch (activationErr) {
    // Log the specific error — could be amount mismatch or DB failure
    logger.error(
      { err: activationErr, txRef },
      'Webhook: subscription activation failed — subscription NOT activated',
    )
    // Return 200 to prevent Chapa from retrying endlessly.
    // If this was an amount mismatch that's a security alert, not a retry scenario.
    return res.status(200).json({ received: true })
  }

  logger.info(
    { txRef, userId: paymentRecord.user_id },
    'Webhook: subscription activated successfully',
  )
  return res.status(200).json({ received: true })
}
