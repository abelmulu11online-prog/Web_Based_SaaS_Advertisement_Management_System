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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { data: stats, isLoading, error } = useAdminStats()
  const { data: revenue, isLoading: revLoading } = useAdminRevenue()

  const fmt  = n => n != null ? Number(n).toLocaleString()          : '—'
  const fmtC = n => n != null ? `ETB ${Number(n).toLocaleString()}` : '—'
  const L    = isLoading

  if (error) {
    return (
      <AdminLayout title={t('admin.overview')}>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={28} className="text-danger" />
          <p className="text-[14px] text-ink-2 font-medium">
            {error?.response?.data?.message || t('admin.loadFailed')}
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('admin.overview')}>
      <PageHeader
        title={t('admin.overview')}
        subtitle={t('admin.platformHealth')}
      />

      <div className="flex flex-col gap-10">

        {/* Users */}
        <section>
          <SectionLabel>{t('admin.sections.users')}</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/users" className="hover:no-underline">
              <StatCard label={t('admin.stats.totalUsers')} value={fmt(stats?.total_users)} sub={t('admin.stats.thisWeek', { count: fmt(stats?.new_users_7d) })} icon={<Users size={15} />} iconBg="bg-blue-50" iconColor="text-blue-600" loading={L} />
            </Link>
            <Link to="/admin/users?status=ACTIVE" className="hover:no-underline">
              <StatCard label={t('admin.stats.active')} value={fmt(stats?.active_users)} icon={<CheckCircle2 size={15} />} iconBg="bg-success-bg" iconColor="text-success" loading={L} />
            </Link>
            <Link to="/admin/users?status=SUSPENDED" className="hover:no-underline">
              <StatCard label={t('admin.stats.suspended')} value={fmt(stats?.suspended_users)} icon={<AlertCircle size={15} />} iconBg="bg-danger-bg" iconColor="text-danger" loading={L} />
            </Link>
            <StatCard label={t('admin.stats.new30Days')} value={fmt(stats?.new_users_30d)} icon={<Users size={15} />} iconBg="bg-brand-light" iconColor="text-brand" loading={L} />
          </div>
        </section>

        {/* Revenue & Subscriptions */}
        <section>
          <SectionLabel>{t('admin.sections.revenueAndSubs')}</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/revenue" className="hover:no-underline">
              <StatCard label={t('admin.stats.totalRevenue')} value={fmtC(stats?.total_revenue_etb)} sub={t('admin.stats.payments', { count: fmt(stats?.total_payments) })} icon={<TrendingUp size={15} />} iconBg="bg-success-bg" iconColor="text-success" loading={L} />
            </Link>
            <Link to="/admin/revenue" className="hover:no-underline">
              <StatCard label={t('admin.stats.thisMonth')} value={fmtC(revenue?.current_month_etb)} sub={t('admin.stats.currentMonth')} icon={<TrendingUp size={15} />} iconBg="bg-brand-light" iconColor="text-brand" loading={L || revLoading} />
            </Link>
            <Link to="/admin/subscriptions?status=ACTIVE" className="hover:no-underline">
              <StatCard label={t('admin.stats.activeSubs')} value={fmt(stats?.active_subscriptions)} sub={t('admin.stats.paidPlans')} icon={<CreditCard size={15} />} iconBg="bg-indigo-50" iconColor="text-indigo-600" loading={L} />
            </Link>
            <StatCard label={t('admin.stats.pendingPayments')} value={fmt(stats?.pending_payments)} icon={<Clock size={15} />} iconBg="bg-warning-bg" iconColor="text-warning" loading={L} />
          </div>
        </section>

        {/* Advertisements */}
        <section>
          <SectionLabel>{t('admin.sections.advertisements')}</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { labelKey: 'admin.stats.totalAds',    val: stats?.total_ads,     icon: Megaphone,    to: '/admin/ads',                    ib: 'bg-surface-2', ic: 'text-ink-2'  },
              { labelKey: 'admin.stats.publishedAds',val: stats?.published_ads, icon: CheckCircle2, to: '/admin/ads?status=PUBLISHED',    ib: 'bg-success-bg',ic: 'text-success'},
              { labelKey: 'admin.stats.draftAds',    val: stats?.draft_ads,     icon: FileText,     to: '/admin/ads?status=DRAFT',        ib: 'bg-surface-2', ic: 'text-ink-3'  },
              { labelKey: 'admin.stats.pausedAds',   val: stats?.paused_ads,    icon: PauseCircle,  to: '/admin/ads?status=PAUSED',       ib: 'bg-warning-bg',ic: 'text-warning'},
              { labelKey: 'admin.stats.expiredAds',  val: stats?.expired_ads,   icon: Clock,        to: '/admin/ads?status=EXPIRED',      ib: 'bg-surface-2', ic: 'text-ink-3'  },
              { labelKey: 'admin.stats.archivedAds', val: stats?.archived_ads,  icon: Archive,      to: '/admin/ads?status=ARCHIVED',     ib: 'bg-surface-2', ic: 'text-ink-3'  },
            ].map(({ labelKey, val, icon: Icon, to, ib, ic }) => (
              <Link key={labelKey} to={to} className="hover:no-underline">
                <StatCard label={t(labelKey)} value={fmt(val)} icon={<Icon size={14} />} iconBg={ib} iconColor={ic} loading={L} />
              </Link>
            ))}
          </div>
        </section>

        {/* Catalogue & Alerts */}
        <section>
          <SectionLabel>{t('admin.sections.catalogueAlerts')}</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/categories" className="hover:no-underline">
              <StatCard label={t('admin.stats.categories')} value={fmt(stats?.active_categories)} sub={t('admin.stats.totalCategories', { count: fmt(stats?.total_categories) })} icon={<Tag size={15} />} iconBg="bg-amber-50" iconColor="text-amber-600" loading={L} />
            </Link>
            <StatCard label={t('admin.stats.newAds7d')} value={fmt(stats?.new_ads_7d)} icon={<Megaphone size={15} />} iconBg="bg-brand-light" iconColor="text-brand" loading={L} />
            <Link to="/admin/subscriptions?status=EXPIRED" className="hover:no-underline">
              <StatCard label={t('admin.stats.expiredSubs')} value={fmt(stats?.expired_subscriptions)} icon={<Clock size={15} />} iconBg="bg-surface-2" iconColor="text-ink-3" loading={L} />
            </Link>
            <StatCard label={t('admin.stats.failedPayments')} value={fmt(stats?.failed_payments)} icon={<AlertCircle size={15} />} iconBg="bg-danger-bg" iconColor="text-danger" loading={L} />
          </div>
        </section>

        {/* Quick navigation */}
        <section>
          <SectionLabel>{t('admin.sections.manage')}</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NavCard to="/admin/users"        icon={Users}      label={t('admin.manage.userManagement')}  desc={t('admin.manage.userManagementDesc')}  count={stats?.total_users}          countLabel={t('admin.totalUsers')} />
            <NavCard to="/admin/ads"           icon={Megaphone}  label={t('admin.manage.adModeration')}    desc={t('admin.manage.adModerationDesc')}    count={stats?.published_ads}        countLabel={t('admin.published')} />
            <NavCard to="/admin/categories"    icon={Tag}        label={t('admin.categories')}             desc={t('admin.manage.categoriesDesc')}      count={stats?.active_categories}    countLabel={t('admin.activeLabel')} />
            <NavCard to="/admin/subscriptions" icon={CreditCard} label={t('admin.subscriptions')}          desc={t('admin.manage.subscriptionsDesc')}   count={stats?.active_subscriptions} countLabel={t('admin.activeLabel')} />
            <NavCard to="/admin/revenue"       icon={TrendingUp} label={t('admin.revenue')}                desc={t('admin.manage.revenueDesc')}         count={stats?.total_revenue_etb != null ? `ETB ${Number(stats.total_revenue_etb).toLocaleString()}` : null} />
            <NavCard to="/admin/analytics"     icon={TrendingUp} label={t('admin.analytics')}              desc={t('admin.manage.analyticsDesc')} />
          </div>
        </section>

      </div>
    </AdminLayout>
  )
}
