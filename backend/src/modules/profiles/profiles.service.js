/**
 * profiles.service.js — Business logic for public profiles and all profile content.
 *
 * Handles:
 *  - Public profile retrieval (by slug)
 *  - Profile search/discovery
 *  - Avatar and cover image upload
 *  - Products, services, portfolio, posts, achievements CRUD
 *  - Image management for all content types
 *  - Subscription limit enforcement for content creation
 *  - Profile completion score calculation
 *
 * Does NOT contain: SQL, HTTP logic, JWT.
 */
import { createError } from '../../utils/index.js'
import logger from '../../utils/logger.js'
import pool from '../../db/index.js'
import * as repo from './profiles.repository.js'
import * as subsRepo from '../subscriptions/subscriptions.repository.js'
import * as storageUtils from '../../utils/storage.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

// Image limits per content item
const MAX_CONTENT_IMAGES = 5

// Content image table/FK mappings
const IMAGE_CONFIG = {
  products:     { table: 'product_images',       fk: 'product_id' },
  services:     { table: 'service_images',        fk: 'service_id' },
  portfolio:    { table: 'portfolio_images',      fk: 'portfolio_item_id' },
  posts:        { table: 'post_images',           fk: 'post_id' },
  achievements: { table: 'achievement_images',    fk: 'achievement_id' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPagination(total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize) || 1
  return { page, page_size: pageSize, total, total_pages: totalPages,
           has_next: page < totalPages, has_prev: page > 1 }
}

/**
 * Compute a profile completion score (0–100) and a checklist.
 * Used both to cache score on profile and to show dashboard progress.
 */
function computeCompletion(profile, stats = {}) {
  const checks = [
    { key: 'avatar',       done: !!profile.avatar_url,        weight: 12, label: 'Add a profile photo' },
    { key: 'cover',        done: !!profile.cover_url,         weight: 8,  label: 'Add a cover image' },
    { key: 'headline',     done: !!profile.headline,          weight: 12, label: 'Add a headline' },
    { key: 'description',  done: !!profile.description,       weight: 12, label: 'Write a description' },
    { key: 'location',     done: !!(profile.city || profile.country), weight: 10, label: 'Add your location' },
    { key: 'contact',      done: !!(profile.contact_phone || profile.contact_email || profile.whatsapp), weight: 12, label: 'Add contact information' },
    { key: 'social',       done: (stats.social_count || 0) > 0,  weight: 8, label: 'Add social links' },
    { key: 'hours',        done: (stats.hours_count || 0) > 0,   weight: 8, label: 'Add business hours' },
    { key: 'service',      done: (stats.service_count || 0) > 0, weight: 8, label: 'Add your first service or work' },
    { key: 'portfolio',    done: (stats.portfolio_count || 0) > 0, weight: 8, label: 'Add a portfolio item' },
    { key: 'published',    done: !!profile.is_published,      weight: 10, label: 'Publish your profile' },
  ]

  const score = checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0)
  return { score: Math.min(100, score), checks }
}

/**
 * Fetch subscription and check content limit before create.
 * @param {string} userId
 * @param {string} limitField - e.g. 'max_products'
 * @param {number} currentCount
 */
async function enforceContentLimit(userId, limitField, currentCount) {
  const subscription = await subsRepo.findByUserId(userId)
  const limit = subscription?.[limitField] ?? 3
  if (currentCount >= limit) {
    const planName = subscription?.plan_display_name || 'Free'
    throw createError(
      `Your ${planName} plan allows ${limit} ${limitField.replace('max_', '')}. Upgrade to add more.`,
      409,
      'PLAN_LIMIT_REACHED',
    )
  }
}

// ── Public profile ─────────────────────────────────────────────────────────────

/**
 * Get a full public profile by slug.
 * Includes: profile core, business hours, social links, counts for each section.
 * Contact information is filtered based on visibility settings.
 * @param {string} slug
 * @param {string|null} viewerUserId - null for anonymous visitors
 */
