/**
 * utils/storage.js — Supabase Storage helpers.
 *
 * Provides thin, reusable wrappers around Supabase Storage operations.
 * Controllers and services call these functions — no Supabase SDK
 * calls should appear outside this file.
 *
 * Storage path conventions:
 *   advertisements/{advertisementId}/{uuid}.{ext}
 *   profiles/{profileId}/avatar/{uuid}.{ext}
 *   profiles/{profileId}/cover/{uuid}.{ext}
 *   products/{productId}/{uuid}.{ext}
 *   services/{serviceId}/{uuid}.{ext}
 *   portfolio/{itemId}/{uuid}.{ext}
 *   posts/{postId}/{uuid}.{ext}
 *   achievements/{achievementId}/{uuid}.{ext}
 *
 * All files in the storage bucket are publicly readable.
 */
import { randomUUID } from 'crypto'
import { getSupabaseClient } from './supabase.js'
import { config } from '../config/index.js'
import { createError } from './index.js'
import logger from './logger.js'

// ── MIME type → file extension map ────────────────────────────────────────────

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

/** Allowed MIME types for all image uploads */
export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_EXT)

/** Maximum file size in bytes (5 MB) */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Maximum images per advertisement */
export const MAX_IMAGES_PER_AD = 5

/** Maximum images per profile content item (product, service, portfolio, post) */
export const MAX_IMAGES_PER_ITEM = 5

// ── Path builders ─────────────────────────────────────────────────────────────

function ext(mimeType) {
  return MIME_TO_EXT[mimeType] || 'jpg'
}

/**
 * Build the storage object path for an advertisement image.
 * @param {string} advertisementId
 * @param {string} mimeType
 * @returns {string} e.g. "advertisements/abc-123/d4e5f6.jpg"
 */
function buildStoragePath(advertisementId, mimeType) {
  return `advertisements/${advertisementId}/${randomUUID()}.${ext(mimeType)}`
}

/**
 * Build storage path for a profile avatar.
 * @param {string} profileId
 * @param {string} mimeType
 * @returns {string}
 */
export function buildAvatarPath(profileId, mimeType) {
  return `profiles/${profileId}/avatar/${randomUUID()}.${ext(mimeType)}`
}

/**
 * Build storage path for a profile cover image.
 * @param {string} profileId
 * @param {string} mimeType
 * @returns {string}
 */
export function buildCoverPath(profileId, mimeType) {
  return `profiles/${profileId}/cover/${randomUUID()}.${ext(mimeType)}`
}

/**
 * Build storage path for a profile content item image.
 * @param {'products'|'services'|'portfolio'|'posts'|'achievements'} folder
 * @param {string} itemId
 * @param {string} mimeType
 * @returns {string}
 */
export function buildItemImagePath(folder, itemId, mimeType) {
  return `${folder}/${itemId}/${randomUUID()}.${ext(mimeType)}`
}

/**
 * Build the storage object path for a private verification document.
 * These are stored in a dedicated prefix so they can be isolated from
 * public image content in Supabase Storage policy rules.
 *
 * @param {string} profileId
 * @param {string} mimeType  - image/jpeg | image/png | application/pdf
 * @returns {string} e.g. "verification-docs/abc-123/d4e5f6.pdf"
 */
export function buildVerificationDocPath(profileId, mimeType) {
  const extMap = {
    'image/jpeg': 'jpg',
    'image/jpg':  'jpg',
    'image/png':  'png',
    'application/pdf': 'pdf',
  }
  const fileExt = extMap[mimeType] || 'bin'
  return `verification-docs/${profileId}/${randomUUID()}.${fileExt}`
}

/**
 * Upload a single verification document buffer to Supabase Storage.
 * Uses the same underlying uploadSingleImage helper but with a
 * verification-docs-specific path.
 *
 * @param {Buffer}  buffer    - Raw file bytes
 * @param {string}  mimeType  - Validated MIME type
 * @param {string}  profileId - Profile UUID (used to build the storage path)
 * @returns {Promise<{ storagePath: string }>}
 *   Note: no publicUrl is returned — documents are PRIVATE and must be
 *   accessed via a signed URL generated server-side on demand.
 */
