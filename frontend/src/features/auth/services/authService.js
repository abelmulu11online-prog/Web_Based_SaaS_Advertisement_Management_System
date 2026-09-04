/**
 * authService.js — Auth API calls.
 */
import apiClient from '../../../services/apiClient.js'

export async function register({ email, password }) {
  const res = await apiClient.post('/auth/register', { email, password })
  return res.data.data
}

export async function login({ identifier, password }) {
  const res = await apiClient.post('/auth/login', { identifier, password })
  return res.data.data
}

export async function logout(refreshToken) {
  const res = await apiClient.post('/auth/logout', { refreshToken })
  return res.data
}

/**
 * Verify an email address using the token from the verification link.
 * @param {string} token - Raw token from ?token= query param
 */
export async function verifyEmail(token) {
  const res = await apiClient.get('/auth/verify-email', { params: { token } })
  return res.data.data
}

/**
 * Request a new verification email to be sent.
 * @param {string} email
 */
export async function resendVerification(email) {
  const res = await apiClient.post('/auth/resend-verification', { email })
  return res.data
}

/**
 * Request a password reset email.
 * @param {string} email
 */
export async function forgotPassword(email) {
  const res = await apiClient.post('/auth/forgot-password', { email })
  return res.data
}

/**
 * Reset password using the token from the reset link.
 * @param {string} token - Raw token from ?token= query param
 * @param {string} password - New password
 */
export async function resetPassword(token, password) {
  const res = await apiClient.post('/auth/reset-password', { token, password })
  return res.data.data
}