export async function getPublicProfile(slug, viewerUserId = null) {
  const profile = await repo.findPublicProfileBySlug(slug)

  if (!profile) {
    throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  const [businessHours, socialLinks, serviceCount, portfolioCount, postCount, achievementCount, reviewStats] =
    await Promise.all([
      repo.findBusinessHours(profile.id),
      repo.findSocialLinks(profile.id),
      repo.countServicesOffered(profile.id),
      repo.countPortfolioItems(profile.id),
      repo.countPosts(profile.id),
      repo.findAchievements(profile.id, { publishedOnly: true }).then(a => a.length),
      repo.getReviewStats(profile.id),
    ])

  // Apply contact visibility rules
  const isLoggedIn = !!viewerUserId
  const phone = applyVisibility(profile.contact_phone, profile.phone_visibility, isLoggedIn)
  const email = applyVisibility(profile.contact_email, profile.email_visibility, isLoggedIn)

  return {
    id: profile.id,
    slug: profile.slug,
    display_name: profile.display_name,
    profile_type: profile.profile_type,
    headline: profile.headline,
    description: profile.description,
    avatar_url: profile.avatar_url,
    cover_url: profile.cover_url,
    is_verified: profile.is_verified,
    verification_status: profile.verification_status,
    // Location — show only up to the precision the owner chose
    location: buildPublicLocation(profile),
    // Contact
    contact: { phone, email, whatsapp: profile.whatsapp, telegram: profile.telegram_username, website: profile.website_url },
    // Business meta
    business_hours: businessHours,
    social_links: socialLinks,
    category: profile.category_name ? {
      name: profile.category_name, slug: profile.category_slug, icon: profile.category_icon,
    } : null,
    // Section counts (drives which tabs to show)
    sections: {
      services:     serviceCount,
      portfolio:    portfolioCount,
      posts:        postCount,
      achievements: achievementCount,
      reviews:      reviewStats.review_count,
    },
    avg_rating: reviewStats.avg_rating,
    review_count: reviewStats.review_count,
    joined_at: profile.created_at,
  }
}

function applyVisibility(value, visibility, isLoggedIn) {
  if (!value) return null
  if (visibility === 'PUBLIC') return value
  if (visibility === 'LOGGED_IN' && isLoggedIn) return value
  return null
}

function buildPublicLocation(profile) {
  const { location_precision, city, area, region, country, address_line, latitude, longitude } = profile
  const base = { country, region, city }

  if (location_precision === 'FULL') {
    return { ...base, area, address: address_line,
             coordinates: (latitude && longitude) ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : null }
  }
  if (location_precision === 'DISTRICT') {
    return { ...base, area }
  }
  // CITY: only show city-level
  return base
}

// ── Profile search ─────────────────────────────────────────────────────────────

export async function searchProfiles(query) {
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, query.page_size || DEFAULT_PAGE_SIZE)

  const { rows, total } = await repo.searchProfiles({
    search: query.search || undefined,
    profile_type: query.profile_type || undefined,
    category_id: query.category_id || undefined,
    city: query.city || undefined,
    country: query.country || undefined,
    verified_only: query.verified_only === 'true' || query.verified_only === true,
    latitude: query.latitude ? parseFloat(query.latitude) : undefined,
    longitude: query.longitude ? parseFloat(query.longitude) : undefined,
    radius_km: query.radius_km ? parseFloat(query.radius_km) : undefined,
    page,
    page_size: pageSize,
  })

  return { profiles: rows, pagination: buildPagination(total, page, pageSize) }
}

// ── Slug availability ──────────────────────────────────────────────────────────

export async function checkSlugAvailability(slug) {
  if (repo.RESERVED_SLUGS.has(slug.toLowerCase())) {
    return { available: false, reason: 'This name is reserved' }
  }
  const existing = await repo.findProfileBySlug(slug)
  return { available: !existing, reason: existing ? 'This name is already taken' : null }
}

// ── Avatar & cover image upload ────────────────────────────────────────────────