export async function uploadVerificationDoc(buffer, mimeType, profileId) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw createError('Storage service is not configured', 503, 'STORAGE_NOT_CONFIGURED')
  }

  const storagePath = buildVerificationDocPath(profileId, mimeType)

  const { error } = await supabase.storage
    .from(config.supabase.storageBucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    logger.error({ err: error, profileId, storagePath }, 'Verification document upload failed')
    throw createError('Failed to upload verification document', 502, 'STORAGE_UPLOAD_FAILED')
  }

  logger.info({ profileId, storagePath }, 'Verification document uploaded to Supabase Storage')
  // Return storagePath only — callers generate signed URLs on demand
  return { storagePath }
}

/**
 * Generate a short-lived signed URL for a private verification document.
 * Use this when an admin or the profile owner needs to view the document.
 *
 * @param {string} storagePath - The storage_key stored in verification_documents
 * @param {number} [expiresIn=300] - URL lifetime in seconds (default: 5 minutes)
 * @returns {Promise<string>} Signed URL
 */
export async function getVerificationDocSignedUrl(storagePath, expiresIn = 300) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw createError('Storage service is not configured', 503, 'STORAGE_NOT_CONFIGURED')
  }

  const { data, error } = await supabase.storage
    .from(config.supabase.storageBucket)
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    logger.error({ err: error, storagePath }, 'Failed to generate signed URL for verification document')
    throw createError('Failed to generate document access URL', 502, 'SIGNED_URL_FAILED')
  }

  return data.signedUrl
}

/**
 * Build the public URL for a given storage path.
 *
 * @param {string} storagePath
 * @returns {string}
 */
export function buildPublicUrl(storagePath) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw createError('Storage service is not configured', 503, 'STORAGE_NOT_CONFIGURED')
  }
  const { data } = supabase.storage
    .from(config.supabase.storageBucket)
    .getPublicUrl(storagePath)
  return data.publicUrl
}

// ── Upload ─────────────────────────────────────────────────────────────────────

/**
 * Upload a single image buffer to Supabase Storage.
 *
 * @param {Buffer}  fileBuffer      - Raw file bytes
 * @param {string}  mimeType        - Validated MIME type (must be in ALLOWED_MIME_TYPES)
 * @param {string}  advertisementId - Used to organise files into a folder
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
export async function uploadImage(fileBuffer, mimeType, advertisementId) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw createError('Storage service is not configured', 503, 'STORAGE_NOT_CONFIGURED')
  }

  const storagePath = buildStoragePath(advertisementId, mimeType)

  const { error } = await supabase.storage
    .from(config.supabase.storageBucket)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false, // never overwrite — UUID guarantees uniqueness
    })

  if (error) {
    logger.error({ err: error, advertisementId, storagePath }, 'Supabase Storage upload failed')
    throw createError('Failed to upload image to storage', 502, 'STORAGE_UPLOAD_FAILED')
  }

  const publicUrl = buildPublicUrl(storagePath)

  logger.info({ advertisementId, storagePath }, 'Image uploaded to Supabase Storage')
  return { publicUrl, storagePath }
}

/**
 * Upload multiple image buffers sequentially.
 * On partial failure, attempts to delete already-uploaded files to avoid orphans.
 *
 * @param {Array<{ buffer: Buffer, mimeType: string }>} files
 * @param {string} advertisementId
 * @returns {Promise<Array<{ publicUrl: string, storagePath: string }>>}
 */
export async function uploadImages(files, advertisementId) {
  const uploaded = []

  for (const file of files) {
    try {
      const result = await uploadImage(file.buffer, file.mimeType, advertisementId)
      uploaded.push(result)
    } catch (err) {
      // Clean up already-uploaded files before re-throwing
      if (uploaded.length > 0) {
        logger.warn(
          { advertisementId, uploadedCount: uploaded.length },
          'Partial upload failed — attempting cleanup of already-uploaded files',
        )
        await deleteImages(uploaded.map((u) => u.storagePath)).catch((cleanupErr) =>
          logger.error({ err: cleanupErr }, 'Cleanup after partial upload failed'),
        )
      }
      throw err
    }
  }

  return uploaded
}

