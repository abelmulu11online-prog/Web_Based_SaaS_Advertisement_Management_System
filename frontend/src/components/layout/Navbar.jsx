/**
 * Navbar — top navigation bar.
 * Reads auth state from localStorage to decide what links to show.
 * Phase 4's full AuthContext integration will replace this in a later pass.
 */
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../constants/index.js'

export function Navbar() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate(ROUTES.HOME)
    window.location.reload()
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand */}
      <Link
        to={ROUTES.HOME}
        style={{
          textDecoration: 'none',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--accent)',
          letterSpacing: '-0.4px',
        }}
      >
        AdPlatform
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px' }}>
        <Link to={ROUTES.ADVERTISEMENTS} style={{ color: 'var(--text)', textDecoration: 'none' }}>
          Browse Ads
        </Link>

        {isLoggedIn ? (
          <>
            <Link
              to={ROUTES.DASHBOARD}
              style={{ color: 'var(--text)', textDecoration: 'none' }}
            >
              My Dashboard
            </Link>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '14px',
                color: 'var(--text)',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link
              to={ROUTES.LOGIN}
              style={{ color: 'var(--text)', textDecoration: 'none' }}
            >
              Log in
            </Link>
            <Link
              to={ROUTES.REGISTER}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
