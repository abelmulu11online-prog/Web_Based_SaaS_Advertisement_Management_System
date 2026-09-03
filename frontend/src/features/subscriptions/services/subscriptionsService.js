/**
 * subscriptionsService.js — All API calls for the subscriptions module.
 * Uses the shared apiClient (Axios) which auto-attaches the Bearer token.
 */
import apiClient from '../../../services/apiClient.js'

/** GET /api/subscriptions/plans — public, no auth needed */
export async function getPlans() {
  const res = await apiClient.get('/subscriptions/plans')
  return res.data.data
}

/** GET /api/subscriptions/my — requires auth */
export async function getMySubscription() {
  const res = await apiClient.get('/subscriptions/my')
  return res.data.data
}

/**
 * POST /api/subscriptions/checkout — requires auth
 * @param {{ plan_id: string }} body
 * @returns {{ checkout_url: string, tx_ref: string }}
 */
export async function createCheckout(body) {
  const res = await apiClient.post('/subscriptions/checkout', body)
  return res.data.data
}

/**
 * GET /api/subscriptions/payment-status/:tx_ref — requires auth
 * @param {string} txRef
 * @returns {{ status: 'pending'|'success'|'failed', subscription?: object }}
 */
export async function getPaymentStatus(txRef) {
  const res = await apiClient.get(`/subscriptions/payment-status/${txRef}`)
  return res.data.data
}

/**
 * GET /api/subscriptions/history — requires auth
 * @param {{ page?: number, page_size?: number }} params
 */
export async function getPaymentHistory(params = {}) {
  const res = await apiClient.get('/subscriptions/history', { params })
  return res.data.data
}

/**
 * POST /api/subscriptions/cancel-checkout — requires auth
 * Marks a PENDING payment as FAILED when the user abandons Chapa checkout.
 * @param {string} txRef
 */
export async function cancelCheckout(txRef) {
  const res = await apiClient.post('/subscriptions/cancel-checkout', { tx_ref: txRef })
  return res.data.data
}
