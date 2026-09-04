/**
 * admin.service.js — Business logic for admin operations.
 */
import { createError } from '../../utils/index.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'
import * as repo from './admin.repository.js'
import * as adsRepo from '../advertisements/advertisements.repository.js'
import * as subRepo from '../subscriptions/subscriptions.repository.js'
import * as storageUtils from '../../utils/storage.js'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

function pagination(total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize) || 1
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  }
}

// ── Stats & Analytics ─────────────────────────────────────────────────────────

export async function getStats() {
  return repo.getPlatformStats()
}

export async function getAnalytics() {
  return repo.getAnalyticsData()
}

export async function getRevenue() {
  return repo.getRevenueData()
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

export async function getUserAds(userId, query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)
  const user = await repo.findUserById(userId)
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND')
  const { rows, total } = await repo.findUserAds(userId, { page, pageSize })
  return { advertisements: rows, pagination: pagination(total, page, pageSize) }
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
    search:      query.search      || null,
    status:      query.status      || null,
    category_id: query.category_id || null,
  })
  return { advertisements: rows, pagination: pagination(total, page, pageSize) }
}

export async function getAdDetail(adId) {
  const ad = await repo.findAdById(adId)
  if (!ad) throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  return ad
}

export async function setAdStatus(adId, status, adminId) {
  const updated = await repo.updateAdStatus(adId, status)
  if (!updated) throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  logger.info({ adminId, adId, status }, 'Admin updated ad status')
  return updated
}

export async function deleteAd(adId, adminId) {
  const images = await adsRepo.findImages(adId)
  const storagePaths = images.map(i => i.storage_key).filter(Boolean)
  if (storagePaths.length > 0) await storageUtils.deleteImages(storagePaths)
  const deleted = await repo.deleteAdById(adId)
  if (!deleted) throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  logger.info({ adminId, adId }, 'Admin deleted advertisement')
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function listAllCategories() {
  return repo.findAllCategories()
}

export async function createCategory(body, adminId) {
  const { name, slug, description, icon, parent_id } = body

  // Slug uniqueness check
  const existing = await repo.findCategoryBySlug(slug)
  if (existing) throw createError('A category with this slug already exists', 409, 'DUPLICATE_SLUG')

  // Name uniqueness check (case-insensitive) among siblings
  const allCats = await repo.findAllCategories()
  const duplicate = allCats.find(
    c => c.name.toLowerCase() === name.toLowerCase() &&
         String(c.parent_id || '') === String(parent_id || '')
  )
  if (duplicate) throw createError('A category with this name already exists at this level', 409, 'DUPLICATE_NAME')

  const cat = await repo.insertCategory({ name, slug, description, icon, parent_id })
  logger.info({ adminId, catId: cat.id, name }, 'Admin created category')
  return cat
}

export async function updateCategory(catId, body, adminId) {
  const cat = await repo.findCategoryById(catId)
  if (!cat) throw createError('Category not found', 404, 'CATEGORY_NOT_FOUND')

  // If slug is being changed, check uniqueness
  if (body.slug && body.slug !== cat.slug) {
    const existing = await repo.findCategoryBySlug(body.slug, catId)
    if (existing) throw createError('A category with this slug already exists', 409, 'DUPLICATE_SLUG')
  }

  const updated = await repo.updateCategoryById(catId, body)
  logger.info({ adminId, catId }, 'Admin updated category')
  return updated
}

export async function toggleCategoryActive(catId, adminId) {
  const cat = await repo.findCategoryById(catId)
  if (!cat) throw createError('Category not found', 404, 'CATEGORY_NOT_FOUND')

  const updated = await repo.updateCategoryById(catId, { is_active: !cat.is_active })
  logger.info({ adminId, catId, is_active: !cat.is_active }, 'Admin toggled category')
  return updated
}

// ── Subscriptions & Payments ─────────────────────────────────────────────────

export async function listSubscriptions(query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)
  const { rows, total } = await subRepo.findAllSubscriptions({
    page, pageSize,
    search: query.search || null,
    status: query.status || null,
  })
  return { subscriptions: rows, pagination: pagination(total, page, pageSize) }
}

export async function listPayments(query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)
  const { rows, total } = await subRepo.findAllPayments({
    page, pageSize,
    status: query.status || null,
  })
  return { payments: rows, pagination: pagination(total, page, pageSize) }
}

// ── Subscription Plans ────────────────────────────────────────────────────────

export async function listPlans() {
  const { rows } = await pool.query(
    `SELECT id, name, display_name, price_etb, max_profile_services,
            max_portfolio_items, max_posts, max_gallery_images, max_social_links,
            is_featured, is_active, sort_order
     FROM subscription_plans ORDER BY sort_order`
  )
  return rows
}

export async function updatePlan(planId, data) {
  const allowed = [
    'display_name', 'price_etb', 'max_profile_services', 'max_portfolio_items',
    'max_posts', 'max_gallery_images', 'max_social_links', 'is_featured', 'is_active'
  ]
  const setClauses = []
  const values = []
  let idx = 1
  for (const key of allowed) {
    if (key in data) {
      setClauses.push(`${key} = $${idx++}`)
      values.push(data[key])
    }
  }
  if (!setClauses.length) throw new Error('No fields to update')
  values.push(planId)
  const { rows } = await pool.query(
    `UPDATE subscription_plans SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  if (!rows[0]) throw Object.assign(new Error('Plan not found'), { statusCode: 404 })
  return rows[0]
}
