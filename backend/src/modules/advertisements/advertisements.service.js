/**
 * advertisements.service.js — Business logic for advertisement listings.
 *
 * Handles:
 *  - Creating, reading, updating, and deleting advertisements
 *  - Status lifecycle transitions (DRAFT → PUBLISHED → PAUSED → ARCHIVED)
 *  - Ownership verification (always derives identity from req.user.id)
 *  - Image management (add, delete, set primary)
 *  - Search and filtering with pagination
 *  - Subscription enforcement (Phase 6) — publish gate + image limit
 *
 * Does NOT contain: SQL, HTTP logic, JWT.
 */
import { createError } from '../../utils/index.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'
import * as adsRepo from './advertisements.repository.js'
import * as subsRepo from '../subscriptions/subscriptions.repository.js'
import * as storageUtils from '../../utils/storage.js'

// ── Constants ──────────────────────────────────────────────────────────────────

/** Default page size */
const DEFAULT_PAGE_SIZE = 20

/** Maximum page size (prevents abuse) */
const MAX_PAGE_SIZE = 100

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Format an advertisement row into a consistent API response shape.
 * @param {object} row - Raw DB row (with possible joined fields)
 * @returns {object}
 */
function formatAd(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    category_id: row.category_id,
    category_name: row.category_name || null,
    category_slug: row.category_slug || null,
    category_icon: row.category_icon || null,
    price: row.price !== null && row.price !== undefined ? parseFloat(row.price) : null,
    price_type: row.price_type,
    contact_phone: row.contact_phone,
    contact_email: row.contact_email,
    status: row.status,
    published_at: row.published_at,
    expires_at: row.expires_at,
    latitude: row.latitude !== null && row.latitude !== undefined ? parseFloat(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? parseFloat(row.longitude) : null,
    address: row.address,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Build pagination metadata.
 * @param {number} total     - Total matching records
 * @param {number} page      - Current page (1-based)
 * @param {number} pageSize  - Items per page
 * @returns {object}
 */
function buildPagination(total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize)
  return {
    page,
    page_size: pageSize,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  }
}

// ── Public operations ─────────────────────────────────────────────────────────

/**
 * List published advertisements (public access).
 * @param {object} query - Validated query params
 * @returns {Promise<{ advertisements: object[], pagination: object }>}
 */
export async function listPublished(query) {
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, query.page_size || DEFAULT_PAGE_SIZE)

  const { rows, total } = await adsRepo.findPublished({
    search: query.search || undefined,
    category_id: query.category_id || undefined,
    min_price: query.min_price !== undefined ? query.min_price : undefined,
    max_price: query.max_price !== undefined ? query.max_price : undefined,
    page,
    page_size: pageSize,
  })

  // Attach primary image to each listing summary
  const advertisementsWithImages = await Promise.all(
    rows.map(async (row) => {
      const images = await adsRepo.findImages(row.id)
      const primaryImage = images.find((img) => img.is_primary) || images[0] || null
      return {
        ...formatAd(row),
        primary_image: primaryImage
          ? {
              id: primaryImage.id,
              image_url: primaryImage.image_url,
              alt_text: primaryImage.alt_text,
            }
          : null,
      }
    }),
  )

  return {
    advertisements: advertisementsWithImages,
    pagination: buildPagination(total, page, pageSize),
  }
}

/**
 * Get a single advertisement by ID (public access).
 * Only returns PUBLISHED advertisements; returns 404 for others.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getPublicById(id) {
  const row = await adsRepo.findById(id)

  if (!row || row.status !== 'PUBLISHED') {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  const images = await adsRepo.findImages(id)

  return {
    ...formatAd(row),
    // Include minimal advertiser info (no sensitive data)
    advertiser: {
      phone: row.advertiser_phone || null,
      email: row.advertiser_email || null,
    },
    images: images.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      alt_text: img.alt_text,
      sort_order: img.sort_order,
      is_primary: img.is_primary,
    })),
  }
}

// ── Advertiser operations ──────────────────────────────────────────────────────

/**
 * List all advertisements belonging to the authenticated user.
 * @param {string} userId - From req.user.id
 * @param {object} query  - Validated query params
 * @returns {Promise<{ advertisements: object[], pagination: object }>}
 */
