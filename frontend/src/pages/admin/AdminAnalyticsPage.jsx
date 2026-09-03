/**
 * AdminAnalyticsPage.jsx — Platform analytics using real DB data.
 * All charts are CSS/SVG only — no chart library dependency.
 */
import { AdminLayout } from '../../components/layout/AdminLayout.jsx'
import { Skeleton }    from '../../components/ui/Skeleton.jsx'
import { BarChart, Sparkline } from '../../features/admin/components/AdminTable.jsx'
import { useAdminAnalytics }   from '../../features/admin/hooks/useAdmin.js'

function ChartCard({ title, children, loading, empty }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">{title}</p>
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded" style={{ width: `${60 + i * 10}%` }} />
          ))}
        </div>
      ) : empty ? (
        <p className="text-[12px] text-ink-3 text-center py-4">No data for this period.</p>
      ) : children}
    </div>
  )
}

function DailyTimeline({ data, dateField = 'date', valueField = 'count', label = 'Count' }) {
  if (!data || data.length === 0) return (
    <p className="text-[12px] text-ink-3 text-center py-4">No data available.</p>
  )

  const total = data.reduce((s, d) => s + Number(d[valueField] || 0), 0)

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-[20px] font-bold text-ink">{total.toLocaleString()}</span>
        <span className="text-[11px] text-ink-3">last 30 days</span>
      </div>
      <Sparkline data={data} valueField={valueField} className="text-brand" />
      <div className="flex items-center justify-between mt-2 text-[11px] text-ink-3">
        <span>{data[0]?.[dateField] ? new Date(data[0][dateField]).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}</span>
        <span>{data[data.length - 1]?.[dateField] ? new Date(data[data.length - 1][dateField]).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}</span>
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = useAdminAnalytics()

  if (error) {
    return (
      <AdminLayout title="Analytics">
        <div className="bg-danger-bg border border-red-200 rounded-xl px-4 py-8 text-center">
          <p className="text-danger text-[13px]">
            {error?.response?.data?.message || 'Failed to load analytics data.'}
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Analytics">
      <div className="flex flex-col gap-6">

        {/* New users & ads over time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChartCard title="New users (30 days)" loading={isLoading} empty={!data?.users_daily?.length}>
            <DailyTimeline data={data?.users_daily} valueField="count" />
          </ChartCard>
          <ChartCard title="New ads (30 days)" loading={isLoading} empty={!data?.ads_daily?.length}>
            <DailyTimeline data={data?.ads_daily} valueField="count" />
          </ChartCard>
        </div>

        {/* Revenue over time */}
        <ChartCard title="Revenue (30 days)" loading={isLoading} empty={!data?.revenue_daily?.length}>
          <DailyTimeline data={data?.revenue_daily} valueField="revenue" />
        </ChartCard>

        {/* Ads by status & category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChartCard title="Ads by status" loading={isLoading} empty={!data?.ads_by_status?.length}>
            <BarChart
              data={data?.ads_by_status}
              keyField="status"
              valueField="count"
            />
          </ChartCard>
          <ChartCard title="Ads by category (top 10)" loading={isLoading} empty={!data?.ads_by_category?.length}>
            <BarChart
              data={data?.ads_by_category}
              keyField="category"
              valueField="count"
            />
          </ChartCard>
        </div>

        {/* Subscriptions by plan */}
        <ChartCard title="Users by subscription plan" loading={isLoading} empty={!data?.subs_by_plan?.length}>
          <div className="flex flex-col gap-4">
            <BarChart
              data={data?.subs_by_plan}
              keyField="plan"
              valueField="count"
            />
            {!isLoading && data?.subs_by_plan?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {data.subs_by_plan.map((p) => (
                  <div key={p.plan_name} className="text-center border border-border rounded-lg p-3">
                    <p className="text-[20px] font-bold text-ink">{Number(p.count).toLocaleString()}</p>
                    <p className="text-[11px] text-ink-3 mt-0.5">{p.plan}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ChartCard>

      </div>
    </AdminLayout>
  )
}
