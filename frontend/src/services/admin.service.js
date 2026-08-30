/**
 * admin.service.js — API calls for the admin panel.
 */
import apiClient from './apiClient.js'

export async function getStats() {
  const r = await apiClient.get('/admin/stats')
  return r.data.data
}

export async function getUsers(params = {}) {
  const r = await apiClient.get('/admin/users', { params })
  return r.data.data
}

export async function getUserDetail(userId) {
  const r = await apiClient.get(`/admin/users/${userId}`)
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

export async function getAds(params = {}) {
  const r = await apiClient.get('/admin/ads', { params })
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

// Subscription admin (already built in subscriptions module)
export async function getSubscriptionOverview() {
  const r = await apiClient.get('/subscriptions/admin/overview')
  return r.data.data
}

export async function getSubscriptionList(params = {}) {
  const r = await apiClient.get('/subscriptions/admin/list', { params })
  return r.data.data
}

export async function getPaymentList(params = {}) {
  const r = await apiClient.get('/subscriptions/admin/payments', { params })
  return r.data.data
}
