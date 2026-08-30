/**
 * admin.service.js — Business logic for admin operations.
 */
import { createError } from '../../utils/index.js'
import logger from '../../utils/logger.js'
import * as repo from './admin.repository.js'
import * as adsRepo from '../advertisements/advertisements.repository.js'
import * as storageUtils from '../../utils/storage.js'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

function pagination(total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize)
  return { page, page_size: pageSize, total, total_pages: totalPages, has_next: page < totalPages, has_prev: page > 1 }
}

export async function getStats() {
  return repo.getPlatformStats()
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)
  const { rows, total } = await repo.findAllUsers({
    page, pageSize,
    search: query.search || null,
    status: query.status || null,
    role:   query.role   || null,
  })
  return { users: rows, pagination: pagination(total, page, pageSize) }
}

export async function getUserDetail(userId) {
  const user = await repo.findUserById(userId)
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND')
  return user
}

export async function suspendUser(userId, adminId) {
  if (userId === adminId) throw createError('Cannot suspend yourself', 409, 'CANNOT_SELF_SUSPEND')
  const user = await repo.findUserById(userId)
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND')
  if (user.status === 'SUSPENDED') throw createError('User is already suspended', 409, 'ALREADY_SUSPENDED')
  const updated = await repo.updateUserStatus(userId, 'SUSPENDED')
  logger.info({ adminId, targetUserId: userId }, 'Admin suspended user')
  return updated
}

export async function activateUser(userId, adminId) {
  const user = await repo.findUserById(userId)
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND')
  const updated = await repo.updateUserStatus(userId, 'ACTIVE')
  logger.info({ adminId, targetUserId: userId }, 'Admin activated user')
  return updated
}

export async function promoteToAdmin(userId, adminId) {
  if (userId === adminId) throw createError('Cannot change your own role', 409, 'CANNOT_SELF_PROMOTE')
  const user = await repo.findUserById(userId)
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND')
  const updated = await repo.updateUserRole(userId, 'ADMIN')
  logger.info({ adminId, targetUserId: userId }, 'Admin promoted user to admin')
  return updated
}

export async function demoteToUser(userId, adminId) {
  if (userId === adminId) throw createError('Cannot change your own role', 409, 'CANNOT_SELF_DEMOTE')
  const user = await repo.findUserById(userId)
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND')
  const updated = await repo.updateUserRole(userId, 'USER')
  logger.info({ adminId, targetUserId: userId }, 'Admin demoted user to user')
  return updated
}

// ── Advertisements ────────────────────────────────────────────────────────────

export async function listAds(query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)
  const { rows, total } = await repo.findAllAds({
    page, pageSize,
    search: query.search || null,
    status: query.status || null,
  })
  return { advertisements: rows, pagination: pagination(total, page, pageSize) }
}

export async function setAdStatus(adId, status, adminId) {
  const updated = await repo.updateAdStatus(adId, status)
  if (!updated) throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  logger.info({ adminId, adId, status }, 'Admin updated ad status')
  return updated
}

export async function deleteAd(adId, adminId) {
  // Clean up storage before deleting
  const images = await adsRepo.findImages(adId)
  const storagePaths = images.map(i => i.storage_key).filter(Boolean)
  if (storagePaths.length > 0) await storageUtils.deleteImages(storagePaths)
  const deleted = await repo.deleteAdById(adId)
  if (!deleted) throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  logger.info({ adminId, adId }, 'Admin deleted advertisement')
}
