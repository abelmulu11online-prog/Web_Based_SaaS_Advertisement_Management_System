import axios from 'axios'

/**
 * apiClient — pre-configured Axios instance.
 * All API calls in the app should use this instance
 * so base URL, headers, and interceptors are applied consistently.
 *
 * Authentication headers (JWT) will be added here in a later phase.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach auth token when available
apiClient.interceptors.request.use(
  (config) => {
    // TODO (Phase 4 — Auth): attach JWT from storage
    // const token = localStorage.getItem('token')
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — centralised error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: handle 401 redirect to login, show toast notifications, etc.
    return Promise.reject(error)
  },
)

export default apiClient