export async function uploadAvatar(userId, file) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const storagePath = storageUtils.buildAvatarPath(profile.id, file.mimetype)
  const { publicUrl } = await storageUtils.uploadSingleImage(file.buffer, file.mimetype, storagePath)

  // Delete old avatar from storage
  if (profile.avatar_storage_key) {
    await storageUtils.deleteImage(profile.avatar_storage_key).catch(() => {})
  }

  await repo.updateProfile(userId, { avatar_url: publicUrl, avatar_storage_key: storagePath })
  await _refreshCompletionScore(userId, profile.id)

  logger.info({ userId, profileId: profile.id }, 'Avatar uploaded')
  return { avatar_url: publicUrl }
}

export async function deleteAvatar(userId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (profile.avatar_storage_key) {
    await storageUtils.deleteImage(profile.avatar_storage_key).catch(() => {})
  }

  await repo.updateProfile(userId, { avatar_url: null, avatar_storage_key: null })
  await _refreshCompletionScore(userId, profile.id)
}

export async function uploadCover(userId, file) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const storagePath = storageUtils.buildCoverPath(profile.id, file.mimetype)
  const { publicUrl } = await storageUtils.uploadSingleImage(file.buffer, file.mimetype, storagePath)

  if (profile.cover_storage_key) {
    await storageUtils.deleteImage(profile.cover_storage_key).catch(() => {})
  }

  await repo.updateProfile(userId, { cover_url: publicUrl, cover_storage_key: storagePath })
  await _refreshCompletionScore(userId, profile.id)

  logger.info({ userId, profileId: profile.id }, 'Cover uploaded')
  return { cover_url: publicUrl }
}

export async function deleteCover(userId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (profile.cover_storage_key) {
    await storageUtils.deleteImage(profile.cover_storage_key).catch(() => {})
  }

  await repo.updateProfile(userId, { cover_url: null, cover_storage_key: null })
  await _refreshCompletionScore(userId, profile.id)
}

// ── Profile completion ─────────────────────────────────────────────────────────

export async function getProfileCompletion(userId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const [socialLinks, businessHours, services, portfolio] = await Promise.all([
    repo.findSocialLinks(profile.id),
    repo.findBusinessHours(profile.id),
    repo.findServicesOffered(profile.id, { page: 1, page_size: 1 }),
    repo.findPortfolioItems(profile.id, { page: 1, page_size: 1 }),
  ])

  const stats = {
    social_count:   socialLinks.length,
    hours_count:    businessHours.length,
    service_count:  services.total,
    portfolio_count: portfolio.total,
  }

  return computeCompletion(profile, stats)
}

async function _refreshCompletionScore(userId, profileId) {
  try {
    const [socialLinks, businessHours, services, portfolio] = await Promise.all([
      repo.findSocialLinks(profileId),
      repo.findBusinessHours(profileId),
      repo.findServicesOffered(profileId, { page: 1, page_size: 1 }),
      repo.findPortfolioItems(profileId, { page: 1, page_size: 1 }),
    ])
    const profile = await repo.findProfileByUserId(userId)
    const stats = { social_count: socialLinks.length, hours_count: businessHours.length,
                    service_count: services.total, portfolio_count: portfolio.total }
    const { score } = computeCompletion(profile, stats)
    await repo.updateProfile(userId, { completion_score: score })
  } catch (err) {
    logger.warn({ err }, 'Failed to refresh completion score — non-fatal')
  }
}

// ── Products ───────────────────────────────────────────────────────────────────

export async function listProducts(profileId, { publishedOnly = false, page = 1, page_size = DEFAULT_PAGE_SIZE }) {
  const ps = Math.min(MAX_PAGE_SIZE, page_size)
  const { rows, total } = await repo.findProducts(profileId, { publishedOnly, page, page_size: ps })

  const items = await Promise.all(rows.map(async (row) => {
    const images = await repo.findImages('product_images', 'product_id', row.id)
    const primary = images.find(i => i.is_primary) || images[0] || null
    return { ...row, primary_image: primary ? { id: primary.id, image_url: primary.image_url } : null }
  }))

  return { products: items, pagination: buildPagination(total, page, ps) }
}

export async function createProduct(userId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const count = await repo.countProducts(profile.id)
  await enforceContentLimit(userId, 'max_products', count)

  const product = await repo.createProduct(profile.id, data)
  logger.info({ userId, productId: product.id }, 'Product created')
  await _refreshCompletionScore(userId, profile.id)
  return product
}

