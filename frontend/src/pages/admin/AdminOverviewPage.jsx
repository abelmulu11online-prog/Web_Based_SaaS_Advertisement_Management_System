/**
 * AdminOverviewPage.jsx — Admin command centre.
 * All data from /api/admin/stats and /api/admin/revenue.
 */
import { Link } from 'react-router-dom'
import {
  Users, Megaphone, CreditCard, TrendingUp,
  AlertCircle, CheckCircle2, Clock, PauseCircle,
  Archive, FileText, Tag, ArrowUpRight,
} from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Skeleton }     from '../../components/ui/Skeleton.jsx'
import { StatCard, PageHeader } from '../../features/admin/components/AdminTable.jsx'
import { useAdminStats, useAdminRevenue } from '../../features/admin/hooks/useAdmin.js'

/* ── Quick-nav card ────────────────────────────────────────────────────── */
function NavCard({ to, label, desc, icon: Icon, count, countLabel }) {
  return (
    <Link
      to={to}
      className="
        group flex flex-col gap-3 p-5
        bg-surface border border-border rounded-xl
        hover:border-brand-border hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)]
        hover:-translate-y-0.5
        transition-all duration-200 hover:no-underline
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
      "
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-canvas border border-border flex items-center justify-center shrink-0">
          <Icon size={16} className="text-ink-2" />
        </div>
        <ArrowUpRight
          size={14}
          className="text-ink-4 group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 shrink-0"
        />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-ink">{label}</p>
        <p className="text-[12px] text-ink-3 mt-0.5">{desc}</p>
      </div>
      {count != null && (
        <p className="text-[11.5px] text-ink-3 font-medium">
          <span className="text-ink font-bold text-[14px]">{Number(count).toLocaleString()}</span>
          {countLabel && <span className="ml-1">{countLabel}</span>}
        </p>
      )}
    </Link>
  )
}

