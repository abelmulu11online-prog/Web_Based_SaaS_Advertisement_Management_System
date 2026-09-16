/**
 * verificationTypes.js — Shared constants for the profile verification workflow.
 *
 * Single source of truth used by:
 *  - users.service.js  (submit-review, publish, resubmit logic)
 *  - admin.service.js  (approve, reject, suspend logic)
 *  - profiles.repository.js (public search — only show ACTIVE+published)
 *
 * Do NOT duplicate these values in individual modules.
 */

// ── Profile types that require business/legal verification ────────────────────
export const VERIFICATION_REQUIRED_TYPES = new Set([
  'SHOP',
  'BUSINESS',
  'COMPANY',
  'ORGANIZATION',
])

/**
 * Returns true when the given profile_type requires admin verification
 * before the profile can become public.
 * @param {string} profileType
 * @returns {boolean}
 */
export function requiresVerification(profileType) {
  return VERIFICATION_REQUIRED_TYPES.has(profileType)
}

// ── Verification status values ────────────────────────────────────────────────
// Must match the verification_status PostgreSQL enum (migrations 021 + 036).
export const VERIFICATION_STATUS = {
  UNVERIFIED:   'UNVERIFIED',   // default — no verification submitted
  PENDING:      'PENDING',      // legacy value — kept for backward compat
  UNDER_REVIEW: 'UNDER_REVIEW', // user submitted — awaiting admin review
  ACTIVE:       'ACTIVE',       // admin approved — user can publish
  VERIFIED:     'VERIFIED',     // legacy value — treated as ACTIVE
  REJECTED:     'REJECTED',     // admin rejected — user must resubmit
  SUSPENDED:    'SUSPENDED',    // admin suspended the profile
}

/**
 * Returns true when a profile with this status is allowed to be publicly visible.
 * For verification-required types the status must be ACTIVE (or legacy VERIFIED).
 * For non-verification types any non-suspended status is allowed.
 *
 * @param {string} verificationStatus
 * @param {string} profileType
 * @returns {boolean}
 */
export function canBePublic(verificationStatus, profileType) {
  if (verificationStatus === VERIFICATION_STATUS.SUSPENDED) return false
  if (requiresVerification(profileType)) {
    return (
      verificationStatus === VERIFICATION_STATUS.ACTIVE ||
      verificationStatus === VERIFICATION_STATUS.VERIFIED
    )
  }
  // Personal / Professional / Freelancer — no verification gate
  return (
    verificationStatus !== VERIFICATION_STATUS.SUSPENDED
  )
}

/**
 * Returns true when the user is allowed to click "Publish Profile".
 * Identical rules to canBePublic — enforced on the backend.
 */
export function canPublish(verificationStatus, profileType) {
  return canBePublic(verificationStatus, profileType)
}

// ── Document MIME types accepted for verification uploads ─────────────────────
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]

/** Maximum size for a single verification document: 10 MB */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024
