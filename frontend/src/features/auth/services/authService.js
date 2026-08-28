/**
 * authService.js — Auth API calls (register, login, logout).
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
