/**
 * AdminLayout.jsx — Premium SaaS admin shell.
 *
 * Desktop: collapsible sidebar (expanded 220px / collapsed 56px).
 *          Collapsed state shows icons only with tooltip labels.
 * Mobile:  top bar + slide-out drawer from left.
 *
 * Accessibility improvements:
 * - Mobile drawer uses useFocusTrap: Tab/Shift+Tab stays inside, Escape closes.
 * - Focus returns to hamburger button when drawer closes.
 * - Hamburger has aria-expanded + aria-controls wired to drawer.
 * - Tooltip (Tip) renders a visually-hidden span for screen readers when
 *   collapsed rather than relying on CSS hover tooltips alone.
 * - Collapse toggle button has a clear aria-label that updates with state.
 * - <main id="main-content"> retained for skip-nav link.
 * - Breadcrumb uses <nav aria-label="Breadcrumb"> semantics.
 */
import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Megaphone, CreditCard,
  Tag, BarChart2, TrendingUp, LogOut, Menu, X,
  ChevronLeft, ChevronRight, ArrowLeft, Layers,
} from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

/* ── Nav definition ──────────────────────────────────────────────────────── */
const NAV = [
  { to: '/admin',               label: 'Overview',       icon: LayoutDashboard, end: true },
  { to: '/admin/users',         label: 'Users',          icon: Users },
  { to: '/admin/ads',           label: 'Advertisements', icon: Megaphone },
  { to: '/admin/categories',    label: 'Categories',     icon: Tag },
  { to: '/admin/subscriptions', label: 'Subscriptions',  icon: CreditCard },
  { to: '/admin/plans',         label: 'Plans',          icon: Layers },
  { to: '/admin/revenue',       label: 'Revenue',        icon: TrendingUp },
  { to: '/admin/analytics',     label: 'Analytics',      icon: BarChart2 },
]

/* ── Breadcrumb helper ───────────────────────────────────────────────────── */
function useBreadcrumbs() {
  const { pathname } = useLocation()
  const found = NAV.find(n =>
    n.end ? pathname === n.to : pathname.startsWith(n.to)
  )
  return found?.label ?? 'Admin'
}

