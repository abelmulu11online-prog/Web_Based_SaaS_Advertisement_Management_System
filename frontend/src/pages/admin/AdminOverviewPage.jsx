import { Link } from 'react-router-dom'
import { Users, Megaphone, CreditCard, TrendingUp, ArrowRight } from 'lucide-react'
import { AdminLayout } from '../../components/layout/AdminLayout.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { useAdminStats, useAdminSubOverview } from '../../features/admin/hooks/useAdmin.js'

function StatCard({ label, value, sub, icon, color = 'text-brand', loading }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-medium text-ink-3 uppercase tracking-widest">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      {loading
        ? <Skeleton className="h-7 w-20" />
        : <div className="text-2xl font-bold text-ink tracking-tight">{value ?? '—'}</div>
      }
      {sub && !loading && <p className="text-[12px] text-ink-3 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading }    = useAdminStats()
  const { data: subStats, isLoading: subLoading } = useAdminSubOverview()

  const fmt = (n) => n != null ? Number(n).toLocaleString() : '—'

  return (
    <AdminLayout title="Overview">
      <div className="flex flex-col gap-8">

        {/* Platform stats */}
        <section>
          <h2 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Platform</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total users"    value={fmt(stats?.total_users)}       sub={`+${fmt(stats?.new_users_7d)} this week`}  icon={<Users size={16}/>}      loading={isLoading} />
            <StatCard label="Total ads"      value={fmt(stats?.total_ads)}         sub={`${fmt(stats?.published_ads)} published`}   icon={<Megaphone size={16}/>}  loading={isLoading} />
            <StatCard label="Active subs"    value={fmt(stats?.active_subscriptions)} sub="paid plans"                             icon={<CreditCard size={16}/>} loading={isLoading} />
            <StatCard label="Total revenue"  value={`ETB ${fmt(stats?.total_revenue_etb)}`} sub={`${fmt(stats?.total_payments)} payments`} icon={<TrendingUp size={16}/>} color="text-success" loading={isLoading} />
          </div>
        </section>

        {/* Subscription breakdown */}
        <section>
          <h2 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Subscriptions by plan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Free',     key: 'free_plan_users' },
              { label: 'Basic',    key: 'basic_plan_users' },
              { label: 'Pro',      key: 'pro_plan_users' },
              { label: 'Business', key: 'business_plan_users' },
            ].map(({ label, key }) => (
              <div key={key} className="bg-surface border border-border rounded-xl p-5">
                <p className="text-[12px] font-medium text-ink-3 uppercase tracking-widest mb-2">{label}</p>
                {subLoading
                  ? <Skeleton className="h-6 w-12" />
                  : <p className="text-xl font-bold text-ink">{fmt(subStats?.[key])}</p>
                }
              </div>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section>
          <h2 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Quick links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { to: '/admin/users',    label: 'Manage users',    desc: 'View, suspend, promote users' },
              { to: '/admin/ads',      label: 'Moderate ads',    desc: 'Review and moderate listings' },
              { to: '/admin/payments', label: 'Payment records', desc: 'All transactions and history' },
            ].map(({ to, label, desc }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3.5 hover:bg-surface-2 hover:no-underline transition-colors group"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{label}</p>
                  <p className="text-[12px] text-ink-3 mt-0.5">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-ink-3 group-hover:text-brand transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