export async function updateProduct(userId, productId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findProductById(productId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND')
  }

  const updated = await repo.updateProduct(productId, profile.id, data)
  return updated
}

export async function deleteProduct(userId, productId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findProductById(productId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Product not found', 404, 'PRODUCT_NOT_FOUND')
  }

  // Clean up images from storage
  const images = await repo.findImages('product_images', 'product_id', productId)
  const paths = images.map(i => i.storage_key).filter(Boolean)
  if (paths.length) await storageUtils.deleteImages(paths).catch(() => {})

  await repo.deleteProduct(productId, profile.id)
  logger.info({ userId, productId }, 'Product deleted')
}

// ── Services offered ───────────────────────────────────────────────────────────

export async function listServicesOffered(profileId, { publishedOnly = false, page = 1, page_size = DEFAULT_PAGE_SIZE }) {
  const ps = Math.min(MAX_PAGE_SIZE, page_size)
  const { rows, total } = await repo.findServicesOffered(profileId, { publishedOnly, page, page_size: ps })

  const items = await Promise.all(rows.map(async (row) => {
    const images = await repo.findImages('service_images', 'service_id', row.id)
    const primary = images.find(i => i.is_primary) || images[0] || null
    return { ...row, primary_image: primary ? { id: primary.id, image_url: primary.image_url } : null }
  }))

  return { services: items, pagination: buildPagination(total, page, ps) }
}

export async function createServiceOffered(userId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const count = await repo.countServicesOffered(profile.id)
  await enforceContentLimit(userId, 'max_profile_services', count)

  const service = await repo.createServiceOffered(profile.id, data)
  logger.info({ userId, serviceId: service.id }, 'Service created')
  return service
}

export async function updateServiceOffered(userId, serviceId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findServiceOfferedById(serviceId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Service not found', 404, 'SERVICE_NOT_FOUND')
  }

  return repo.updateServiceOffered(serviceId, profile.id, data)
}

export async function deleteServiceOffered(userId, serviceId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findServiceOfferedById(serviceId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Service not found', 404, 'SERVICE_NOT_FOUND')
  }

  const images = await repo.findImages('service_images', 'service_id', serviceId)
  const paths = images.map(i => i.storage_key).filter(Boolean)
  if (paths.length) await storageUtils.deleteImages(paths).catch(() => {})

  await repo.deleteServiceOffered(serviceId, profile.id)
  logger.info({ userId, serviceId }, 'Service deleted')
}

// ── Portfolio ──────────────────────────────────────────────────────────────────

export async function listPortfolioItems(profileId, { publishedOnly = false, page = 1, page_size = DEFAULT_PAGE_SIZE }) {
  const ps = Math.min(MAX_PAGE_SIZE, page_size)
  const { rows, total } = await repo.findPortfolioItems(profileId, { publishedOnly, page, page_size: ps })

  const items = await Promise.all(rows.map(async (row) => {
    const images = await repo.findImages('portfolio_images', 'portfolio_item_id', row.id)
    const primary = images.find(i => i.is_primary) || images[0] || null
    return { ...row, primary_image: primary ? { id: primary.id, image_url: primary.image_url } : null }
  }))

  return { items, pagination: buildPagination(total, page, ps) }
}

export async function createPortfolioItem(userId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const count = await repo.countPortfolioItems(profile.id)
  await enforceContentLimit(userId, 'max_portfolio_items', count)

  const item = await repo.createPortfolioItem(profile.id, data)
  logger.info({ userId, itemId: item.id }, 'Portfolio item created')
  await _refreshCompletionScore(userId, profile.id)
  return item
}

export async function updatePortfolioItem(userId, itemId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findPortfolioItemById(itemId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Portfolio item not found', 404, 'PORTFOLIO_ITEM_NOT_FOUND')
  }

  return repo.updatePortfolioItem(itemId, profile.id, data)
}