/* ── Section label ─────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-4">
      {children}
    </p>
  )
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading, error } = useAdminStats()
  const { data: revenue, isLoading: revLoading } = useAdminRevenue()

  const fmt  = n => n != null ? Number(n).toLocaleString()                : '—'
  const fmtC = n => n != null ? `ETB ${Number(n).toLocaleString()}`       : '—'
  const L    = isLoading

  if (error) {
    return (
      <AdminLayout title="Overview">
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={28} className="text-danger" />
          <p className="text-[14px] text-ink-2 font-medium">
            {error?.response?.data?.message || 'Failed to load dashboard statistics.'}
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Overview">
      <PageHeader
        title="Overview"
        subtitle="Platform health and key metrics at a glance."
      />

      <div className="flex flex-col gap-10">

        {/* ── Users ──────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Users</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/users" className="hover:no-underline">
              <StatCard
                label="Total users"
                value={fmt(stats?.total_users)}
                sub={`+${fmt(stats?.new_users_7d)} this week`}
                icon={<Users size={15} />}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                loading={L}
              />
            </Link>
            <Link to="/admin/users?status=ACTIVE" className="hover:no-underline">
              <StatCard
                label="Active"
                value={fmt(stats?.active_users)}
                icon={<CheckCircle2 size={15} />}
                iconBg="bg-success-bg"
                iconColor="text-success"
                loading={L}
              />
            </Link>
            <Link to="/admin/users?status=SUSPENDED" className="hover:no-underline">
              <StatCard
                label="Suspended"
                value={fmt(stats?.suspended_users)}
                icon={<AlertCircle size={15} />}
                iconBg="bg-danger-bg"
                iconColor="text-danger"
                loading={L}
              />
            </Link>
            <StatCard
              label="New (30 days)"
              value={fmt(stats?.new_users_30d)}
              icon={<Users size={15} />}
              iconBg="bg-brand-light"
              iconColor="text-brand"
              loading={L}
            />
          </div>
        </section>

        {/* ── Revenue & Subscriptions ─────────────────────────────────── */}
        <section>
          <SectionLabel>Revenue &amp; Subscriptions</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/revenue" className="hover:no-underline">
              <StatCard
                label="Total revenue"
                value={fmtC(stats?.total_revenue_etb)}
                sub={`${fmt(stats?.total_payments)} payments`}
                icon={<TrendingUp size={15} />}
                iconBg="bg-success-bg"
                iconColor="text-success"
                loading={L}
              />
            </Link>
            <Link to="/admin/revenue" className="hover:no-underline">
              <StatCard
                label="This month"
                value={fmtC(revenue?.current_month_etb)}
                sub="current calendar month"
                icon={<TrendingUp size={15} />}
                iconBg="bg-brand-light"
                iconColor="text-brand"
                loading={L || revLoading}
              />
            </Link>
            <Link to="/admin/subscriptions?status=ACTIVE" className="hover:no-underline">
              <StatCard
                label="Active subscriptions"
                value={fmt(stats?.active_subscriptions)}
                sub="paid plans"
                icon={<CreditCard size={15} />}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
                loading={L}
              />
            </Link>
            <StatCard
              label="Pending payments"
              value={fmt(stats?.pending_payments)}
              icon={<Clock size={15} />}
              iconBg="bg-warning-bg"
              iconColor="text-warning"
              loading={L}
            />
          </div>
        </section>

        {/* ── Advertisements ─────────────────────────────────────────── */}
        <section>
          <SectionLabel>Advertisements</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total',     val: stats?.total_ads,     icon: Megaphone,    to: '/admin/ads',                     ib: 'bg-surface-2',   ic: 'text-ink-2' },
              { label: 'Published', val: stats?.published_ads, icon: CheckCircle2, to: '/admin/ads?status=PUBLISHED',     ib: 'bg-success-bg',  ic: 'text-success' },
              { label: 'Draft',     val: stats?.draft_ads,     icon: FileText,     to: '/admin/ads?status=DRAFT',         ib: 'bg-surface-2',   ic: 'text-ink-3' },
              { label: 'Paused',    val: stats?.paused_ads,    icon: PauseCircle,  to: '/admin/ads?status=PAUSED',        ib: 'bg-warning-bg',  ic: 'text-warning' },
              { label: 'Expired',   val: stats?.expired_ads,   icon: Clock,        to: '/admin/ads?status=EXPIRED',       ib: 'bg-surface-2',   ic: 'text-ink-3' },
              { label: 'Archived',  val: stats?.archived_ads,  icon: Archive,      to: '/admin/ads?status=ARCHIVED',      ib: 'bg-surface-2',   ic: 'text-ink-3' },
            ].map(({ label, val, icon: Icon, to, ib, ic }) => (
              <Link key={label} to={to} className="hover:no-underline">
                <StatCard
                  label={label}
                  value={fmt(val)}
                  icon={<Icon size={14} />}
                  iconBg={ib}
                  iconColor={ic}
                  loading={L}
                />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Catalogue & Alerts ─────────────────────────────────────── */}
        <section>
          <SectionLabel>Catalogue &amp; Alerts</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/categories" className="hover:no-underline">
              <StatCard
                label="Categories"
                value={fmt(stats?.active_categories)}
                sub={`${fmt(stats?.total_categories)} total`}
                icon={<Tag size={15} />}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
                loading={L}
              />
            </Link>
            <StatCard
              label="New ads (7 days)"
              value={fmt(stats?.new_ads_7d)}
              icon={<Megaphone size={15} />}
              iconBg="bg-brand-light"
              iconColor="text-brand"
              loading={L}
            />
            <Link to="/admin/subscriptions?status=EXPIRED" className="hover:no-underline">
              <StatCard
                label="Expired subscriptions"
                value={fmt(stats?.expired_subscriptions)}
                icon={<Clock size={15} />}
                iconBg="bg-surface-2"
                iconColor="text-ink-3"
                loading={L}
              />
            </Link>
            <StatCard
              label="Failed payments"
              value={fmt(stats?.failed_payments)}
              icon={<AlertCircle size={15} />}
              iconBg="bg-danger-bg"
              iconColor="text-danger"
              loading={L}
            />
          </div>
        </section>

        {/* ── Quick navigation ───────────────────────────────────────── */}
        <section>
          <SectionLabel>Manage</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NavCard to="/admin/users"         icon={Users}     label="User Management"          desc="View, search, suspend or promote users"       count={stats?.total_users}         countLabel="total users" />
            <NavCard to="/admin/ads"            icon={Megaphone} label="Advertisement Moderation" desc="Review and moderate all listings"             count={stats?.published_ads}       countLabel="published" />
            <NavCard to="/admin/categories"     icon={Tag}       label="Categories"               desc="Create, edit, and toggle categories"          count={stats?.active_categories}   countLabel="active" />
            <NavCard to="/admin/subscriptions"  icon={CreditCard}label="Subscriptions"            desc="All user subscription records"               count={stats?.active_subscriptions} countLabel="active" />
            <NavCard to="/admin/revenue"        icon={TrendingUp}label="Revenue"                  desc="Payment records and revenue breakdown"        count={stats?.total_revenue_etb != null ? `ETB ${Number(stats.total_revenue_etb).toLocaleString()}` : null} />
            <NavCard to="/admin/analytics"      icon={TrendingUp}label="Analytics"                desc="Platform trends and usage charts" />
          </div>
        </section>

      </div>
    </AdminLayout>
  )
}
