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
    isPublished: data.is_published,
  })

  logger.info({ userId, profileId: profile.id }, 'Profile created successfully')

  return formatProfile(profile)
}

/**
 * Update the authenticated user's profile.
 * Enforces: ownership via user_id, slug uniqueness if slug is changed.
 * Handles both legacy fields and new extended fields (profile_type, headline, location, etc.)
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
