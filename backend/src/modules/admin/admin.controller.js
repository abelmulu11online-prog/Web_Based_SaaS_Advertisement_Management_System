/**
 * admin.controller.js — HTTP layer for admin endpoints.
 */
import { asyncHandler, sendSuccess } from '../../utils/index.js'
import * as service from './admin.service.js'

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await service.getStats()
  sendSuccess(res, 'Platform stats retrieved', stats)
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

export const setAdStatus = asyncHandler(async (req, res) => {
  const result = await service.setAdStatus(req.params.adId, req.body.status, req.user.id)
  sendSuccess(res, 'Advertisement status updated', result)
})

export const deleteAd = asyncHandler(async (req, res) => {
  await service.deleteAd(req.params.adId, req.user.id)
  sendSuccess(res, 'Advertisement deleted', null)
})
