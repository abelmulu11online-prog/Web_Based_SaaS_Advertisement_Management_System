/**
 * Navbar.jsx — Minimal, confident navigation.
 * Sticky, auth-aware, mobile-first.
 * i18n: English / አማርኛ via react-i18next
 *
 * Accessibility:
 * - Skip-to-main-content link is always the first focusable element
 * - aria-current="page" on active desktop nav links
 * - Mobile drawer: full-screen overlay with focus trap (useFocusTrap)
 * - Hamburger wired to drawer via aria-controls / aria-expanded
 * - All interactive elements have focus-visible rings
 * - Body scroll locked while mobile drawer is open
 */
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button.jsx'
import { LanguageSelector } from '../ui/LanguageSelector.jsx'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export function Navbar() {
  const { t }        = useTranslation()
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isLoggedIn = !!localStorage.getItem('accessToken')

  const hamburgerRef = useRef(null)
  const drawerRef    = useFocusTrap(open, () => setOpen(false))

  const NAV_LINKS = [
    { to: '/directory',     label: t('nav.discover') },
    { to: '/directory/map', label: t('nav.map')      },
    { to: '/pricing',       label: t('nav.pricing')  },
  ]

  /* ── Scroll detection ─────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  /* ── Close drawer on navigation ─────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setOpen(false)
      setTimeout(() => hamburgerRef.current?.focus(), 50)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  /* ── Prevent body scroll while drawer is open ──────────────────────── */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
    window.location.reload()
  }

  function closeDrawer() {
    setOpen(false)
    setTimeout(() => hamburgerRef.current?.focus(), 50)
  }

  /* ── Shared link style helper ────────────────────────────────────────── */
  function desktopNavClass(active) {
    return [
      'relative text-[13.5px] font-medium px-3.5 py-2 rounded-md',
      'transition-colors duration-150 hover:no-underline select-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
      active
        ? 'text-brand'
        : 'text-ink-2 hover:text-ink hover:bg-surface-2',
    ].join(' ')
  }

  function mobileNavClass(active) {
    return [
      'flex items-center gap-3 px-5 py-3.5',
      'text-[15px] font-medium',
      'border-l-[2.5px] transition-colors hover:no-underline',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
      active
        ? 'text-brand border-brand bg-brand-light/60'
        : 'text-ink border-transparent hover:bg-surface-2',
    ].join(' ')
  }

  return (
    <>
      {/* ── Skip navigation — first focusable element on every page ──── */}
      <a href="#main-content" className="skip-nav">
        {t('nav.skipToMain', 'Skip to main content')}
      </a>

      {/* ── Main header ─────────────────────────────────────────────────── */}
      <header
        className={[
          'sticky top-0 z-50 transition-all duration-200',
          scrolled
            ? 'bg-surface/95 backdrop-blur-sm border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.06)]'
            : 'bg-surface border-b border-border',
        ].join(' ')}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between gap-4">

          {/* Wordmark */}
          <Link
            to="/"
            className="shrink-0 hover:no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-sm"
            aria-label={t('nav.logoLabel')}
          >
            <span className="text-[17px] font-bold tracking-[-0.03em] text-ink leading-none">
              Gebeta
              <span className="text-brand transition-colors duration-150 group-hover:text-brand-hover">
                Pro
              </span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 ml-4" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label }) => {
              const active =
                pathname === to ||
                (to !== '/' && pathname.startsWith(to.split('?')[0]))
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={desktopNavClass(active)}
                >
                  {label}
                  {/* Active underline — positioned at bottom of link */}
                  {active && (
                    <span
                      className="absolute bottom-[5px] left-3.5 right-3.5 h-[2px] rounded-full bg-brand"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Language selector — visible on sm+ */}
            <LanguageSelector className="hidden sm:inline-flex" />

            {/* Search pill — desktop only */}
            <button
              type="button"
              onClick={() => navigate('/directory')}
              aria-label={t('common.search')}
              className="
                hidden lg:flex items-center gap-2 h-8 px-3
                bg-surface-2 border border-border text-ink-3
                rounded-lg cursor-pointer
                hover:border-brand-border hover:text-ink-2
                transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
              "
            >
              <Search size={13} aria-hidden="true" className="shrink-0" />
              <span className="text-[12.5px]">{t('nav.search')}</span>
              <kbd
                className="ml-1 text-[10px] text-ink-4 font-mono bg-surface border border-border px-1 py-0.5 rounded"
                aria-label="keyboard shortcut: slash"
              >
                /
              </kbd>
            </button>

            {/* Auth controls */}
            {isLoggedIn ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<LayoutDashboard size={13} aria-hidden="true" />}
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:inline-flex text-ink-2"
                >
                  {t('nav.dashboard')}
                </Button>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label={t('nav.logout')}
                  title={t('nav.logout')}
                  className="
                    h-8 w-8 flex items-center justify-center
                    border border-border rounded-lg text-ink-3
                    hover:text-danger hover:border-red-200 hover:bg-red-50
                    transition-all duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
                  "
                >
                  <LogOut size={13} aria-hidden="true" />
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
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
                  "
                >
                  {t('nav.login')}
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="rounded-lg text-[13px]"
                >
                  {t('nav.getStarted')}
                </Button>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={open}
              aria-controls="mobile-nav-drawer"
              className="
                md:hidden h-8 w-8 flex items-center justify-center
                border border-border rounded-lg text-ink-2
                hover:bg-surface-2 active:bg-surface-2
                transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
              "
            >
              {open
                ? <X    size={16} aria-hidden="true" />
                : <Menu size={16} aria-hidden="true" />
              }
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {open && (
        <div
          id="mobile-nav-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.mobileMenuLabel', 'Navigation menu')}
          className="
            fixed inset-0 top-[60px] z-40
            bg-surface border-t border-border
            flex flex-col overflow-y-auto
            md:hidden animate-fade-in
          "
        >
          {/* Nav links */}
          <nav className="flex flex-col pt-1 pb-2" aria-label="Mobile navigation">
            {NAV_LINKS.map(({ to, label }) => {
              const active =
                pathname === to ||
                (to !== '/' && pathname.startsWith(to.split('?')[0]))
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={mobileNavClass(active)}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Language selector */}
          <div className="px-5 py-4 border-t border-border">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-2.5">
              {t('lang.select', 'Language')}
            </p>
            <LanguageSelector />
          </div>

          {/* Auth CTAs — pinned to bottom */}
          <div className="mt-auto px-5 py-5 border-t border-border flex flex-col gap-2.5">
            {isLoggedIn ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<LayoutDashboard size={15} aria-hidden="true" />}
                  onClick={() => navigate('/dashboard')}
                >
                  {t('nav.dashboard')}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  icon={<LogOut size={14} aria-hidden="true" />}
                  onClick={handleLogout}
                >
                  {t('nav.logout')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => navigate('/register')}
                >
                  {t('nav.getStartedFree')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => navigate('/login')}
                >
                  {t('nav.login')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
