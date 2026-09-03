/**
 * admin.controller.js — HTTP layer for admin endpoints.
 * Thin controllers: extract req values, call service, send response.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as service from './admin.service.js'

// ── Stats & Analytics ─────────────────────────────────────────────────────────

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await service.getStats()
  sendSuccess(res, 'Platform stats retrieved', stats)
})

export const getAnalytics = asyncHandler(async (_req, res) => {
  const data = await service.getAnalytics()
  sendSuccess(res, 'Analytics data retrieved', data)
})

export const getRevenue = asyncHandler(async (_req, res) => {
  const data = await service.getRevenue()
  sendSuccess(res, 'Revenue data retrieved', data)
})

// ── Users ─────────────────────────────────────────────────────────────────────

export const listUsers = asyncHandler(async (req, res) => {
  const result = await service.listUsers(req.query || {})
  sendSuccess(res, 'Users retrieved', result)
})

export const getUserDetail = asyncHandler(async (req, res) => {
  const user = await service.getUserDetail(req.params.userId)
  sendSuccess(res, 'User retrieved', user)
})

export const getUserAds = asyncHandler(async (req, res) => {
  const result = await service.getUserAds(req.params.userId, req.query || {})
  sendSuccess(res, 'User advertisements retrieved', result)
})

export const suspendUser = asyncHandler(async (req, res) => {
  const result = await service.suspendUser(req.params.userId, req.user.id)
  sendSuccess(res, 'User suspended', result)
})

export const activateUser = asyncHandler(async (req, res) => {
  const result = await service.activateUser(req.params.userId, req.user.id)
  sendSuccess(res, 'User activated', result)
})

export const promoteToAdmin = asyncHandler(async (req, res) => {
  const result = await service.promoteToAdmin(req.params.userId, req.user.id)
  sendSuccess(res, 'User promoted to admin', result)
})

export const demoteToUser = asyncHandler(async (req, res) => {
  const result = await service.demoteToUser(req.params.userId, req.user.id)
  sendSuccess(res, 'User demoted to user', result)
})

// ── Advertisements ────────────────────────────────────────────────────────────

export const listAds = asyncHandler(async (req, res) => {
  const result = await service.listAds(req.query || {})
  sendSuccess(res, 'Advertisements retrieved', result)
})

export const getAdDetail = asyncHandler(async (req, res) => {
  const ad = await service.getAdDetail(req.params.adId)
  sendSuccess(res, 'Advertisement retrieved', ad)
})

export const setAdStatus = asyncHandler(async (req, res) => {
  const result = await service.setAdStatus(req.params.adId, req.body.status, req.user.id)
  sendSuccess(res, 'Advertisement status updated', result)
})

export const deleteAd = asyncHandler(async (req, res) => {
  await service.deleteAd(req.params.adId, req.user.id)
  sendSuccess(res, 'Advertisement deleted', null)
})

// ── Categories ────────────────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (_req, res) => {
  const cats = await service.listAllCategories()
  sendSuccess(res, 'Categories retrieved', cats)
})

export const createCategory = asyncHandler(async (req, res) => {
  const cat = await service.createCategory(req.body, req.user.id)
  sendSuccess(res, 'Category created', cat, 201)
})

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await service.updateCategory(req.params.catId, req.body, req.user.id)
  sendSuccess(res, 'Category updated', cat)
})

export const toggleCategory = asyncHandler(async (req, res) => {
  const cat = await service.toggleCategoryActive(req.params.catId, req.user.id)
  sendSuccess(res, 'Category toggled', cat)
})

// ── Subscriptions & Payments ──────────────────────────────────────────────────

export const listSubscriptions = asyncHandler(async (req, res) => {
  const result = await service.listSubscriptions(req.query || {})
  sendSuccess(res, 'Subscriptions retrieved', result)
})

export const listPayments = asyncHandler(async (req, res) => {
  const result = await service.listPayments(req.query || {})
  sendSuccess(res, 'Payment records retrieved', result)
})