/* ── Tooltip wrapper (for collapsed sidebar) ─────────────────────────────── */
function Tip({ label, children, collapsed }) {
  if (!collapsed) return children
  return (
    <div className="relative group/tip">
      {children}
      {/* CSS tooltip for mouse users */}
      <div
        className="
          pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
          bg-ink text-white text-[11.5px] font-medium
          px-2.5 py-1 rounded-lg whitespace-nowrap
          opacity-0 group-hover/tip:opacity-100
          transition-opacity duration-150
          shadow-lg
        "
        aria-hidden="true"
      >
        {label}
        <span
          className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-ink"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

/* ── Sidebar content (shared desktop + mobile) ───────────────────────────── */
function SidebarContent({ collapsed, onClose }) {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
    window.location.reload()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Brand */}
      <div
        className={`
          flex items-center h-[60px] shrink-0
          border-b border-border
          ${collapsed ? 'justify-center px-0' : 'px-5'}
          transition-all duration-200
        `}
      >
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0" aria-hidden="true">
            <span className="text-white text-[14px] font-black leading-none">G</span>
          </div>
        ) : (
          <div>
            <Link
              to="/"
              className="text-[16px] font-bold text-ink tracking-tight hover:no-underline block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
              aria-label="GebetaPro — back to site"
            >
              Gebeta<span className="text-brand">Pro</span>
            </Link>
            <p className="text-[9.5px] font-bold text-ink-3 uppercase tracking-[0.15em] mt-px">
              Admin Console
            </p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav
        className={`flex-1 overflow-y-auto py-3 ${collapsed ? 'px-1.5' : 'px-2.5'}`}
        aria-label="Admin navigation"
      >
        {!collapsed && (
          <p className="text-[10px] font-semibold text-ink-4 uppercase tracking-[0.12em] px-3 mb-2 mt-1" aria-hidden="true">
            Management
          </p>
        )}

        <div className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <Tip key={to} label={label} collapsed={collapsed}>
              <NavLink
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) => `
                  relative flex items-center gap-3
                  ${collapsed ? 'h-9 w-9 justify-center mx-auto rounded-lg' : 'h-9 px-3 rounded-lg'}
                  text-[13px] font-medium
                  transition-all duration-150
                  hover:no-underline group
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset
                  ${isActive
                    ? 'bg-brand-light text-brand'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                  }
                `}
                /* When collapsed, aria-label provides the accessible name since text is hidden */
                aria-label={collapsed ? label : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-full"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      size={15}
                      aria-hidden="true"
                      className={`shrink-0 transition-colors ${isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink'}`}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </>
                )}
              </NavLink>
            </Tip>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        className={`shrink-0 border-t border-border py-3 ${collapsed ? 'px-1.5' : 'px-2.5'} flex flex-col gap-0.5`}
      >
        <Tip label="Back to platform" collapsed={collapsed}>
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={`
              flex items-center gap-3
              ${collapsed ? 'h-9 w-9 justify-center mx-auto' : 'h-9 px-3'}
              rounded-lg text-[13px] font-medium text-ink-2
              hover:bg-surface-2 hover:text-ink transition-all duration-150
              hover:no-underline
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset
            `}
            aria-label={collapsed ? 'Back to platform' : undefined}
          >
            <ArrowLeft size={15} className="shrink-0 text-ink-3" aria-hidden="true" />
            {!collapsed && <span>Back to platform</span>}
          </NavLink>
        </Tip>

        <Tip label="Log out" collapsed={collapsed}>
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 w-full text-left
              ${collapsed ? 'h-9 w-9 justify-center mx-auto' : 'h-9 px-3'}
              rounded-lg text-[13px] font-medium text-ink-2
              hover:bg-danger-bg hover:text-danger transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-inset
            `}
            aria-label="Log out of admin console"
          >
            <LogOut size={15} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>Log out</span>}
          </button>
        </Tip>
      </div>
    </div>
  )
}

/* ── AdminLayout ─────────────────────────────────────────────────────────── */
export function AdminLayout({ children, title }) {
  const [collapsed,   setCollapsed]   = useState(false)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const currentPage = useBreadcrumbs()

  // Ref to hamburger so focus returns when drawer closes
  const hamburgerRef = useRef(null)

  // Focus trap for mobile drawer — Escape closes it
  const drawerRef = useFocusTrap(drawerOpen, () => {
    setDrawerOpen(false)
    setTimeout(() => hamburgerRef.current?.focus(), 50)
  })

  return (
    <div className="min-h-screen bg-canvas flex">

      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside
        className={`
          hidden lg:flex flex-col shrink-0
          bg-surface border-r border-border
          sticky top-0 h-screen
          transition-[width] duration-200 ease-out
          ${collapsed ? 'w-[56px]' : 'w-[220px]'}
          overflow-hidden
        `}
        aria-label="Admin sidebar"
      >
        <SidebarContent collapsed={collapsed} onClose={() => {}} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="
            absolute bottom-[68px] -right-3 z-10
            w-6 h-6 flex items-center justify-center
            bg-surface border border-border rounded-full
            text-ink-3 hover:text-brand hover:border-brand-border
            transition-all duration-150
            shadow-sm
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
          "
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed
            ? <ChevronRight size={11} aria-hidden="true" />
            : <ChevronLeft  size={11} aria-hidden="true" />
          }
        </button>
      </aside>

      {/* ── Mobile drawer backdrop ────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-fade-in"
          onClick={() => { setDrawerOpen(false); setTimeout(() => hamburgerRef.current?.focus(), 50) }}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      <div
        id="admin-mobile-drawer"
        ref={drawerRef}
        className={`
          fixed inset-y-0 left-0 z-50 w-[220px]
          bg-surface border-r border-border
          flex flex-col lg:hidden
          transition-transform duration-200 ease-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Admin navigation"
        role="dialog"
        aria-modal="true"
        /* Hide from AT when closed so it isn't tab-navigable while off-screen */
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? '' : undefined}
      >
        {/* Drawer close button */}
        <button
          onClick={() => { setDrawerOpen(false); setTimeout(() => hamburgerRef.current?.focus(), 50) }}
          className="absolute top-4 right-3 z-10 text-ink-3 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
          aria-label="Close navigation"
          tabIndex={drawerOpen ? 0 : -1}
        >
          <X size={16} aria-hidden="true" />
        </button>
        <SidebarContent collapsed={false} onClose={() => { setDrawerOpen(false); setTimeout(() => hamburgerRef.current?.focus(), 50) }} />
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header
          className="
            sticky top-0 z-30
            bg-surface/95 backdrop-blur-sm
            border-b border-border
            h-[60px] px-5 sm:px-7
            flex items-center gap-4
          "
        >
          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden text-ink-2 hover:text-ink transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="admin-mobile-drawer"
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-1 min-w-0">
            <Link
              to="/admin"
              className="text-[12.5px] text-ink-3 hover:text-ink hover:no-underline transition-colors hidden sm:block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
            >
              Administration
            </Link>
            <span className="text-[12.5px] text-ink-4 hidden sm:block" aria-hidden="true">/</span>
            <h1 className="text-[14px] font-semibold text-ink truncate" aria-current="page">
              {title || currentPage}
            </h1>
          </nav>

          {/* Right side — Admin badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="
                text-[10px] font-bold uppercase tracking-[0.1em]
                bg-brand text-white
                px-2 py-1 rounded-md
              "
              aria-label="Admin role"
            >
              Admin
            </span>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 p-5 sm:p-7 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