export async function listMyAdvertisements(userId, query) {
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, query.page_size || DEFAULT_PAGE_SIZE)

  const { rows, total } = await adsRepo.findByUserId(userId, {
    status: query.status || undefined,
    page,
    page_size: pageSize,
  })

  const advertisementsWithImages = await Promise.all(
    rows.map(async (row) => {
      const images = await adsRepo.findImages(row.id)
      const primaryImage = images.find((img) => img.is_primary) || images[0] || null
      return {
        ...formatAd(row),
        primary_image: primaryImage
          ? {
              id: primaryImage.id,
              image_url: primaryImage.image_url,
              alt_text: primaryImage.alt_text,
            }
          : null,
        image_count: images.length,
      }
    }),
  )

  return {
    advertisements: advertisementsWithImages,
    pagination: buildPagination(total, page, pageSize),
  }
}

/**
 * Get a single advertisement for its owner (includes all statuses).
 * @param {string} id     - Advertisement UUID
 * @param {string} userId - Authenticated user's ID
 * @returns {Promise<object>}
 */
export async function getMyAdvertisementById(id, userId) {
  const row = await adsRepo.findById(id)

  if (!row) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (row.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  const images = await adsRepo.findImages(id)

  return {
    ...formatAd(row),
    images: images.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      storage_key: img.storage_key,
      alt_text: img.alt_text,
      sort_order: img.sort_order,
      is_primary: img.is_primary,
      created_at: img.created_at,
    })),
  }
}

/**
 * Create a new advertisement (starts in DRAFT).
 * @param {string} userId - From req.user.id
 * @param {object} data   - Validated request body
 * @returns {Promise<object>}
 */
export async function createAdvertisement(userId, data) {
  // Validate category if provided
  if (data.category_id) {
    const exists = await adsRepo.categoryExists(data.category_id)
    if (!exists) {
      throw createError(
        'category_id does not reference an existing category',
        400,
        'INVALID_CATEGORY',
      )
    }
  }

  const ad = await adsRepo.create({
    userId,
    title: data.title,
    description: data.description,
    categoryId: data.category_id,
    price: data.price,
    priceType: data.price_type,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address,
  })

  logger.info({ userId, advertisementId: ad.id }, 'Advertisement created')

  return formatAd(ad)
}

/**
 * Update an advertisement's fields.
 * Ownership is verified — user can only edit their own ads.
 * Only DRAFT and PAUSED advertisements can be edited.
 *
 * @param {string} id     - Advertisement UUID
 * @param {string} userId - From req.user.id
 * @param {object} data   - Validated fields to update
 * @returns {Promise<object>}
 */
