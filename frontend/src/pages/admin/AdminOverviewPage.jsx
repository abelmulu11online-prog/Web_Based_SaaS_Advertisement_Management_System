/**
 * AdminOverviewPage.jsx — Admin dashboard with real platform statistics.
 * All data comes from /api/admin/stats (PostgreSQL-backed).
 */
import { Link } from 'react-router-dom'
import {
  Users, Megaphone, CreditCard, TrendingUp,
  ArrowRight, AlertCircle, CheckCircle2, Clock,
  PauseCircle, Archive, FileText, Tag,
} from 'lucide-react'
import { AdminLayout } from '../../components/layout/AdminLayout.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { useAdminStats, useAdminRevenue } from '../../features/admin/hooks/useAdmin.js'

function StatCard({ label, value, sub, icon, color = 'text-brand', loading, to }) {
  const inner = (
    <div className="bg-surface border border-border rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      {loading
        ? <Skeleton className="h-7 w-20" />
        : <div className="text-2xl font-bold text-ink tracking-tight">{value ?? '—'}</div>}
      {sub && !loading && <p className="text-[12px] text-ink-3 mt-1">{sub}</p>}
    </div>
  )
  if (to) {
    return (
      <Link to={to} className="hover:no-underline hover:scale-[1.01] transition-transform block h-full">
        {inner}
      </Link>
    )
  }
  return inner
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3.5 hover:bg-surface-2 hover:no-underline transition-colors group"
    >
      <div>
        <p className="text-[13.5px] font-semibold text-ink">{label}</p>
        <p className="text-[12px] text-ink-3 mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={14} className="text-ink-3 group-hover:text-brand transition-colors shrink-0" />
    </Link>
  )
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading, error } = useAdminStats()
  const { data: revenue, isLoading: revLoading } = useAdminRevenue()

  const fmt  = (n) => (n != null ? Number(n).toLocaleString() : '—')
  const fmtC = (n) => (n != null ? `ETB ${Number(n).toLocaleString()}` : '—')

  if (error) {
    return (
      <AdminLayout title="Overview">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={32} className="text-danger" />
          <p className="text-ink-2 text-sm">
            {error?.response?.data?.message || 'Failed to load dashboard statistics.'}
          </p>
          {error?.response?.status === 403 && (
            <p className="text-[12px] text-ink-3">Your account does not have admin access.</p>
          )}
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Overview">
      <div className="flex flex-col gap-8">

        {/* ── Users ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Users</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total users"
              value={fmt(stats?.total_users)}
              sub={`+${fmt(stats?.new_users_7d)} this week`}
              icon={<Users size={15} />}
              loading={isLoading}
              to="/admin/users"
            />
            <StatCard
              label="Active users"
              value={fmt(stats?.active_users)}
              icon={<CheckCircle2 size={15} />}
              color="text-success"
              loading={isLoading}
              to="/admin/users?status=ACTIVE"
            />
            <StatCard
              label="Suspended"
              value={fmt(stats?.suspended_users)}
              icon={<AlertCircle size={15} />}
              color="text-danger"
              loading={isLoading}
              to="/admin/users?status=SUSPENDED"
            />
            <StatCard
              label="New (30 days)"
              value={fmt(stats?.new_users_30d)}
              icon={<Users size={15} />}
              color="text-brand"
              loading={isLoading}
            />
          </div>
        </section>

        {/* ── Advertisements ────────────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Advertisements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total ads"  value={fmt(stats?.total_ads)}      icon={<Megaphone size={15} />}    loading={isLoading} to="/admin/ads" />
            <StatCard label="Published"  value={fmt(stats?.published_ads)}  icon={<CheckCircle2 size={15} />} color="text-success" loading={isLoading} to="/admin/ads?status=PUBLISHED" />
            <StatCard label="Draft"      value={fmt(stats?.draft_ads)}      icon={<FileText size={15} />}     color="text-ink-3"  loading={isLoading} to="/admin/ads?status=DRAFT" />
            <StatCard label="Paused"     value={fmt(stats?.paused_ads)}     icon={<PauseCircle size={15} />}  color="text-warning" loading={isLoading} to="/admin/ads?status=PAUSED" />
            <StatCard label="Expired"    value={fmt(stats?.expired_ads)}    icon={<Clock size={15} />}        color="text-ink-3"  loading={isLoading} to="/admin/ads?status=EXPIRED" />
            <StatCard label="Archived"   value={fmt(stats?.archived_ads)}   icon={<Archive size={15} />}      color="text-ink-3"  loading={isLoading} to="/admin/ads?status=ARCHIVED" />
          </div>
        </section>

        {/* ── Subscriptions & Revenue ────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Subscriptions & Revenue</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Active subs"
              value={fmt(stats?.active_subscriptions)}
              sub="paid plans"
              icon={<CreditCard size={15} />}
              loading={isLoading}
              to="/admin/subscriptions?status=ACTIVE"
            />
            <StatCard
              label="Total revenue"
              value={fmtC(stats?.total_revenue_etb)}
              sub={`${fmt(stats?.total_payments)} payments`}
              icon={<TrendingUp size={15} />}
              color="text-success"
              loading={isLoading}
              to="/admin/revenue"
            />
            <StatCard
              label="Revenue (30d)"
              value={fmtC(revenue?.current_month_etb)}
              sub="current month"
              icon={<TrendingUp size={15} />}
              color="text-brand"
              loading={isLoading || revLoading}
              to="/admin/revenue"
            />
            <StatCard
              label="Pending payments"
              value={fmt(stats?.pending_payments)}
              icon={<Clock size={15} />}
              color="text-warning"
              loading={isLoading}
            />
          </div>
        </section>

        {/* ── Categories ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Catalogue</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Categories"
              value={fmt(stats?.active_categories)}
              sub={`${fmt(stats?.total_categories)} total`}
              icon={<Tag size={15} />}
              loading={isLoading}
              to="/admin/categories"
            />
            <StatCard
              label="New ads (7d)"
              value={fmt(stats?.new_ads_7d)}
              icon={<Megaphone size={15} />}
              loading={isLoading}
            />
            <StatCard
              label="Expired subs"
              value={fmt(stats?.expired_subscriptions)}
              icon={<Clock size={15} />}
              color="text-ink-3"
              loading={isLoading}
              to="/admin/subscriptions?status=EXPIRED"
            />
            <StatCard
              label="Failed payments"
              value={fmt(stats?.failed_payments)}
              icon={<AlertCircle size={15} />}
              color="text-danger"
              loading={isLoading}
            />
          </div>
        </section>

        {/* ── Quick links ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Manage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <QuickLink to="/admin/users"         label="User Management"        desc="View, search, suspend or promote users" />
            <QuickLink to="/admin/ads"            label="Advertisement Moderation" desc="Review and moderate all listings" />
            <QuickLink to="/admin/categories"     label="Category Management"    desc="Create, edit, toggle categories" />
            <QuickLink to="/admin/subscriptions"  label="Subscriptions"          desc="All user subscription records" />
            <QuickLink to="/admin/revenue"        label="Revenue Overview"       desc="Payment records and revenue breakdown" />
            <QuickLink to="/admin/analytics"      label="Analytics"              desc="Platform trends and usage charts" />
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
