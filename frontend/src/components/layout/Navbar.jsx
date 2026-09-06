/**
 * Navbar.jsx — Minimal, confident navigation.
 * Sticky, auth-aware, mobile-first.
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Menu, X, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '../ui/Button.jsx'

const NAV_LINKS = [
  { to: '/directory', label: 'Discover' },
  { to: '/directory/map', label: 'Map' },
  { to: '/pricing', label: 'Pricing' },
]

export function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isLoggedIn = !!localStorage.getItem('accessToken')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
    window.location.reload()
  }

  return (
    <>
      {/* ── Main header ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-surface/95 backdrop-blur-md border-b border-border shadow-[0_1px_12px_rgba(0,0,0,0.06)]'
            : 'bg-surface border-b border-border'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[60px] flex items-center gap-6 justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="shrink-0 hover:no-underline group"
            aria-label="GebetaPro — go to homepage"
          >
            <span className="text-[18px] font-bold tracking-tight text-ink">
              Gebeta
              <span className="text-brand transition-colors duration-150 group-hover:text-brand-hover">
                Pro
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label }) => {
              const active =
                pathname === to ||
                (to !== '/' && pathname.startsWith(to.split('?')[0]))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`
                    relative text-[13.5px] font-medium px-3.5 py-2 rounded-md
                    transition-colors duration-150 hover:no-underline select-none
                    ${active
                      ? 'text-brand'
                      : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                    }
                  `}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-1 left-3.5 right-3.5 h-[2px] rounded-full bg-brand" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1 hidden md:block" />

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search shortcut — desktop only */}
            <button
              onClick={() => navigate('/directory')}
              aria-label="Search"
              className="
                hidden lg:flex items-center gap-2 h-8 px-3
                bg-surface-2 border border-border text-ink-3 text-[13px]
                rounded-lg cursor-pointer hover:border-brand-border hover:text-ink-2
                transition-all duration-150
              "
            >
              <Search size={13} className="shrink-0" />
              <span className="text-[12.5px]">Search…</span>
              <kbd className="ml-1 text-[10px] text-ink-4 font-mono bg-surface border border-border px-1 py-0.5 rounded">
                /
              </kbd>
            </button>

            {isLoggedIn ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<LayoutDashboard size={13} />}
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:inline-flex text-ink-2"
                >
                  Dashboard
                </Button>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="
                    h-8 w-8 flex items-center justify-center
                    border border-border rounded-lg text-ink-3
                    hover:text-danger hover:border-red-200 hover:bg-red-50
                    transition-all duration-150
                  "
                  aria-label="Log out"
                >
                  <LogOut size={13} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="
                    hidden sm:block text-[13.5px] font-medium
                    text-ink-2 hover:text-ink hover:no-underline
                    px-3 py-1.5 rounded-md hover:bg-surface-2
                    transition-colors duration-150
                  "
                >
                  Log in
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="rounded-lg text-[13px]"
                >
                  Get started
                </Button>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="
                md:hidden h-8 w-8 flex items-center justify-center
                border border-border rounded-lg text-ink-2
                hover:bg-surface-2 transition-colors duration-150
              "
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      {open && (
        <div
          className="
            fixed inset-0 top-[60px] z-40
            bg-surface border-t border-border
            flex flex-col overflow-y-auto md:hidden
            animate-fade-in
          "
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Nav links */}
          <nav className="flex flex-col py-2">
            {NAV_LINKS.map(({ to, label }) => {
              const active =
                pathname === to ||
                (to !== '/' && pathname.startsWith(to.split('?')[0]))
              return (
                <Link
                  key={to}
                  to={to}
                  className={`
                    flex items-center px-5 py-3.5
                    text-[15px] font-medium
                    border-l-2 transition-colors hover:no-underline
                    ${active
                      ? 'text-brand border-brand bg-brand-light/50'
                      : 'text-ink border-transparent hover:bg-surface-2 hover:text-ink'
                    }
                  `}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Auth CTA */}
          <div className="mt-auto p-5 border-t border-border flex flex-col gap-2.5">
            {isLoggedIn ? (
              <>
                <Button
                  variant="primary"
                  fullWidth
                  icon={<LayoutDashboard size={14} />}
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  icon={<LogOut size={14} />}
                  onClick={handleLogout}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => navigate('/register')}
                >
                  Get started free
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate('/login')}
                >
                  Log in
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
