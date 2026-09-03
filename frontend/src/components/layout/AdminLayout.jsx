/**
 * AdminLayout.jsx — Responsive shell for all admin pages.
 * Sidebar on desktop, drawer on mobile.
 */
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Megaphone, CreditCard,
  Tag, BarChart2, TrendingUp, LogOut, Menu, X, ChevronLeft,
} from 'lucide-react'

const NAV = [
  { to: '/admin',              label: 'Overview',       icon: <LayoutDashboard size={15} />, end: true },
  { to: '/admin/users',        label: 'Users',          icon: <Users size={15} /> },
  { to: '/admin/ads',          label: 'Advertisements', icon: <Megaphone size={15} /> },
  { to: '/admin/categories',   label: 'Categories',     icon: <Tag size={15} /> },
  { to: '/admin/subscriptions',label: 'Subscriptions',  icon: <CreditCard size={15} /> },
  { to: '/admin/revenue',      label: 'Revenue',        icon: <TrendingUp size={15} /> },
  { to: '/admin/analytics',    label: 'Analytics',      icon: <BarChart2 size={15} /> },
]

function SidebarContent({ onClose }) {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
    window.location.reload()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-border">
        <NavLink to="/" className="text-[16px] font-bold text-ink tracking-tight hover:no-underline">
          Gebeta<span className="text-brand">Market</span>
        </NavLink>
        <p className="text-[10px] text-ink-3 font-semibold uppercase tracking-widest mt-0.5">
          Admin Panel
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium transition-colors hover:no-underline ${
                isActive
                  ? 'bg-brand-light text-brand'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="px-3 py-4 border-t border-border flex flex-col gap-0.5">
        <NavLink
          to="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors hover:no-underline"
        >
          <ChevronLeft size={15} />
          Back to Dashboard
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium text-ink-2 hover:bg-red-50 hover:text-danger transition-colors w-full text-left"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </div>
  )
}

export function AdminLayout({ children, title }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-surface border-r border-border sticky top-0 h-screen">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
          <div className="w-56 bg-surface h-full shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-[15px] font-bold text-ink">Admin</span>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-3 hover:text-ink"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-surface border-b border-border px-4 sm:px-6 h-14 flex items-center gap-3 sticky top-0 z-40">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden text-ink-2 hover:text-ink"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <h1 className="text-[15px] font-semibold text-ink flex-1 truncate">{title}</h1>
          <span className="text-[11px] font-semibold bg-danger text-white px-2 py-0.5 rounded uppercase tracking-widest shrink-0">
            Admin
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
