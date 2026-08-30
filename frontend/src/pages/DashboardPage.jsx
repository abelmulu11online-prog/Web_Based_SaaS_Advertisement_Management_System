import { useNavigate, Link } from 'react-router-dom'
import { Plus, Eye, Megaphone, TrendingUp, CreditCard, ArrowRight, Circle } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { useMyAdvertisements } from '../features/advertisements/hooks/useAdvertisements.js'
import { useMySubscription } from '../features/subscriptions/hooks/useSubscriptions.js'

const STATUS_BADGE = {
  PUBLISHED: <Badge variant="success" dot>Published</Badge>,
  DRAFT:     <Badge variant="default" dot>Draft</Badge>,
  PAUSED:    <Badge variant="warning" dot>Paused</Badge>,
  EXPIRED:   <Badge variant="danger" dot>Expired</Badge>,
  ARCHIVED:  <Badge variant="default" dot>Archived</Badge>,
}

function StatCard({ label, value, icon, loading }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-medium text-ink-3 uppercase tracking-widest">{label}</span>
        <span className="text-ink-3">{icon}</span>
      </div>
      {loading
        ? <Skeleton className="h-7 w-16" />
        : <div className="text-2xl font-bold text-ink tracking-tight">{value}</div>
      }
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')

  const { data: adsData, isLoading: adsLoading } = useMyAdvertisements({ page_size: 5 })
  const { data: subscription, isLoading: subLoading } = useMySubscription()

  if (!isLoggedIn) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-ink-2">You need to be logged in to view your dashboard.</p>
          <Button variant="primary" onClick={() => navigate('/login')}>Log in</Button>
        </div>
      </DashboardLayout>
    )
  }

  const ads = adsData?.advertisements || (Array.isArray(adsData) ? adsData : [])
  const published = ads.filter(a => a.status === 'PUBLISHED').length
  const drafts    = ads.filter(a => a.status === 'DRAFT').length
  const total     = adsData?.pagination?.total || ads.length

  return (
    <DashboardLayout title="Overview">
      <div className="flex flex-col gap-7">

        {/* Welcome + CTA */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Good to see you</h2>
            <p className="text-sm text-ink-2 mt-0.5">Here's an overview of your account.</p>
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate('/dashboard/advertisements/new')}>
            Post new ad
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total listings" value={total} icon={<Megaphone size={15} />} loading={adsLoading} />
          <StatCard label="Published" value={published} icon={<Eye size={15} />} loading={adsLoading} />
          <StatCard label="Drafts" value={drafts} icon={<Circle size={15} />} loading={adsLoading} />
          <StatCard label="Plan" value={subLoading ? '—' : (subscription?.plan?.display_name || 'Free')} icon={<CreditCard size={15} />} loading={subLoading} />
        </div>

        {/* Subscription notice */}
        {!subLoading && subscription && (
          <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border ${
            subscription.status === 'ACTIVE' ? 'bg-success-bg border-green-200' : 'bg-warning-bg border-yellow-200'
          }`}>
            <div>
              <p className={`text-[13px] font-semibold ${subscription.status === 'ACTIVE' ? 'text-success' : 'text-warning'}`}>
                {subscription.plan.display_name} plan — {subscription.status}
              </p>
              {subscription.days_remaining != null && (
                <p className="text-[12px] text-ink-2 mt-0.5">
                  {subscription.days_remaining > 0 ? `${subscription.days_remaining} days remaining` : 'Expired'}
                </p>
              )}
            </div>
            <Link to="/pricing" className="text-[12px] font-medium text-brand hover:underline shrink-0">
              {subscription.plan.name === 'FREE' ? 'Upgrade' : 'Manage'} →
            </Link>
          </div>
        )}

        {/* Recent ads */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-ink">Recent listings</h3>
            <Link to="/dashboard/advertisements" className="text-[13px] text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {adsLoading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <p className="text-ink-2 text-sm mb-4">You haven't posted any listings yet.</p>
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate('/dashboard/advertisements/new')}>
                Post your first ad
              </Button>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-widest px-4 py-2.5">Title</th>
                    <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-widest px-4 py-2.5 hidden sm:table-cell">Status</th>
                    <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-widest px-4 py-2.5 hidden md:table-cell">Category</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ads.slice(0, 5).map(ad => (
                    <tr key={ad.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-[13.5px] font-medium text-ink line-clamp-1">{ad.title}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {STATUS_BADGE[ad.status] || <Badge variant="default">{ad.status}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-2 hidden md:table-cell">
                        {ad.category_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/dashboard/advertisements/${ad.id}/edit`}
                          className="text-[12px] text-brand hover:underline font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
