/**
 * profileVerification.js — Frontend shared constants for the profile verification workflow.
 *
 * Single source of truth for:
 *  - Which profile types require business/legal verification
 *  - Verification status display logic
 *  - Status badge styles
 *
 * Mirrors backend/src/utils/verificationTypes.js — keep both in sync.
 */

// ── Profile types that require admin verification ─────────────────────────────
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
export const VERIFICATION_STATUS = {
  UNVERIFIED:   'UNVERIFIED',
  PENDING:      'PENDING',      // legacy
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACTIVE:       'ACTIVE',
  VERIFIED:     'VERIFIED',     // legacy — treated as ACTIVE
  REJECTED:     'REJECTED',
  SUSPENDED:    'SUSPENDED',
}

/**
 * Returns true when the profile can be published publicly.
 * Enforced on the backend too — this is only for UI gating.
 * @param {string} verificationStatus
 * @param {string} profileType
 * @returns {boolean}
 */
export function canPublish(verificationStatus, profileType) {
  if (verificationStatus === VERIFICATION_STATUS.SUSPENDED) return false
  if (requiresVerification(profileType)) {
    return (
      verificationStatus === VERIFICATION_STATUS.ACTIVE ||
      verificationStatus === VERIFICATION_STATUS.VERIFIED
    )
  }
  return verificationStatus !== VERIFICATION_STATUS.SUSPENDED
}

/**
 * Human-readable label for a verification status.
 * @param {string} status
 * @returns {string}
 */
export function statusLabel(status) {
  const labels = {
    UNVERIFIED:   'Incomplete',
    PENDING:      'Pending',
    UNDER_REVIEW: 'Under Review',
    ACTIVE:       'Active',
    VERIFIED:     'Active',
    REJECTED:     'Rejected',
    SUSPENDED:    'Suspended',
  }
  return labels[status] || status
}

/**
 * Tailwind CSS class names for a verification status badge.
 * Returns { bg, text, border, dot } classes.
 * @param {string} status
 * @returns {{ bg: string, text: string, border: string, dot: string }}
 */
export function statusBadgeClasses(status) {
  const map = {
    UNVERIFIED:   { bg: 'bg-surface-2',   text: 'text-ink-3',    border: 'border-border',    dot: 'bg-ink-3'     },
    PENDING:      { bg: 'bg-amber-50',    text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    UNDER_REVIEW: { bg: 'bg-blue-50',     text: 'text-blue-700',  border: 'border-blue-200',  dot: 'bg-blue-500'  },
    ACTIVE:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    VERIFIED:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    REJECTED:     { bg: 'bg-red-50',      text: 'text-red-700',   border: 'border-red-200',   dot: 'bg-red-500'   },
    SUSPENDED:    { bg: 'bg-orange-50',   text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  }
  return map[status] || map.UNVERIFIED
}

// ── Accepted document formats (for UI display) ────────────────────────────────
export const ACCEPTED_DOCUMENT_TYPES = 'image/jpeg,image/png,application/pdf'
export const ACCEPTED_DOCUMENT_EXTENSIONS = '.jpg, .jpeg, .png, .pdf'
export const MAX_DOCUMENT_SIZE_MB = 10
