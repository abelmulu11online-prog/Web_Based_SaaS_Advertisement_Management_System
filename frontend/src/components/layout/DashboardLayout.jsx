import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard,
  User, Wrench, FolderOpen, FileText, Award,
  LogOut, X, Menu, Bell, Link2, Clock
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../../services/profiles.service.js'

const NAV = [
  { to: '/dashboard',              label: 'Overview',      icon: <LayoutDashboard size={15} />, end: true },
  { to: '/dashboard/profile',      label: 'My Profile',    icon: <User size={15} /> },
  { to: '/dashboard/subscription', label: 'Subscription',  icon: <CreditCard size={15} /> },
]

const PROFILE_NAV = [
  { to: '/dashboard/profile/services',     label: 'Services',       icon: <Wrench size={14} /> },
  { to: '/dashboard/profile/portfolio',    label: 'Portfolio',      icon: <FolderOpen size={14} /> },
  { to: '/dashboard/profile/social-links', label: 'Social Links',   icon: <Link2 size={14} /> },
  { to: '/dashboard/profile/hours',        label: 'Business Hours', icon: <Clock size={14} /> },
  { to: '/dashboard/profile/posts',        label: 'Posts',          icon: <FileText size={14} /> },
  { to: '/dashboard/profile/achievements', label: 'Achievements',   icon: <Award size={14} /> },
]

const TYPE_ICON = {
  new_review:      '⭐',
  review_reply:    '💬',
  profile_verified: '✅',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

const isAuthed = () => !!localStorage.getItem('accessToken')

function NotificationBell() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
    enabled: isAuthed(),
    refetchInterval: 30000,
    retry: false,
  })

  const markAll = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markOne = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  const unread = data?.unread_count || 0
  const notifications = data?.notifications || []

  function handleOpen() {
    setOpen(v => !v)
    if (!open && unread > 0) {
      // Mark all read when opening
      markAll.mutate()
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-1.5 text-ink-3 hover:text-ink transition-colors rounded-lg hover:bg-surface-2"
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
            <span className="text-[13px] font-bold text-ink">Notifications</span>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-3 hover:text-ink transition-colors text-[12px] w-5 h-5 flex items-center justify-center rounded hover:bg-border"
            >
              <X size={12} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={28} className="mx-auto text-ink-4 mb-2" />
                <p className="text-[13px] text-ink-3">No notifications yet</p>
                <p className="text-[12px] text-ink-4 mt-0.5">We'll notify you when someone reviews your profile</p>
              </div>
            ) : (
              notifications.map(n => (
                <a
                  key={n.id}
                  href={n.link || '#'}
                  onClick={() => {
                    if (!n.is_read) markOne.mutate(n.id)
                    setOpen(false)
                  }}
                  className={`flex gap-3 px-4 py-3 hover:bg-surface-2 transition-colors hover:no-underline ${
                    !n.is_read ? 'bg-brand-light/40' : ''
                  }`}
                >
                  {/* Type icon */}
                  <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0 text-base">
                    {TYPE_ICON[n.type] || '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[12.5px] font-medium text-ink leading-snug">{n.title}</p>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-brand rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[11.5px] text-ink-3 mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
                    )}
                    <p className="text-[11px] text-ink-4 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </a>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-surface-2 text-center">
              <button
                onClick={() => { markAll.mutate(); setOpen(false) }}
                className="text-[12px] text-brand hover:underline"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
          Gebeta<span className="text-brand">Pro</span>
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

          <NotificationBell />
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
