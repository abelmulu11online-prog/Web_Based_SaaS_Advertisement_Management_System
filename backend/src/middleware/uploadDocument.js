/**
 * middleware/uploadDocument.js — Multer middleware for verification document uploads.
 *
 * Accepts:
 *   - image/jpeg, image/jpg, image/png  (business license photos)
 *   - application/pdf                   (PDF registration documents)
 *
 * Limits:
 *   - Max 10 MB per file
 *   - Single file only (field name: "document")
 *
 * Storage: in-memory (buffer is passed to Supabase Storage, never written to disk).
 *
 * Usage:
 *   import { uploadDocumentMiddleware } from '../../middleware/uploadDocument.js'
 *   router.post('/verification-document/upload', authenticate, uploadDocumentMiddleware, ctrl.uploadVerificationDocument)
 *
 * After this middleware, req.file contains:
 *   { fieldname, originalname, mimetype, buffer, size }
 */
import multer from 'multer'
import { createError } from '../utils/index.js'
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../utils/verificationTypes.js'

const storage = multer.memoryStorage()

function fileFilter(_req, file, cb) {
  if (ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      createError(
        `Unsupported file type: ${file.mimetype}. Accepted: JPEG, PNG, PDF.`,
        422,
        'UNSUPPORTED_DOCUMENT_TYPE',
      ),
    )
  }
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES, // 10 MB
    files: 1,
  },
})

/**
 * Express middleware that parses a single document upload.
 * Normalises Multer errors into the project's standard error shape.
 * @type {import('express').RequestHandler}
 */
export function uploadDocumentMiddleware(req, res, next) {
  multerUpload.single('document')(req, res, (err) => {
    if (!err) return next()

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        createError(
          `File too large. Maximum size is ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} MB.`,
          422,
          'DOCUMENT_TOO_LARGE',
        ),
      )
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(createError('Only one document can be uploaded at a time.', 422, 'TOO_MANY_FILES'))
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(createError('Unexpected field name. Use "document" as the form field name.', 422, 'UNEXPECTED_FIELD'))
    }

    if (err.isOperational) return next(err)

    return next(createError('Document upload failed', 400, 'UPLOAD_ERROR'))
  })
}
