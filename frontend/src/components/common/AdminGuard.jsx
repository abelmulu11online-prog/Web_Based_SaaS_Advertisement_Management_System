/**
 * AdminGuard.jsx
 * Protects admin routes at the frontend level.
 *
 * Checks for a valid accessToken AND an ADMIN role in the JWT payload.
 * Backend independently enforces the same check — this guard is a UX
 * convenience only (fast redirect, no flash of admin UI for normal users).
 *
 * JWT payload: { id, role, status, iat, exp }
 * Role values in DB: 'USER' | 'ADMIN'
 */
import { Navigate, useLocation } from 'react-router-dom'

function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function AdminGuard({ children }) {
  const location = useLocation()
  const token = localStorage.getItem('accessToken')

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  const payload = parseJwtPayload(token)

  // Token parse failed, expired, or not ADMIN role
  if (!payload || payload.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  // Token expiry check (exp is unix seconds)
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
