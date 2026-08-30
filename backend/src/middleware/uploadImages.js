/**
 * middleware/uploadImages.js — Multer middleware for image file uploads.
 *
 * Configured for advertisement image uploads:
 *  - In-memory storage (buffer is passed to Supabase Storage, never written to disk)
 *  - Strict MIME type validation (JPEG, PNG, WEBP only)
 *  - Max 5 MB per file
 *  - Max 5 files per request
 *
 * Usage:
 *   import { uploadImages } from '../../middleware/uploadImages.js'
 *   router.post('/:id/images/upload', authenticate, uploadImages, ctrl.uploadImages)
 *
 * After this middleware, req.files contains an array of Multer file objects,
 * each with: fieldname, originalname, mimetype, buffer, size.
 */
import multer from 'multer'
import { createError } from '../utils/index.js'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_IMAGES_PER_AD } from '../utils/storage.js'

// Store files in memory — buffer is uploaded directly to Supabase Storage
const storage = multer.memoryStorage()

/**
 * Multer fileFilter — reject non-image files before they're buffered.
 */
function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      createError(
        `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP.`,
        422,
        'UNSUPPORTED_FILE_TYPE',
      ),
    )
  }
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,         // 5 MB per file
    files: MAX_IMAGES_PER_AD,             // max 5 files per request
  },
})

/**
 * Express middleware that parses multipart/form-data and populates req.files.
 * Wraps Multer's error handling to convert errors into our standard shape.
 *
 * @type {import('express').RequestHandler}
 */
export function uploadImagesMiddleware(req, res, next) {
  multerUpload.array('images', MAX_IMAGES_PER_AD)(req, res, (err) => {
    if (!err) return next()

    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        createError(
          `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB per image.`,
          422,
          'FILE_TOO_LARGE',
        ),
      )
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(
        createError(
          `Too many files. Maximum ${MAX_IMAGES_PER_AD} images per upload.`,
          422,
          'TOO_MANY_FILES',
        ),
      )
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        createError(
          'Unexpected field name. Use "images" as the form field name.',
          422,
          'UNEXPECTED_FIELD',
        ),
      )
    }

    // Our own createError from fileFilter (already has statusCode + code)
    if (err.isOperational) return next(err)

    return next(createError('File upload failed', 400, 'UPLOAD_ERROR'))
  })
}