export async function updateAdvertisement(id, userId, data) {
  const existing = await adsRepo.findById(id)

  if (!existing) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (existing.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  // Only allow editing of DRAFT or PAUSED advertisements
  if (!['DRAFT', 'PAUSED'].includes(existing.status)) {
    throw createError(
      'Only DRAFT or PAUSED advertisements can be edited. Pause the advertisement first.',
      409,
      'ADVERTISEMENT_NOT_EDITABLE',
    )
  }

  // Validate category if being changed
  if (data.category_id) {
    const exists = await adsRepo.categoryExists(data.category_id)
    if (!exists) {
      throw createError(
        'category_id does not reference an existing category',
        400,
        'INVALID_CATEGORY',
      )
    }
  }

  // Map schema field names to DB column names
  const dbFields = {}
  if ('title' in data) dbFields.title = data.title
  if ('description' in data) dbFields.description = data.description
  if ('category_id' in data) dbFields.category_id = data.category_id
  if ('price' in data) dbFields.price = data.price
  if ('price_type' in data) dbFields.price_type = data.price_type
  if ('contact_phone' in data) dbFields.contact_phone = data.contact_phone
  if ('contact_email' in data) dbFields.contact_email = data.contact_email
  if ('latitude' in data) dbFields.latitude = data.latitude
  if ('longitude' in data) dbFields.longitude = data.longitude
  if ('address' in data) dbFields.address = data.address
  if ('expires_at' in data) dbFields.expires_at = data.expires_at

  const updated = await adsRepo.update(id, userId, dbFields)

  if (!updated) {
    throw createError('Failed to update advertisement', 500, 'UPDATE_FAILED')
  }

  logger.info({ userId, advertisementId: id }, 'Advertisement updated')

  return formatAd(updated)
}

/**
 * Publish a DRAFT or PAUSED advertisement.
 * Sets status = PUBLISHED and records published_at.
 *
 * @param {string} id     - Advertisement UUID
 * @param {string} userId - From req.user.id
 * @returns {Promise<object>}
 */
export async function publishAdvertisement(id, userId) {
  const existing = await adsRepo.findById(id)

  if (!existing) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (existing.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (!['DRAFT', 'PAUSED'].includes(existing.status)) {
    throw createError(
      `Cannot publish an advertisement with status: ${existing.status}`,
      409,
      'INVALID_STATUS_TRANSITION',
    )
  }

  // ── Phase 6: Subscription enforcement ────────────────────────────────────
  // Check BEFORE updating status — never trust that client-side UI already blocked this.
  const subscription = await subsRepo.findByUserId(userId)

  const checkTime = new Date()
  const isActivePaid = (
    subscription?.status === 'ACTIVE' &&
    subscription?.current_period_end != null &&
    new Date(subscription.current_period_end) > checkTime
  )
  const isOnFreePlan = subscription?.status === 'FREE'

  if (!isActivePaid && !isOnFreePlan) {
    // EXPIRED status, or ACTIVE but period has already passed (cron hasn't run yet)
    throw createError(
      'Your subscription has expired. Please renew to publish advertisements.',
      402,
      'SUBSCRIPTION_REQUIRED',
    )
  }

  // Plan ad limit check
  const planMaxAds = subscription?.max_active_ads ?? 1 // FREE fallback
  const activeAdCount = await subsRepo.countPublishedAdsByUserId(userId)

  if (activeAdCount >= planMaxAds) {
    const planName = subscription?.plan_display_name || 'Free'
    throw createError(
      `Your ${planName} plan allows ${planMaxAds} active ad(s). ` +
      `Upgrade your plan or archive an existing ad first.`,
      409,
      'PLAN_LIMIT_REACHED',
    )
  }
  // ── End Phase 6 enforcement ───────────────────────────────────────────────

  const now = new Date().toISOString()
  const extra = existing.published_at ? {} : { published_at: now }

  const updated = await adsRepo.updateStatus(id, userId, 'PUBLISHED', extra)

  if (!updated) {
    throw createError('Failed to publish advertisement', 500, 'UPDATE_FAILED')
  }

  logger.info({ userId, advertisementId: id }, 'Advertisement published')

  return formatAd(updated)
}

/**
 * Pause a PUBLISHED advertisement.
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function pauseAdvertisement(id, userId) {
  const existing = await adsRepo.findById(id)

  if (!existing) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (existing.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (existing.status !== 'PUBLISHED') {
    throw createError(
      `Cannot pause an advertisement with status: ${existing.status}`,
      409,
      'INVALID_STATUS_TRANSITION',
    )
  }

  const updated = await adsRepo.updateStatus(id, userId, 'PAUSED')

  if (!updated) {
    throw createError('Failed to pause advertisement', 500, 'UPDATE_FAILED')
  }

  logger.info({ userId, advertisementId: id }, 'Advertisement paused')

  return formatAd(updated)
}

/**
 * Archive an advertisement (PUBLISHED, PAUSED, or DRAFT).
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function archiveAdvertisement(id, userId) {
  const existing = await adsRepo.findById(id)

  if (!existing) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (existing.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (existing.status === 'ARCHIVED') {
    throw createError('Advertisement is already archived', 409, 'INVALID_STATUS_TRANSITION')
  }

  if (existing.status === 'EXPIRED') {
    throw createError(
      'Cannot archive an expired advertisement',
      409,
      'INVALID_STATUS_TRANSITION',
    )
  }

  const updated = await adsRepo.updateStatus(id, userId, 'ARCHIVED')

  if (!updated) {
    throw createError('Failed to archive advertisement', 500, 'UPDATE_FAILED')
  }

  logger.info({ userId, advertisementId: id }, 'Advertisement archived')

  return formatAd(updated)
}

/**
 * Delete an advertisement.
 * Only DRAFT or ARCHIVED advertisements can be hard-deleted.
 * Published/Paused must be archived first.
 *
 * Also deletes all images from Supabase Storage before removing the DB row.
 *
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteAdvertisement(id, userId) {
  const existing = await adsRepo.findById(id)

  if (!existing) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (existing.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (!['DRAFT', 'ARCHIVED'].includes(existing.status)) {
    throw createError(
      'Only DRAFT or ARCHIVED advertisements can be deleted. Archive the advertisement first.',
      409,
      'ADVERTISEMENT_NOT_DELETABLE',
    )
  }

  // Delete all images from Supabase Storage before removing the DB row
  // (ON DELETE CASCADE handles the DB side, but not the storage files)
  const images = await adsRepo.findImages(id)
  const storagePaths = images.map((img) => img.storage_key).filter(Boolean)
  if (storagePaths.length > 0) {
    await storageUtils.deleteImages(storagePaths)
  }

  const deleted = await adsRepo.deleteById(id, userId)

  if (!deleted) {
    throw createError('Failed to delete advertisement', 500, 'DELETE_FAILED')
  }

  logger.info({ userId, advertisementId: id }, 'Advertisement deleted')
}

// ── Image operations ──────────────────────────────────────────────────────────

/**
 * Add an image to an advertisement.
 * The advertisement must belong to the authenticated user.
 * Maximum MAX_IMAGES images per advertisement.
 *
 * @param {string} advertisementId
 * @param {string} userId - From req.user.id
 * @param {object} imageData - { image_url, storage_key?, alt_text?, sort_order?, is_primary? }
 * @returns {Promise<object>} Created image record
 */
export async function addImage(advertisementId, userId, imageData) {
  const ad = await adsRepo.findById(advertisementId)

  if (!ad) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (ad.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  const imageCount = await adsRepo.countImages(advertisementId)

  // ── Phase 6: Plan-derived image limit ─────────────────────────────────────
  // Use the plan's max_images_per_ad instead of a hardcoded constant.
  const subscription = await subsRepo.findByUserId(userId)
  const planImageLimit = subscription?.max_images_per_ad ?? 3 // FREE plan fallback

  if (imageCount >= planImageLimit) {
    const planName = subscription?.plan_display_name || 'Free'
    throw createError(
      `Your ${planName} plan allows ${planImageLimit} images per advertisement.`,
      409,
      'IMAGE_LIMIT_REACHED',
    )
  }
  // ── End Phase 6 enforcement ───────────────────────────────────────────────

  // If this is the first image or explicitly marked as primary, use a transaction
  const shouldBePrimary = imageData.is_primary === true || imageCount === 0

  if (shouldBePrimary) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await adsRepo.clearPrimaryImage(advertisementId, client)
      const image = await adsRepo.addImage({
        advertisementId,
        imageUrl: imageData.image_url,
        storageKey: imageData.storage_key,
        altText: imageData.alt_text,
        sortOrder: imageData.sort_order ?? imageCount,
        isPrimary: true,
      })
      await client.query('COMMIT')
      return image
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  return adsRepo.addImage({
    advertisementId,
    imageUrl: imageData.image_url,
    storageKey: imageData.storage_key,
    altText: imageData.alt_text,
    sortOrder: imageData.sort_order ?? imageCount,
    isPrimary: false,
  })
}

/**
 * Delete an image from an advertisement.
 * Also deletes the file from Supabase Storage if a storage_key is present.
 *
 * @param {string} advertisementId
 * @param {string} imageId
 * @param {string} userId - From req.user.id
 * @returns {Promise<void>}
 */
export async function deleteImage(advertisementId, imageId, userId) {
  const ad = await adsRepo.findById(advertisementId)

  if (!ad) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (ad.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  const image = await adsRepo.findImageById(imageId, advertisementId)
  if (!image) {
    throw createError('Image not found', 404, 'IMAGE_NOT_FOUND')
  }

  // Delete from DB first — if storage delete fails, we log but don't block
  await adsRepo.deleteImage(imageId, advertisementId)

  // Delete from Supabase Storage (non-blocking — orphan is acceptable vs blocking user)
  if (image.storage_key) {
    await storageUtils.deleteImage(image.storage_key)
  }

  // If the deleted image was the primary, promote the next image
  if (image.is_primary) {
    const remaining = await adsRepo.findImages(advertisementId)
    if (remaining.length > 0) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await adsRepo.setPrimaryImage(remaining[0].id, advertisementId, client)
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }
  }

  logger.info({ userId, advertisementId, imageId }, 'Advertisement image deleted')
}

/**
 * Upload multiple image files to Supabase Storage and save metadata to DB.
 *
 * This is the new file-upload path (replaces the URL-paste workflow).
 * Files come from multer (req.files) as Buffers with validated MIME types.
 *
 * @param {string} advertisementId
 * @param {string} userId - From req.user.id
 * @param {Array<{ buffer: Buffer, mimetype: string, originalname: string }>} files
 * @returns {Promise<object[]>} Array of created image records
 */
export async function uploadImages(advertisementId, userId, files) {
  const ad = await adsRepo.findById(advertisementId)

  if (!ad) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (ad.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (!files || files.length === 0) {
    throw createError('No files provided', 422, 'NO_FILES')
  }

  const currentCount = await adsRepo.countImages(advertisementId)

  // Phase 6: plan-derived image limit
  const subscription = await subsRepo.findByUserId(userId)
  const planImageLimit = subscription?.max_images_per_ad ?? 3

  if (currentCount + files.length > planImageLimit) {
    const remaining = Math.max(0, planImageLimit - currentCount)
    const planName = subscription?.plan_display_name || 'Free'
    throw createError(
      `Your ${planName} plan allows ${planImageLimit} images per ad. ` +
      `You have ${currentCount} — you can add ${remaining} more.`,
      409,
      'IMAGE_LIMIT_REACHED',
    )
  }

  // Upload all files to Supabase Storage (atomic — cleanup on partial failure)
  const uploadResults = await storageUtils.uploadImages(
    files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype })),
    advertisementId,
  )

  // Save image records to PostgreSQL
  const savedImages = []
  const isFirstBatch = currentCount === 0

  try {
    for (let i = 0; i < uploadResults.length; i++) {
      const { publicUrl, storagePath } = uploadResults[i]
      const isFirstImage = isFirstBatch && i === 0

      if (isFirstImage) {
        // Use a transaction to atomically clear old primary and set new one
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await adsRepo.clearPrimaryImage(advertisementId, client)
          const img = await adsRepo.addImage({
            advertisementId,
            imageUrl: publicUrl,
            storageKey: storagePath,
            altText: null,
            sortOrder: currentCount + i,
            isPrimary: true,
          })
          savedImages.push(img)
          await client.query('COMMIT')
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }
      } else {
        const img = await adsRepo.addImage({
          advertisementId,
          imageUrl: publicUrl,
          storageKey: storagePath,
          altText: null,
          sortOrder: currentCount + i,
          isPrimary: false,
        })
        savedImages.push(img)
      }
    }
  } catch (dbErr) {
    // DB save failed after storage upload succeeded — clean up storage orphans
    const uploadedPaths = uploadResults.map((r) => r.storagePath)
    await storageUtils.deleteImages(uploadedPaths).catch((cleanupErr) =>
      logger.error({ err: cleanupErr }, 'Storage cleanup after DB failure failed'),
    )
    throw dbErr
  }

  logger.info(
    { userId, advertisementId, count: savedImages.length },
    'Advertisement images uploaded',
  )

  return savedImages
}

/**
 * Set a specific image as the primary image.
 * @param {string} advertisementId
 * @param {string} imageId
 * @param {string} userId - From req.user.id
 * @returns {Promise<object>}
 */
export async function setPrimaryImage(advertisementId, imageId, userId) {
  const ad = await adsRepo.findById(advertisementId)

  if (!ad) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  if (ad.user_id !== userId) {
    throw createError('Advertisement not found', 404, 'ADVERTISEMENT_NOT_FOUND')
  }

  const image = await adsRepo.findImageById(imageId, advertisementId)
  if (!image) {
    throw createError('Image not found', 404, 'IMAGE_NOT_FOUND')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await adsRepo.clearPrimaryImage(advertisementId, client)
    const updated = await adsRepo.setPrimaryImage(imageId, advertisementId, client)
    await client.query('COMMIT')
    return updated
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
