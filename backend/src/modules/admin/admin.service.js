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
import { VERIFICATION_STATUS, requiresVerification } from '../../utils/verificationTypes.js'

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

export async function deleteUser(userId, adminId) {
  if (userId === adminId) throw createError('Cannot delete your own account', 409, 'CANNOT_SELF_DELETE')
  const user = await repo.findUserById(userId)
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND')
  if (user.role === 'ADMIN') throw createError('Cannot delete an admin account', 409, 'CANNOT_DELETE_ADMIN')
  const deleted = await repo.deleteUserById(userId)
  if (!deleted) throw createError('User not found', 404, 'USER_NOT_FOUND')
  logger.info({ adminId, targetUserId: userId }, 'Admin deleted user')
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

// ── Profile Verifications ─────────────────────────────────────────────────────

export async function listProfileVerifications(query = {}) {
  const page     = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, parseInt(query.page_size, 10) || DEFAULT_PAGE_SIZE)
  const status   = query.status || 'UNDER_REVIEW'
  const { rows, total } = await repo.findProfilesByVerificationStatus({
    page, pageSize,
    status,
    search:       query.search       || null,
    profile_type: query.profile_type || null,
  })
  return { profiles: rows, pagination: pagination(total, page, pageSize) }
}

export async function getProfileVerificationDetail(profileId) {
  const profile = await repo.findProfileVerificationById(profileId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  // Strip the raw storage_key from the response — return a signed URL instead
  const docSignedUrl = profile.doc_storage_key
    ? await storageUtils.getVerificationDocSignedUrl(profile.doc_storage_key, 600).catch(() => null)
    : null

  const { doc_storage_key, ...safeProfile } = profile
  return { ...safeProfile, doc_signed_url: docSignedUrl }
}

export async function approveProfile(profileId, adminId, { note = null } = {}) {
  const profile = await repo.findProfileVerificationById(profileId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (profile.verification_status === VERIFICATION_STATUS.ACTIVE) {
    throw createError('Profile is already approved', 409, 'ALREADY_APPROVED')
  }

  // Verify required info exists for verification-required types
  if (requiresVerification(profile.profile_type)) {
    if (!profile.business_name) {
      throw createError('Business name is required before approval', 422, 'MISSING_BUSINESS_NAME')
    }
    if (!profile.doc_id) {
      throw createError('Verification document is required before approval', 422, 'MISSING_DOCUMENT')
    }
  }

  const updated = await repo.updateProfileVerificationStatus(profileId, {
    status:          VERIFICATION_STATUS.ACTIVE,
    reviewedBy:      adminId,
    rejectionReason: null,
    adminNotes:      note,
  })

  // Update document admin notes if provided
  if (note && profile.doc_id) {
    await repo.updateDocumentAdminNotes(profileId, note)
  }

  // Notify the user
  await _notifyUser(profile.user_id, {
    type:  'profile_approved',
    title: 'Profile Approved',
    body:  'Your profile has been reviewed and approved. You can now publish it publicly.',
    link:  '/dashboard',
  })

  logger.info({ adminId, profileId, status: 'ACTIVE' }, 'Admin approved profile')
  return updated
}

export async function rejectProfile(profileId, adminId, { reason }) {
  if (!reason || !reason.trim()) {
    throw createError('Rejection reason is required', 422, 'REJECTION_REASON_REQUIRED')
  }
  const profile = await repo.findProfileVerificationById(profileId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const updated = await repo.updateProfileVerificationStatus(profileId, {
    status:          VERIFICATION_STATUS.REJECTED,
    reviewedBy:      adminId,
    rejectionReason: reason.trim(),
  })

  // Force unpublish rejected profile
  await pool.query(
    `UPDATE profiles SET is_published = FALSE, updated_at = now() WHERE id = $1`,
    [profileId]
  )

  // Notify the user
  await _notifyUser(profile.user_id, {
    type:  'profile_rejected',
    title: 'Profile Review Update',
    body:  `Your profile verification was not approved. Reason: ${reason.trim()}`,
    link:  '/dashboard',
  })

  logger.info({ adminId, profileId, status: 'REJECTED', reason }, 'Admin rejected profile')
  return updated
}

export async function suspendProfile(profileId, adminId, { reason = null } = {}) {
  const profile = await repo.findProfileVerificationById(profileId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (profile.verification_status === VERIFICATION_STATUS.SUSPENDED) {
    throw createError('Profile is already suspended', 409, 'ALREADY_SUSPENDED')
  }

  const updated = await repo.updateProfileVerificationStatus(profileId, {
    status:          VERIFICATION_STATUS.SUSPENDED,
    reviewedBy:      adminId,
    rejectionReason: reason || null,
  })

  // Force unpublish
  await pool.query(
    `UPDATE profiles SET is_published = FALSE, updated_at = now() WHERE id = $1`,
    [profileId]
  )

  // Notify the user
  await _notifyUser(profile.user_id, {
    type:  'profile_suspended',
    title: 'Profile Suspended',
    body:  reason
      ? `Your profile has been suspended. Reason: ${reason}`
      : 'Your profile has been suspended. Please contact support.',
    link:  '/dashboard',
  })

  logger.info({ adminId, profileId, status: 'SUSPENDED' }, 'Admin suspended profile')
  return updated
}

export async function getVerificationStats() {
  const count = await repo.countProfilesUnderReview()
  return { under_review: count }
}

async function _notifyUser(userId, { type, title, body, link }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, link || null]
    )
  } catch (e) {
    // Non-fatal: notification failure must not roll back the main action
    logger.warn({ userId, type, err: e.message }, 'Failed to create notification')
  }
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
