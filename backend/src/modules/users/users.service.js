/**
 * users.service.js — Business logic for profile & business details.
 *
 * Handles:
 *  - profile creation, retrieval, update
 *  - business-details creation/update (business hours, social links)
 *  - ownership validation (always derives user identity from req.user.id)
 *  - duplicate profile prevention
 *  - slug uniqueness enforcement
 *
 * Does NOT contain: SQL, HTTP logic, JWT, password hashing.
 */
import { createError } from '../../utils/index.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'
import * as profileRepo from './users.repository.js'
import { requiresVerification, canPublish, VERIFICATION_STATUS } from '../../utils/verificationTypes.js'
import * as storageUtils from '../../utils/storage.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Format a profile row into a safe API response object.
 * Excludes no sensitive fields (profiles table has none), but
 * ensures a consistent shape.
 */
function formatProfile(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    slug: row.slug,
    profile_type: row.profile_type || 'PERSONAL',
    headline: row.headline || null,
    description: row.description,
    avatar_url: row.avatar_url || null,
    cover_url: row.cover_url || null,
    category_id: row.category_id,
    category_name: row.category_name || null,
    category_slug: row.category_slug || null,
    location_id: row.location_id,
    location_city: row.location_city || row.city || null,
    location_region: row.location_region || row.region || null,
    location_country: row.location_country || row.country || null,
    city: row.city || null,
    region: row.region || null,
    country: row.country || null,
    area: row.area || null,
    address_line: row.address_line || null,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    location_precision: row.location_precision || 'CITY',
    contact_phone: row.contact_phone,
    contact_email: row.contact_email,
    website_url: row.website_url,
    whatsapp: row.whatsapp || null,
    telegram_username: row.telegram_username || null,
    phone_visibility: row.phone_visibility || 'PUBLIC',
    email_visibility: row.email_visibility || 'PUBLIC',
    is_published: row.is_published,
    is_verified: row.is_verified,
    verification_status: row.verification_status || 'UNVERIFIED',
    completion_score: row.completion_score || 0,
    // Verification fields (migration 036)
    business_name: row.business_name || null,
    business_type: row.business_type || null,
    license_number: row.license_number || null,
    license_issue_date: row.license_issue_date || null,
    license_expiry_date: row.license_expiry_date || null,
    business_address: row.business_address || null,
    business_city: row.business_city || null,
    business_region: row.business_region || null,
    business_country: row.business_country || null,
    additional_information: row.additional_information || null,
    rejection_reason: row.rejection_reason || null,
    published_at: row.published_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ── Profile operations ─────────────────────────────────────────────────────────

/**
 * Get the authenticated user's profile, including business hours and social links.
 * @param {string} userId - From req.user.id (authenticated identity)
 * @returns {Promise<object>} Profile data with business hours and social links
 * @throws {Error} 404 PROFILE_NOT_FOUND if user has no profile
 */
export async function getProfile(userId) {
  const profile = await profileRepo.findProfileByUserId(userId)

  if (!profile) {
    throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  // Fetch related business details
  const [businessHours, socialLinks] = await Promise.all([
    profileRepo.getBusinessHours(profile.id),
    profileRepo.getSocialLinks(profile.id),
  ])

  return {
    ...formatProfile(profile),
    business_hours: businessHours,
    social_links: socialLinks,
  }
}

/**
 * Create a new profile for the authenticated user.
 * Enforces: one profile per user, slug uniqueness.
 * @param {string} userId - From req.user.id
 * @param {object} data - Validated profile fields
 * @returns {Promise<object>} Created profile data
 */
export async function createProfile(userId, data) {
  // Validate that the user exists
  const userFound = await profileRepo.userExists(userId)
  if (!userFound) {
    throw createError(
      'user_id does not reference an existing user',
      400,
      'INVALID_USER',
    )
  }

  // Check if user already has a profile (one-to-one)
  const existing = await profileRepo.findProfileByUserId(userId)
  if (existing) {
    throw createError(
      'A profile already exists for this account',
      409,
      'DUPLICATE_PROFILE',
    )
  }

  // Check slug uniqueness
  const existingSlug = await profileRepo.findProfileBySlug(data.slug)
  if (existingSlug) {
    throw createError(
      'This slug is already taken',
      409,
      'DUPLICATE_SLUG',
    )
  }

  // Validate foreign-key references
  if (data.category_id) {
    const categoryFound = await profileRepo.categoryExists(data.category_id)
    if (!categoryFound) {
      throw createError(
        'category_id does not reference an existing category',
        400,
        'INVALID_CATEGORY',
      )
    }
  }

  if (data.location_id) {
    const locationFound = await profileRepo.locationExists(data.location_id)
    if (!locationFound) {
      throw createError(
        'location_id does not reference an existing location',
        400,
        'INVALID_LOCATION',
      )
    }
  }

  const profile = await profileRepo.createProfile({
    userId,
    displayName: data.display_name,
    slug: data.slug,
    description: data.description,
    categoryId: data.category_id,
    locationId: data.location_id,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    websiteUrl: data.website_url,
    isPublished: data.is_published ?? false,
    profileType: data.profile_type || 'PERSONAL',
    headline: data.headline || null,
    country: data.country || null,
    region: data.region || null,
    city: data.city || null,
    area: data.area || null,
    addressLine: data.address_line || null,
    whatsapp: data.whatsapp || null,
    telegramUsername: data.telegram_username || null,
    phoneVisibility: data.phone_visibility || 'PUBLIC',
    emailVisibility: data.email_visibility || 'PUBLIC',
  })

  logger.info({ userId, profileId: profile.id }, 'Profile created successfully')

  return formatProfile(profile)
}

/**
 * Update the authenticated user's profile.
 * Enforces: ownership via user_id, slug uniqueness if slug is changed.
 * Handles both legacy fields and new extended fields (profile_type, headline, location, etc.)
 * Also updates business verification fields if profile type requires verification.
 * @param {string} userId - From req.user.id
 * @param {object} data - Validated fields to update
 * @returns {Promise<object>} Updated profile data
 * @throws {Error} 404 PROFILE_NOT_FOUND if user has no profile
 */
export async function updateProfile(userId, data) {
  // Validate that the user exists
  const userFound = await profileRepo.userExists(userId)
  if (!userFound) {
    throw createError(
      'user_id does not reference an existing user',
      400,
      'INVALID_USER',
    )
  }

  // Verify the profile belongs to the authenticated user
  const existing = await profileRepo.findProfileByUserId(userId)
  if (!existing) {
    throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  // If slug is being changed, check uniqueness (excluding current profile)
  if (data.slug && data.slug !== existing.slug) {
    // Check reserved slugs
    const { RESERVED_SLUGS } = await import('../profiles/profiles.repository.js')
    if (RESERVED_SLUGS.has(data.slug.toLowerCase())) {
      throw createError('This slug is reserved and cannot be used', 409, 'RESERVED_SLUG')
    }
    const slugOwner = await profileRepo.findProfileBySlug(data.slug)
    if (slugOwner && slugOwner.id !== existing.id) {
      throw createError(
        'This slug is already taken',
        409,
        'DUPLICATE_SLUG',
      )
    }
  }

  // Validate foreign-key references if being updated
  if (data.category_id) {
    const categoryFound = await profileRepo.categoryExists(data.category_id)
    if (!categoryFound) {
      throw createError(
        'category_id does not reference an existing category',
        400,
        'INVALID_CATEGORY',
      )
    }
  }

  if (data.location_id) {
    const locationFound = await profileRepo.locationExists(data.location_id)
    if (!locationFound) {
      throw createError(
        'location_id does not reference an existing location',
        400,
        'INVALID_LOCATION',
      )
    }
  }

  const updated = await profileRepo.updateProfile(userId, data)

  logger.info({ userId, profileId: updated.id }, 'Profile updated successfully')

  // Trigger completion score refresh (non-blocking)
  try {
    const { default: profilesRepo } = await import('../profiles/profiles.repository.js')
    const [socialLinks, businessHours, services, portfolio] = await Promise.all([
      profilesRepo.findSocialLinks(updated.id),
      profilesRepo.findBusinessHours(updated.id),
      profilesRepo.findServicesOffered(updated.id, { page: 1, page_size: 1 }),
      profilesRepo.findPortfolioItems(updated.id, { page: 1, page_size: 1 }),
    ])
    const stats = {
      social_count: socialLinks.length,
      hours_count: businessHours.length,
      service_count: services.total,
      portfolio_count: portfolio.total,
    }
    const checks = [
      { done: !!updated.avatar_url,        weight: 10 },
      { done: !!updated.cover_url,         weight: 8 },
      { done: !!updated.headline,          weight: 10 },
      { done: !!updated.description,       weight: 10 },
      { done: !!(updated.city || updated.country), weight: 8 },
      { done: !!(updated.contact_phone || updated.contact_email || updated.whatsapp), weight: 10 },
      { done: stats.social_count > 0,      weight: 7 },
      { done: stats.hours_count > 0,       weight: 7 },
      { done: stats.service_count > 0,     weight: 8 },
      { done: stats.portfolio_count > 0,   weight: 10 },
      { done: !!updated.is_published,      weight: 10 },
    ]
    const score = Math.min(100, checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0))
    await profileRepo.updateProfile(userId, { completion_score: score })
  } catch (e) {
    // Non-fatal — completion score will update on next read
  }

  return formatProfile(updated)
}

// ── Business details operations ───────────────────────────────────────────────

/**
 * Get the authenticated user's business details (business hours + social links).
 * @param {string} userId - From req.user.id
 * @returns {Promise<object>} { business_hours, social_links }
 * @throws {Error} 404 PROFILE_NOT_FOUND if user has no profile
 */
export async function getBusinessDetails(userId) {
  const profile = await profileRepo.findProfileByUserId(userId)

  if (!profile) {
    throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  const [businessHours, socialLinks] = await Promise.all([
    profileRepo.getBusinessHours(profile.id),
    profileRepo.getSocialLinks(profile.id),
  ])

  return {
    business_hours: businessHours,
    social_links: socialLinks,
  }
}

/**
 * Upsert (replace) business details for the authenticated user.
 * Uses a transaction: if any operation fails, all changes are rolled back.
 *
 * @param {string} userId - From req.user.id
 * @param {object} data - { business_hours?, social_links? }
 * @returns {Promise<object>} Updated { business_hours, social_links }
 * @throws {Error} 404 PROFILE_NOT_FOUND if user has no profile
 */
export async function upsertBusinessDetails(userId, data) {
  const profile = await profileRepo.findProfileByUserId(userId)

  if (!profile) {
    throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Replace business hours if provided
    if (data.business_hours !== undefined) {
      await profileRepo.deleteBusinessHours(profile.id, client)
      for (const entry of data.business_hours) {
        await profileRepo.insertBusinessHour(profile.id, entry, client)
      }
    }

    // Replace social links if provided
    if (data.social_links !== undefined) {
      await profileRepo.deleteSocialLinks(profile.id, client)
      for (const entry of data.social_links) {
        await profileRepo.insertSocialLink(profile.id, entry, client)
      }
    }

    await client.query('COMMIT')

    logger.info(
      { userId, profileId: profile.id },
      'Business details updated successfully',
    )
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  // Return the updated data
  const [businessHours, socialLinks] = await Promise.all([
    profileRepo.getBusinessHours(profile.id),
    profileRepo.getSocialLinks(profile.id),
  ])

  return {
    business_hours: businessHours,
    social_links: socialLinks,
  }
}

// ── Verification workflow ─────────────────────────────────────────────────────

/**
 * Upload a verification document for the authenticated user's profile.
 * Replaces any previously uploaded document.
 *
 * @param {string} userId   - From req.user.id
 * @param {object} file     - Multer file object { buffer, mimetype, originalname, size }
 * @returns {Promise<object>} Document metadata (no storage_key / signed URL)
 */
export async function uploadVerificationDocument(userId, file) {
  const profile = await profileRepo.findProfileByUserId(userId)
  if (!profile) {
    throw createError('Profile not found. Create a profile first.', 404, 'PROFILE_NOT_FOUND')
  }

  // Upload to Supabase Storage
  const { storagePath } = await storageUtils.uploadVerificationDoc(
    file.buffer,
    file.mimetype,
    profile.id,
  )

  // Upsert DB record; delete old storage file if one existed
  const client = await pool.connect()
  let oldStorageKey = null
  try {
    await client.query('BEGIN')
    const { doc, oldStorageKey: old } = await profileRepo.upsertVerificationDocument(
      profile.id,
      {
        documentName: file.originalname?.slice(0, 200) || 'document',
        documentType: 'business_license',
        storageKey:   storagePath,
        mimeType:     file.mimetype,
        fileSize:     file.size || null,
      },
      client,
    )
    oldStorageKey = old
    await client.query('COMMIT')

    // Clean up old file from storage (non-fatal)
    if (oldStorageKey) {
      storageUtils.deleteImage(oldStorageKey).catch(e =>
        logger.warn({ err: e.message, oldStorageKey }, 'Failed to delete old verification document from storage')
      )
    }

    logger.info({ userId, profileId: profile.id }, 'Verification document uploaded')
    return doc
  } catch (err) {
    await client.query('ROLLBACK')
    // Clean up newly uploaded file to avoid orphan
    storageUtils.deleteImage(storagePath).catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

/**
 * Get the current user's verification document metadata (no signed URL).
 */
export async function getMyVerificationDocument(userId) {
  const profile = await profileRepo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  return profileRepo.findVerificationDocument(profile.id)
}

/**
 * Submit the profile for admin review.
 * Valid only for profiles that require verification (SHOP, BUSINESS, COMPANY, ORGANIZATION).
 * Status must be UNVERIFIED or REJECTED to submit.
 *
 * @param {string} userId
 * @returns {Promise<object>} Updated profile
 */
export async function submitForReview(userId) {
  const profile = await profileRepo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (!requiresVerification(profile.profile_type)) {
    throw createError(
      `Profile type ${profile.profile_type} does not require verification.`,
      422,
      'VERIFICATION_NOT_REQUIRED',
    )
  }

  const currentStatus = profile.verification_status
  if (
    currentStatus !== VERIFICATION_STATUS.UNVERIFIED &&
    currentStatus !== VERIFICATION_STATUS.REJECTED &&
    currentStatus !== VERIFICATION_STATUS.PENDING
  ) {
    throw createError(
      `Profile cannot be submitted for review from status: ${currentStatus}`,
      409,
      'INVALID_STATUS_TRANSITION',
    )
  }

  // Require at minimum: business_name and a document
  if (!profile.business_name) {
    throw createError(
      'Business name is required before submitting for review.',
      422,
      'MISSING_BUSINESS_NAME',
    )
  }

  const docKey = await profileRepo.findVerificationDocStorageKey(profile.id)
  if (!docKey) {
    throw createError(
      'A verification document (business license, registration certificate, or equivalent) is required.',
      422,
      'MISSING_DOCUMENT',
    )
  }

  const updated = await profileRepo.setVerificationStatusByUserId(userId, VERIFICATION_STATUS.UNDER_REVIEW)

  logger.info({ userId, profileId: profile.id }, 'Profile submitted for review')
  return { ...formatProfile({ ...profile, ...updated }), verification_status: VERIFICATION_STATUS.UNDER_REVIEW }
}

/**
 * Resubmit a rejected profile for review.
 * Identical flow to submitForReview but only valid from REJECTED status.
 */
export async function resubmitForReview(userId) {
  const profile = await profileRepo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (profile.verification_status !== VERIFICATION_STATUS.REJECTED) {
    throw createError(
      'Only rejected profiles can be resubmitted.',
      409,
      'INVALID_STATUS_TRANSITION',
    )
  }

  if (!profile.business_name) {
    throw createError('Business name is required before resubmitting.', 422, 'MISSING_BUSINESS_NAME')
  }

  const docKey = await profileRepo.findVerificationDocStorageKey(profile.id)
  if (!docKey) {
    throw createError('A verification document is required before resubmitting.', 422, 'MISSING_DOCUMENT')
  }

  const updated = await profileRepo.setVerificationStatusByUserId(userId, VERIFICATION_STATUS.UNDER_REVIEW)

  logger.info({ userId, profileId: profile.id }, 'Profile resubmitted for review')
  return { ...formatProfile({ ...profile, ...updated }), verification_status: VERIFICATION_STATUS.UNDER_REVIEW }
}

/**
 * Publish the authenticated user's profile (set is_published = true).
 * Backend enforces: profile must be ACTIVE (for verification-required types)
 * or non-suspended (for other types).
 *
 * @param {string} userId
 * @returns {Promise<object>} Updated profile
 */
export async function publishProfile(userId) {
  const profile = await profileRepo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (!canPublish(profile.verification_status, profile.profile_type)) {
    const vs = profile.verification_status
    if (vs === VERIFICATION_STATUS.UNDER_REVIEW) {
      throw createError(
        'Your profile is currently under review. You can publish it after admin approval.',
        409,
        'PROFILE_UNDER_REVIEW',
      )
    }
    if (vs === VERIFICATION_STATUS.REJECTED) {
      throw createError(
        'Your profile was rejected. Please update your information and resubmit for review.',
        409,
        'PROFILE_REJECTED',
      )
    }
    if (vs === VERIFICATION_STATUS.SUSPENDED) {
      throw createError(
        'Your profile has been suspended and cannot be published.',
        409,
        'PROFILE_SUSPENDED',
      )
    }
    if (vs === VERIFICATION_STATUS.UNVERIFIED && requiresVerification(profile.profile_type)) {
      throw createError(
        'This profile type requires admin verification before it can be published. Please submit for review.',
        409,
        'VERIFICATION_REQUIRED',
      )
    }
    throw createError('Profile cannot be published in its current state.', 409, 'CANNOT_PUBLISH')
  }

  const updated = await profileRepo.publishProfileByUserId(userId)

  logger.info({ userId, profileId: profile.id }, 'Profile published')
  return { ...formatProfile({ ...profile, ...updated }), is_published: true }
}

/**
 * Unpublish the authenticated user's profile.
 * @param {string} userId
 */
export async function unpublishProfile(userId) {
  const profile = await profileRepo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const updated = await profileRepo.unpublishProfileByUserId(userId)

  logger.info({ userId, profileId: profile.id }, 'Profile unpublished')
  return { ...formatProfile({ ...profile, ...updated }), is_published: false }
}
