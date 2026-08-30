/**
 * App-wide constants.
 */

// Pagination
export const DEFAULT_PAGE_SIZE = 20

// Route paths
export const ROUTES = {
  HOME:            '/',
  LOGIN:           '/login',
  REGISTER:        '/register',
  ADS:             '/ads',
  AD_DETAIL:       (id) => `/ads/${id}`,
  PRICING:         '/pricing',

  // Dashboard
  DASHBOARD:               '/dashboard',
  DASHBOARD_ADS:           '/dashboard/advertisements',
  DASHBOARD_ADS_NEW:       '/dashboard/advertisements/new',
  DASHBOARD_ADS_EDIT:      (id) => `/dashboard/advertisements/${id}/edit`,
  DASHBOARD_SUBSCRIPTION:  '/dashboard/subscription',

  // Payment flow
  SUBSCRIPTION_CALLBACK: '/subscription/callback',
  SUBSCRIPTION_SUCCESS:  '/subscription/success',
}

// Ad categories (static fallback — real data comes from API)
export const AD_CATEGORIES = [
  'Products', 'Services', 'Skills', 'Jobs',
  'Real Estate', 'Vehicles', 'Electronics', 'Events', 'Other',
]

// Price types
export const PRICE_TYPES = [
  { value: 'FIXED',             label: 'Fixed price' },
  { value: 'NEGOTIABLE',        label: 'Negotiable' },
  { value: 'FREE',              label: 'Free' },
  { value: 'CONTACT_FOR_PRICE', label: 'Contact for price' },
]
