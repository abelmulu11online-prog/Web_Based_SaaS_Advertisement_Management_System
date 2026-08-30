import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Plus, Menu, X, LayoutDashboard, LogOut, CreditCard } from 'lucide-react'
import { Button } from '../ui/Button.jsx'

const NAV_LINKS = [
  { to: '/ads', label: 'Browse' },
  { to: '/ads?category=Services', label: 'Services' },
  { to: '/ads?category=Jobs', label: 'Jobs' },
  { to: '/pricing', label: 'Pricing' },
]

export function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isLoggedIn = !!localStorage.getItem('accessToken')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 6)
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
      <header className={`sticky top-0 z-50 bg-surface border-b border-border transition-shadow duration-150 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4 justify-between">

          {/* Logo */}
          <Link to="/" className="text-[17px] font-bold text-ink tracking-tight shrink-0 hover:no-underline">
            Gebeta<span className="text-brand">Market</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label }) => {
              const active = pathname === to || (to !== '/' && pathname.startsWith(to.split('?')[0]))
              return (
                <Link key={to} to={to} className={`text-[13.5px] font-medium px-3 py-1.5 rounded transition-colors duration-150 hover:no-underline ${active ? 'text-brand bg-brand-light' : 'text-ink-2 hover:text-ink hover:bg-surface-2'}`}>
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Search shortcut — desktop */}
          <button
            onClick={() => navigate('/ads')}
            className="hidden md:flex items-center gap-2 bg-surface-2 border border-border text-ink-3 text-[13px] rounded px-3 py-1.5 flex-1 max-w-[240px] cursor-pointer transition-colors duration-150 hover:border-border-2 hover:text-ink-2"
          >
            <Search size={13} className="shrink-0" />
            <span>Search listings…</span>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <>
                <Button
                  variant="primary" size="sm"
                  icon={<Plus size={13} />}
                  onClick={() => navigate('/dashboard/advertisements/new')}
                >
                  <span className="hidden sm:inline">Post Ad</span>
                </Button>
                <Button
                  variant="ghost" size="sm"
                  icon={<LayoutDashboard size={13} />}
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:inline-flex"
                >
                  Dashboard
                </Button>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out"
                  className="h-8 w-8 flex items-center justify-center border border-border rounded text-ink-3 hover:text-danger hover:border-red-300 transition-colors duration-150"
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-[13.5px] font-medium text-ink-2 hover:text-ink hover:no-underline px-2 py-1">
                  Log in
                </Link>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Sign up
                </Button>
              </>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="md:hidden h-8 w-8 flex items-center justify-center border border-border rounded text-ink-2 transition-colors hover:bg-surface-2"
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 top-14 z-40 bg-surface border-t border-border flex flex-col overflow-y-auto md:hidden">
          <div className="flex flex-col divide-y divide-border">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="flex items-center px-5 py-3.5 text-[15px] font-medium text-ink hover:bg-surface-2 hover:no-underline transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <div className="p-4 flex flex-col gap-2.5 border-t border-border mt-2">
            {isLoggedIn ? (
              <>
                <Button variant="primary" fullWidth icon={<Plus size={14} />} onClick={() => navigate('/dashboard/advertisements/new')}>Post Advertisement</Button>
                <Button variant="secondary" fullWidth icon={<LayoutDashboard size={14} />} onClick={() => navigate('/dashboard')}>Dashboard</Button>
                <Button variant="ghost" fullWidth icon={<LogOut size={14} />} onClick={handleLogout}>Log out</Button>
              </>
            ) : (
              <>
                <Button variant="primary" fullWidth onClick={() => navigate('/register')}>Sign up free</Button>
                <Button variant="secondary" fullWidth onClick={() => navigate('/login')}>Log in</Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