export async function deletePortfolioItem(userId, itemId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findPortfolioItemById(itemId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Portfolio item not found', 404, 'PORTFOLIO_ITEM_NOT_FOUND')
  }

  const images = await repo.findImages('portfolio_images', 'portfolio_item_id', itemId)
  const paths = images.map(i => i.storage_key).filter(Boolean)
  if (paths.length) await storageUtils.deleteImages(paths).catch(() => {})

  await repo.deletePortfolioItem(itemId, profile.id)
  logger.info({ userId, itemId }, 'Portfolio item deleted')
}

// ── Posts ──────────────────────────────────────────────────────────────────────

export async function listPosts(profileId, { publishedOnly = false, page = 1, page_size = DEFAULT_PAGE_SIZE }) {
  const ps = Math.min(MAX_PAGE_SIZE, page_size)
  const { rows, total } = await repo.findPosts(profileId, { publishedOnly, page, page_size: ps })

  const items = await Promise.all(rows.map(async (row) => {
    const images = await repo.findImages('post_images', 'post_id', row.id)
    const primary = images.find(i => i.is_primary) || images[0] || null
    return { ...row, primary_image: primary ? { id: primary.id, image_url: primary.image_url } : null }
  }))

  return { posts: items, pagination: buildPagination(total, page, ps) }
}

export async function createPost(userId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const count = await repo.countPosts(profile.id)
  await enforceContentLimit(userId, 'max_posts', count)

  const post = await repo.createPost(profile.id, data)
  logger.info({ userId, postId: post.id }, 'Post created')
  return post
}

export async function updatePost(userId, postId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findPostById(postId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Post not found', 404, 'POST_NOT_FOUND')
  }

  return repo.updatePost(postId, profile.id, data)
}

export async function deletePost(userId, postId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findPostById(postId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Post not found', 404, 'POST_NOT_FOUND')
  }

  const images = await repo.findImages('post_images', 'post_id', postId)
  const paths = images.map(i => i.storage_key).filter(Boolean)
  if (paths.length) await storageUtils.deleteImages(paths).catch(() => {})

  await repo.deletePost(postId, profile.id)
  logger.info({ userId, postId }, 'Post deleted')
}

// ── Achievements ───────────────────────────────────────────────────────────────

export async function listAchievements(profileId, { publishedOnly = false }) {
  return repo.findAchievements(profileId, { publishedOnly })
}

export async function createAchievement(userId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const achievement = await repo.createAchievement(profile.id, data)
  logger.info({ userId, achievementId: achievement.id }, 'Achievement created')
  return achievement
}

export async function updateAchievement(userId, achievementId, data) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findAchievementById(achievementId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Achievement not found', 404, 'ACHIEVEMENT_NOT_FOUND')
  }

  return repo.updateAchievement(achievementId, profile.id, data)
}

export async function deleteAchievement(userId, achievementId) {
  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const existing = await repo.findAchievementById(achievementId)
  if (!existing || existing.profile_id !== profile.id) {
    throw createError('Achievement not found', 404, 'ACHIEVEMENT_NOT_FOUND')
  }

  const images = await repo.findImages('achievement_images', 'achievement_id', achievementId)
  const paths = images.map(i => i.storage_key).filter(Boolean)
  if (paths.length) await storageUtils.deleteImages(paths).catch(() => {})

  await repo.deleteAchievement(achievementId, profile.id)
  logger.info({ userId, achievementId }, 'Achievement deleted')
}

// ── Generic content image upload ───────────────────────────────────────────────

/**
 * Upload images for a profile content item.
 * @param {string} userId
 * @param {string} contentType - 'products'|'services'|'portfolio'|'posts'|'achievements'
 * @param {string} itemId
 * @param {Array<{buffer, mimetype}>} files
 */