/**
 * Upload a single image buffer using a caller-provided path builder.
 * Used for profile avatar, cover, and all profile content item images.
 *
 * @param {Buffer}  buffer       - Raw file bytes
 * @param {string}  mimeType     - Validated MIME type
 * @param {string}  storagePath  - Pre-built path (use buildAvatarPath etc.)
 * @returns {Promise<{ publicUrl: string, storagePath: string }>}
 */
export async function uploadSingleImage(buffer, mimeType, storagePath) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw createError('Storage service is not configured', 503, 'STORAGE_NOT_CONFIGURED')
  }

  const { error } = await supabase.storage
    .from(config.supabase.storageBucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    logger.error({ err: error, storagePath }, 'Supabase Storage upload failed')
    throw createError('Failed to upload image to storage', 502, 'STORAGE_UPLOAD_FAILED')
  }

  const publicUrl = buildPublicUrl(storagePath)
  logger.info({ storagePath }, 'Image uploaded to Supabase Storage')
  return { publicUrl, storagePath }
}

/**
 * Upload multiple image buffers using a caller-provided path builder function.
 * On partial failure, cleans up already-uploaded files.
 *
 * @param {Array<{ buffer: Buffer, mimeType: string }>} files
 * @param {(mimeType: string) => string} pathBuilder  - e.g. (mime) => buildItemImagePath('products', id, mime)
 * @returns {Promise<Array<{ publicUrl: string, storagePath: string }>>}
 */
export async function uploadItemImages(files, pathBuilder) {
  const uploaded = []
  for (const file of files) {
    try {
      const storagePath = pathBuilder(file.mimeType)
      const result = await uploadSingleImage(file.buffer, file.mimeType, storagePath)
      uploaded.push(result)
    } catch (err) {
      if (uploaded.length > 0) {
        await deleteImages(uploaded.map((u) => u.storagePath)).catch((e) =>
          logger.error({ err: e }, 'Cleanup after partial upload failed'),
        )
      }
      throw err
    }
  }
  return uploaded
}

// ── Delete ─────────────────────────────────────────────────────────────────────

/**
 * Delete a single image from Supabase Storage by its storage path.
 * Safe to call even if the file doesn't exist (404s are ignored).
 *
 * @param {string} storagePath - e.g. "advertisements/abc-123/d4e5f6.jpg"
 * @returns {Promise<void>}
 */
export async function deleteImage(storagePath) {
  if (!storagePath) return

  const supabase = getSupabaseClient()
  if (!supabase) {
    logger.warn({ storagePath }, 'Cannot delete image — Supabase not configured')
    return
  }

  const { error } = await supabase.storage
    .from(config.supabase.storageBucket)
    .remove([storagePath])

  if (error) {
    // Log but don't throw — a failed storage delete should not break the API response.
    // The database record is already removed; the storage orphan can be cleaned up later.
    logger.error({ err: error, storagePath }, 'Supabase Storage delete failed')
    return
  }

  logger.info({ storagePath }, 'Image deleted from Supabase Storage')
}

/**
 * Delete multiple images from Supabase Storage in a single call.
 * Safe to call with an empty array.
 *
 * @param {string[]} storagePaths
 * @returns {Promise<void>}
 */
export async function deleteImages(storagePaths) {
  const paths = storagePaths.filter(Boolean)
  if (paths.length === 0) return

  const supabase = getSupabaseClient()
  if (!supabase) {
    logger.warn({ count: paths.length }, 'Cannot delete images — Supabase not configured')
    return
  }

  const { error } = await supabase.storage
    .from(config.supabase.storageBucket)
    .remove(paths)

  if (error) {
    logger.error({ err: error, paths }, 'Supabase Storage bulk delete failed')
    return
  }

  logger.info({ count: paths.length }, 'Images deleted from Supabase Storage')
}
