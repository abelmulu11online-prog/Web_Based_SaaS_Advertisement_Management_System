/**
 * admin.service.js — API calls for the admin panel.
 * All calls go through /api/admin/* (backed by requireRole('ADMIN')).
 */
import apiClient from './apiClient.js'

// ── Stats & Analytics ─────────────────────────────────────────────────────────

export async function getStats() {
  const r = await apiClient.get('/admin/stats')
  return r.data.data
}

export async function getAnalytics() {
  const r = await apiClient.get('/admin/analytics')
  return r.data.data
}

export async function getRevenue() {
  const r = await apiClient.get('/admin/revenue')
  return r.data.data
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUsers(params = {}) {
  const r = await apiClient.get('/admin/users', { params })
  return r.data.data
}

export async function getUserDetail(userId) {
  const r = await apiClient.get(`/admin/users/${userId}`)
  return r.data.data
}

export async function getUserAds(userId, params = {}) {
  const r = await apiClient.get(`/admin/users/${userId}/ads`, { params })
  return r.data.data
}

export async function suspendUser(userId) {
  const r = await apiClient.patch(`/admin/users/${userId}/suspend`)
  return r.data.data
}

export async function activateUser(userId) {
  const r = await apiClient.patch(`/admin/users/${userId}/activate`)
  return r.data.data
}

export async function promoteUser(userId) {
  const r = await apiClient.patch(`/admin/users/${userId}/promote`)
  return r.data.data
}

export async function demoteUser(userId) {
  const r = await apiClient.patch(`/admin/users/${userId}/demote`)
  return r.data.data
}

// ── Advertisements ────────────────────────────────────────────────────────────

export async function getAds(params = {}) {
  const r = await apiClient.get('/admin/ads', { params })
  return r.data.data
}

export async function getAdDetail(adId) {
  const r = await apiClient.get(`/admin/ads/${adId}`)
  return r.data.data
}

export async function setAdStatus(adId, status) {
  const r = await apiClient.patch(`/admin/ads/${adId}/status`, { status })
  return r.data.data
}

export async function deleteAd(adId) {
  const r = await apiClient.delete(`/admin/ads/${adId}`)
  return r.data.data
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories() {
  const r = await apiClient.get('/admin/categories')
  return r.data.data
}

export async function createCategory(data) {
  const r = await apiClient.post('/admin/categories', data)
  return r.data.data
}

export async function updateCategory(catId, data) {
  const r = await apiClient.patch(`/admin/categories/${catId}`, data)
  return r.data.data
}

export async function toggleCategory(catId) {
  const r = await apiClient.patch(`/admin/categories/${catId}/toggle`)
  return r.data.data
}

// ── Subscriptions & Payments ──────────────────────────────────────────────────

export async function getSubscriptions(params = {}) {
  const r = await apiClient.get('/admin/subscriptions', { params })
  return r.data.data
}

export async function getPayments(params = {}) {
  const r = await apiClient.get('/admin/payments', { params })
  return r.data.data
}

// Legacy aliases kept for backward compat with useAdmin.js hook
export async function getSubscriptionOverview() {
  const r = await apiClient.get('/subscriptions/admin/overview')
  return r.data.data
}

export async function getSubscriptionList(params = {}) {
  return getSubscriptions(params)
}

export async function getPaymentList(params = {}) {
  return getPayments(params)
}
