/**
 * App-wide constants.
 * Add environment-specific values, route paths, and enums here.
 */

// API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20

// Route paths — centralise so changes propagate everywhere
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  // Public advertisement routes
  ADVERTISEMENTS: '/ads',
  ADVERTISEMENT_DETAIL: '/ads/:id',
  // Advertiser dashboard routes
  DASHBOARD_ADVERTISEMENTS: '/dashboard/advertisements',
  DASHBOARD_ADVERTISEMENT_NEW: '/dashboard/advertisements/new',
  DASHBOARD_ADVERTISEMENT_EDIT: '/dashboard/advertisements/:id/edit',
  // Other
  SUBSCRIPTIONS: '/subscriptions',
  PROFILE: '/profile',
  ADMIN: '/admin',
}

// Ad categories — will be driven by the API in a later phase
export const AD_CATEGORIES = [
  'Products',
  'Services',
  'Skills',
  'Jobs',
  'Real Estate',
  'Vehicles',
  'Events',
  'Other',
]
