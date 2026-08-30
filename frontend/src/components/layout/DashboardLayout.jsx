import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Megaphone, Plus, CreditCard,
  User, ShoppingBag, Wrench, FolderOpen, FileText, Award,
  LogOut, X, Menu, Bell
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/dashboard',                    label: 'Overview',      icon: <LayoutDashboard size={15} />, end: true },
  { to: '/dashboard/profile',            label: 'My Profile',    icon: <User size={15} /> },
  { to: '/dashboard/advertisements',     label: 'My Listings',   icon: <Megaphone size={15} /> },
  { to: '/dashboard/advertisements/new', label: 'Post Ad',       icon: <Plus size={15} /> },
  { to: '/dashboard/subscription',       label: 'Subscription',  icon: <CreditCard size={15} /> },
]

const PROFILE_NAV = [
  { to: '/dashboard/profile/products',     label: 'Products',      icon: <ShoppingBag size={14} /> },
  { to: '/dashboard/profile/services',     label: 'Services',      icon: <Wrench size={14} /> },
  { to: '/dashboard/profile/portfolio',    label: 'Portfolio',     icon: <FolderOpen size={14} /> },
  { to: '/dashboard/profile/posts',        label: 'Posts',         icon: <FileText size={14} /> },
  { to: '/dashboard/profile/achievements', label: 'Achievements',  icon: <Award size={14} /> },
]

export function DashboardLayout({ children, title }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
    window.location.reload()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <NavLink to="/" className="text-[16px] font-bold text-ink tracking-tight hover:no-underline">
          Gebeta<span className="text-brand">Market</span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto" aria-label="Dashboard navigation">
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium transition-colors duration-150 hover:no-underline ${
                isActive ? 'bg-brand-light text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
        {/* Profile content sub-nav */}
        <div className="pt-2 pb-1 px-3">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-1">Profile Content</p>
        </div>
        {PROFILE_NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-1.5 rounded text-[13px] font-medium transition-colors duration-150 hover:no-underline ${
                isActive ? 'bg-brand-light text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border flex flex-col gap-0.5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium text-ink-2 hover:bg-red-50 hover:text-danger transition-colors duration-150 w-full text-left"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-surface border-r border-border sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="w-56 bg-surface h-full shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-[15px] font-bold text-ink">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="text-ink-3 hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-surface border-b border-border px-4 sm:px-6 h-14 flex items-center gap-3 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-ink-2 hover:text-ink"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <h1 className="text-[15px] font-semibold text-ink flex-1">{title}</h1>

          <button className="text-ink-3 hover:text-ink transition-colors" aria-label="Notifications">
            <Bell size={16} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