export async function uploadContentImages(userId, contentType, itemId, files) {
  const cfg = IMAGE_CONFIG[contentType]
  if (!cfg) throw createError('Invalid content type', 400, 'INVALID_CONTENT_TYPE')

  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  // Verify ownership
  const item = await _findContentItem(contentType, itemId)
  if (!item || item.profile_id !== profile.id) {
    throw createError('Item not found', 404, 'ITEM_NOT_FOUND')
  }

  if (!files || files.length === 0) {
    throw createError('No files provided', 422, 'NO_FILES')
  }

  const currentCount = await repo.countImages(cfg.table, cfg.fk, itemId)
  if (currentCount + files.length > MAX_CONTENT_IMAGES) {
    const remaining = Math.max(0, MAX_CONTENT_IMAGES - currentCount)
    throw createError(
      `Maximum ${MAX_CONTENT_IMAGES} images per item. You can add ${remaining} more.`,
      409, 'IMAGE_LIMIT_REACHED',
    )
  }

  // Upload to storage
  const folderMap = { products: 'products', services: 'services', portfolio: 'portfolio', posts: 'posts', achievements: 'achievements' }
  const folder = folderMap[contentType]

  const uploadResults = await storageUtils.uploadItemImages(
    files.map(f => ({ buffer: f.buffer, mimeType: f.mimetype })),
    (mimeType) => storageUtils.buildItemImagePath(folder, itemId, mimeType),
  )

  // Save to DB
  const saved = []
  const isFirstBatch = currentCount === 0
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    for (let i = 0; i < uploadResults.length; i++) {
      const { publicUrl, storagePath } = uploadResults[i]
      const isPrimary = isFirstBatch && i === 0
      if (isPrimary) {
        await repo.clearPrimaryImage(cfg.table, cfg.fk, itemId, client)
      }
      const img = await repo.addImage(cfg.table, cfg.fk, itemId, {
        imageUrl: publicUrl, storageKey: storagePath,
        altText: null, sortOrder: currentCount + i, isPrimary,
      })
      saved.push(img)
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    await storageUtils.deleteImages(uploadResults.map(r => r.storagePath)).catch(() => {})
    throw err
  } finally {
    client.release()
  }

  logger.info({ userId, contentType, itemId, count: saved.length }, 'Content images uploaded')
  return saved
}

export async function deleteContentImage(userId, contentType, itemId, imageId) {
  const cfg = IMAGE_CONFIG[contentType]
  if (!cfg) throw createError('Invalid content type', 400, 'INVALID_CONTENT_TYPE')

  const profile = await repo.findProfileByUserId(userId)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const item = await _findContentItem(contentType, itemId)
  if (!item || item.profile_id !== profile.id) {
    throw createError('Item not found', 404, 'ITEM_NOT_FOUND')
  }

  const image = await repo.findImageById(cfg.table, imageId, cfg.fk, itemId)
  if (!image) throw createError('Image not found', 404, 'IMAGE_NOT_FOUND')

  await repo.deleteImageById(cfg.table, imageId)
  if (image.storage_key) await storageUtils.deleteImage(image.storage_key).catch(() => {})

  // Promote next image to primary if needed
  if (image.is_primary) {
    const remaining = await repo.findImages(cfg.table, cfg.fk, itemId)
    if (remaining.length > 0) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await repo.clearPrimaryImage(cfg.table, cfg.fk, itemId, client)
        await repo.setPrimaryImage(cfg.table, remaining[0].id, cfg.fk, itemId, client)
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    }
  }
}

