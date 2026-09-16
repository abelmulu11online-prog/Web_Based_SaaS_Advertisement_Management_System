/**
 * Shared utility functions.
 * Keep each function pure and side-effect free.
 */

/**
 * Format a date string to a readable local date.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

/**
 * Truncate a string to a maximum length and append ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 100) {
  if (!str) return ''
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str
}

/**
 * Build a query string from a plain object.
 * @param {Record<string, any>} params
 * @returns {string}
 */
export function buildQueryString(params) {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
  ).toString()
}
