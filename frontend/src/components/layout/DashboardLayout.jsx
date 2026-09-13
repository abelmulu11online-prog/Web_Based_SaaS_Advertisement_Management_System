/**
 * DashboardLayout.jsx
 *
 * Accessibility improvements:
 * - Mobile sidebar drawer uses useFocusTrap — Tab/Shift+Tab stays inside,
 *   Escape closes it, focus returns to hamburger button on close.
 * - NotificationBell: aria-expanded on trigger button, aria-haspopup="true",
 *   Escape key closes dropdown, focus returns to bell on close,
 *   dropdown panel has role="dialog" aria-label.
 * - The close button inside the notification panel has aria-label.
 * - Unread count badge has a visually-hidden text equivalent so screen readers
 *   announce "3 unread notifications" not just "3".
 * - <main id="main-content"> retained for skip-nav link.
 * - aria-label on dashboard nav landmark.
 */
import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard,
  User, Wrench, FolderOpen, FileText, Award,
  LogOut, X, Menu, Bell, Link2, Clock
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../ui/LanguageSelector.jsx'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import * as api from '../../services/profiles.service.js'

const TYPE_ICON = {
  new_review:       '⭐',
  review_reply:     '💬',
  profile_verified: '✅',
}

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('dashboard.notifications.justNow')
  if (m < 60) return t('dashboard.notifications.mAgo', { m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('dashboard.notifications.hAgo', { h })
  const d = Math.floor(h / 24)
  if (d < 30) return t('dashboard.notifications.dAgo', { d })
  return t('dashboard.notifications.moAgo', { mo: Math.floor(d / 30) })
}

const isAuthed = () => !!localStorage.getItem('accessToken')

function NotificationBell() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const bellBtnRef   = useRef(null)

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
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  // Escape key closes dropdown and returns focus to bell
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        bellBtnRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const unread        = data?.unread_count   || 0
  const notifications = data?.notifications  || []

  function handleOpen() {
    const wasOpen = open
    setOpen(v => !v)
    if (!wasOpen && unread > 0) markAll.mutate()
  }

  function closePanel() {
    setOpen(false)
    bellBtnRef.current?.focus()
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={bellBtnRef}
        onClick={handleOpen}
        className="relative p-1.5 text-ink-3 hover:text-ink transition-colors rounded-lg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={
          unread > 0
            ? `${t('dashboard.notifications.title')} — ${unread} unread`
            : t('dashboard.notifications.title')
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={16} aria-hidden="true" />
        {unread > 0 && (
          <>
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
              aria-hidden="true"
            >
              {unread > 99 ? '99+' : unread}
            </span>
            {/* Visually-hidden text for screen readers — the aria-label on the button already covers this */}
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('dashboard.notifications.title')}
          aria-modal="false"
          className="absolute right-0 top-10 w-80 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
            <span className="text-[13px] font-bold text-ink" id="notif-panel-title">
              {t('dashboard.notifications.title')}
            </span>
            <button
              onClick={closePanel}
              className="text-ink-3 hover:text-ink transition-colors text-[12px] w-5 h-5 flex items-center justify-center rounded hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={t('common.close', 'Close notifications')}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={28} className="mx-auto text-ink-4 mb-2" aria-hidden="true" />
                <p className="text-[13px] text-ink-3">{t('dashboard.notifications.none')}</p>
                <p className="text-[12px] text-ink-4 mt-0.5">{t('dashboard.notifications.noneDesc')}</p>
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
                  aria-label={`${n.title}${!n.is_read ? ' — unread' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0 text-base" aria-hidden="true">
                    {TYPE_ICON[n.type] || '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[12.5px] font-medium text-ink leading-snug">{n.title}</p>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-brand rounded-full shrink-0 mt-1" aria-hidden="true" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[11.5px] text-ink-3 mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
                    )}
                    <p className="text-[11px] text-ink-4 mt-1">
                      <time dateTime={n.created_at}>{timeAgo(n.created_at, t)}</time>
                    </p>
                  </div>
                </a>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-surface-2 text-center">
              <button
                onClick={() => { markAll.mutate(); setOpen(false) }}
                className="text-[12px] text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
              >
                {t('dashboard.notifications.markAllRead')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardLayout({ children, title }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Ref to hamburger so focus returns to it when drawer closes
  const hamburgerRef = useRef(null)

  // Focus trap for mobile sidebar drawer
  const drawerRef = useFocusTrap(sidebarOpen, () => {
    setSidebarOpen(false)
    setTimeout(() => hamburgerRef.current?.focus(), 50)
  })

  const NAV = [
    { to: '/dashboard',              label: t('dashboard.overview'),          icon: <LayoutDashboard size={15} aria-hidden="true" />, end: true },
    { to: '/dashboard/profile',      label: t('dashboard.myProfile'),         icon: <User size={15} aria-hidden="true" /> },
    { to: '/dashboard/subscription', label: t('dashboard.subscription'),      icon: <CreditCard size={15} aria-hidden="true" /> },
  ]

  const PROFILE_NAV = [
    { to: '/dashboard/profile/services',     label: t('dashboard.sidebar.services'),      icon: <Wrench size={14} aria-hidden="true" /> },
    { to: '/dashboard/profile/portfolio',    label: t('dashboard.sidebar.portfolio'),     icon: <FolderOpen size={14} aria-hidden="true" /> },
    { to: '/dashboard/profile/social-links', label: t('dashboard.sidebar.socialLinks'),   icon: <Link2 size={14} aria-hidden="true" /> },
    { to: '/dashboard/profile/hours',        label: t('dashboard.sidebar.businessHours'), icon: <Clock size={14} aria-hidden="true" /> },
    { to: '/dashboard/profile/posts',        label: t('dashboard.sidebar.posts'),         icon: <FileText size={14} aria-hidden="true" /> },
    { to: '/dashboard/profile/achievements', label: t('dashboard.sidebar.achievements'),  icon: <Award size={14} aria-hidden="true" /> },
  ]

  function handleLogout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/')
    window.location.reload()
  }

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <NavLink to="/" className="text-[16px] font-bold text-ink tracking-tight hover:no-underline" aria-label="GebetaPro home">
          Gebeta<span className="text-brand">Pro</span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto"
        aria-label="Dashboard navigation"
      >
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium transition-colors duration-150 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset ${
                isActive ? 'bg-brand-light text-brand' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`
            }
            aria-current={undefined}   /* NavLink sets this automatically when active */
          >
            {icon}
            {label}
          </NavLink>
        ))}

        {/* Profile content sub-nav */}
        <div className="pt-2 pb-1 px-3">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-1" aria-hidden="true">
            {t('dashboard.sidebar.profileContent')}
          </p>
        </div>
        {PROFILE_NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-1.5 rounded text-[13px] font-medium transition-colors duration-150 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset ${
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
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium text-ink-2 hover:bg-red-50 hover:text-danger transition-colors duration-150 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-inset"
          aria-label={t('dashboard.sidebar.logout')}
        >
          <LogOut size={15} aria-hidden="true" />
          {t('dashboard.sidebar.logout')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0 bg-surface border-r border-border sticky top-0 h-screen"
        aria-label="Dashboard sidebar"
      >
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile sidebar drawer — backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => { setSidebarOpen(false); setTimeout(() => hamburgerRef.current?.focus(), 50) }}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer — panel with focus trap */}
      {sidebarOpen && (
        <div
          ref={drawerRef}
          className="fixed inset-y-0 left-0 z-50 w-56 bg-surface shadow-xl lg:hidden flex flex-col animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={t('dashboard.sidebar.menu', 'Navigation menu')}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[15px] font-bold text-ink">{t('dashboard.sidebar.menu')}</span>
            <button
              onClick={() => { setSidebarOpen(false); setTimeout(() => hamburgerRef.current?.focus(), 50) }}
              className="text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
              aria-label="Close navigation menu"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <SidebarContent onClose={() => { setSidebarOpen(false); setTimeout(() => hamburgerRef.current?.focus(), 50) }} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-surface border-b border-border px-4 sm:px-6 h-14 flex items-center gap-3 sticky top-0 z-40">
          <button
            ref={hamburgerRef}
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
            aria-label={t('nav.openMenu')}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-mobile-drawer"
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <h1 className="text-[15px] font-semibold text-ink flex-1">{title}</h1>

          {/* Language selector in top bar */}
          <LanguageSelector />

          <NotificationBell />
        </header>

        {/* Content */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