async function _findContentItem(contentType, itemId) {
  switch (contentType) {
    case 'products':     return repo.findProductById(itemId)
    case 'services':     return repo.findServiceOfferedById(itemId)
    case 'portfolio':    return repo.findPortfolioItemById(itemId)
    case 'posts':        return repo.findPostById(itemId)
    case 'achievements': return repo.findAchievementById(itemId)
    default: return null
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function listProfileReviews(slug, query = {}) {
  const profile = await repo.findPublicProfileBySlug(slug)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const page = Math.max(1, parseInt(query.page) || 1)
  const page_size = Math.min(50, parseInt(query.page_size) || 10)
  const { rows, total } = await repo.listReviews(profile.id, { page, page_size })
  const stats = await repo.getReviewStats(profile.id)

  return {
    reviews: rows,
    stats,
    pagination: buildPagination(total, page, page_size),
  }
}

export async function submitReview(slug, reviewerUserId, data) {
  const profile = await repo.findPublicProfileBySlug(slug)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  if (profile.user_id === reviewerUserId) {
    throw createError('You cannot review your own profile', 403, 'SELF_REVIEW')
  }

  const existing = await repo.findReviewByReviewer(profile.id, reviewerUserId)
  if (existing) {
    throw createError('You have already reviewed this profile', 409, 'DUPLICATE_REVIEW')
  }

  const review = await repo.insertReview({
    profileId: profile.id,
    reviewerUserId,
    rating: data.rating,
    comment: data.comment || null,
  })

  // Notify the profile owner about the new review
  try {
    const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating)
    await repo.createNotification({
      userId: profile.user_id,
      type: 'new_review',
      title: `New ${stars} review on your profile`,
      body: data.comment ? data.comment.slice(0, 100) : `Someone left a ${data.rating}-star rating.`,
      link: `/p/${profile.slug}#reviews`,
    })
  } catch (e) { /* non-fatal */ }

  return review
}

export async function updateMyReview(slug, reviewId, reviewerUserId, data) {
  const profile = await repo.findPublicProfileBySlug(slug)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const updated = await repo.updateReview(reviewId, reviewerUserId, data)
  if (!updated) throw createError('Review not found', 404, 'REVIEW_NOT_FOUND')
  return updated
}

export async function deleteMyReview(slug, reviewId, reviewerUserId) {
  const profile = await repo.findPublicProfileBySlug(slug)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')

  const deleted = await repo.deleteReview(reviewId, reviewerUserId)
  if (!deleted) throw createError('Review not found', 404, 'REVIEW_NOT_FOUND')
}

// ── Profile map pins ───────────────────────────────────────────────────────────

export async function getProfileMapPins(query = {}) {
  const { rows } = await repo.searchProfiles({
    search: query.search || undefined,
    category_id: query.category_id || undefined,
    city: query.city || undefined,
    country: query.country || undefined,
    page: 1,
    page_size: 500,
  })

  return rows
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => ({
      id: p.id,
      slug: p.slug,
      display_name: p.display_name,
      headline: p.headline,
      avatar_url: p.avatar_url,
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
      city: p.city,
      country: p.country,
      category_name: p.category_name,
      category_icon: p.category_icon,
      is_verified: p.is_verified,
      is_featured: p.is_featured,
      avg_rating: p.avg_rating,
      review_count: p.review_count,
    }))
}

// ── Review replies ─────────────────────────────────────────────────────────────

export async function addReviewReply(slug, reviewId, authorUserId, body) {
  // Profile must exist and be the caller's profile
  const profile = await repo.findPublicProfileBySlug(slug)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  if (profile.user_id !== authorUserId) {
    throw createError('Only the profile owner can reply to reviews', 403, 'FORBIDDEN')
  }

  // Review must belong to this profile
  const reviewCheck = await pool.query(
    'SELECT * FROM profile_reviews WHERE id = $1 AND profile_id = $2',
    [reviewId, profile.id]
  )
  if (!reviewCheck.rows[0]) throw createError('Review not found', 404, 'REVIEW_NOT_FOUND')

  const reply = await repo.insertReviewReply({ reviewId, authorId: authorUserId, body })

  // Notify the reviewer that the owner replied
  try {
    await repo.createNotification({
      userId: reviewCheck.rows[0].reviewer_user_id,
      type: 'review_reply',
      title: `${profile.display_name} replied to your review`,
      body: body.slice(0, 100),
      link: `/p/${profile.slug}#reviews`,
    })
  } catch (e) { /* non-fatal */ }

  return reply
}

export async function deleteReviewReply(slug, reviewId, authorUserId) {
  const profile = await repo.findPublicProfileBySlug(slug)
  if (!profile) throw createError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  if (profile.user_id !== authorUserId) {
    throw createError('Only the profile owner can delete replies', 403, 'FORBIDDEN')
  }
  const deleted = await repo.deleteReviewReply(reviewId, authorUserId)
  if (!deleted) throw createError('Reply not found', 404, 'REPLY_NOT_FOUND')
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getMyNotifications(userId) {
  const notifications = await repo.listNotifications(userId, 30)
  const unread = await repo.countUnreadNotifications(userId)
  return { notifications, unread_count: unread }
}

export async function markNotificationRead(notificationId, userId) {
  await repo.markNotificationRead(notificationId, userId)
}

export async function markAllNotificationsRead(userId) {
  await repo.markAllNotificationsRead(userId)
}
