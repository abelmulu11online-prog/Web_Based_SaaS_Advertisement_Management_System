import { Link } from 'react-router-dom'
import { CreditCard, TrendingUp, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { useMySubscription, usePaymentHistory } from '../features/subscriptions/hooks/useSubscriptions.js'

function UsageBar({ used, max }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  const color = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-brand'
  return (
    <div>
      <div className="flex justify-between text-[12px] text-ink-2 mb-1.5">
        <span>{used} / {max} active listings</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const STATUS_MAP = {
  ACTIVE:  { label: 'Active', variant: 'success' },
  FREE:    { label: 'Free', variant: 'default' },
  EXPIRED: { label: 'Expired', variant: 'danger' },
}

export default function SubscriptionPage() {
  const { data: sub, isLoading: subLoading } = useMySubscription()
  const { data: historyData, isLoading: histLoading } = usePaymentHistory(1)
  const payments = historyData?.payments || []

  return (
    <DashboardLayout title="Subscription & Billing">
      <div className="flex flex-col gap-6">

        {/* Current plan */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Current plan</h2>
            <Link to="/pricing">
              <Button variant="outline" size="sm">Change plan</Button>
            </Link>
          </div>

          <div className="p-5">
            {subLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-2 w-full mt-2" />
              </div>
            ) : sub ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-ink">{sub.plan.display_name}</h3>
                      <Badge variant={STATUS_MAP[sub.status]?.variant || 'default'} dot>
                        {STATUS_MAP[sub.status]?.label || sub.status}
                      </Badge>
                    </div>
                    {sub.plan.price_etb > 0 ? (
                      <p className="text-sm text-ink-2">ETB {Number(sub.plan.price_etb).toLocaleString()} / month</p>
                    ) : (
                      <p className="text-sm text-ink-2">Free forever</p>
                    )}
                  </div>
                  {sub.current_period_end && (
                    <div className="text-right">
                      <p className="text-[11px] text-ink-3 uppercase tracking-widest mb-0.5">Renews</p>
                      <p className="text-[13px] font-medium text-ink">
                        {new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {sub.days_remaining != null && (
                        <p className={`text-[12px] mt-0.5 ${sub.days_remaining <= 5 ? 'text-warning font-medium' : 'text-ink-3'}`}>
                          {sub.days_remaining} days remaining
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Expiry warning */}
                {sub.days_remaining != null && sub.days_remaining <= 3 && sub.days_remaining > 0 && (
                  <div className="flex items-start gap-2.5 bg-warning-bg border border-yellow-200 rounded-lg px-3.5 py-3">
                    <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                    <p className="text-[13px] text-warning">
                      Your subscription expires in {sub.days_remaining} day{sub.days_remaining > 1 ? 's' : ''}. Renew now to keep your listings active.
                    </p>
                  </div>
                )}

                {sub.status === 'EXPIRED' && (
                  <div className="flex items-start gap-2.5 bg-danger-bg border border-red-200 rounded-lg px-3.5 py-3">
                    <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
                    <p className="text-[13px] text-danger">
                      Your subscription has expired and your listings have been paused.{' '}
                      <Link to="/pricing" className="font-semibold underline">Renew your plan</Link> to re-publish them.
                    </p>
                  </div>
                )}

                {/* Usage */}
                <UsageBar used={sub.usage?.active_ads || 0} max={sub.plan?.max_active_ads || 5} />

                {/* Plan limits */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { label: 'Active listings', value: sub.plan?.max_active_ads ?? '—' },
                    { label: 'Images per ad', value: sub.plan?.max_images_per_ad ?? '—' },
                    { label: 'Featured badge', value: sub.plan?.is_featured ? 'Yes' : 'No' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-2 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-[11px] text-ink-3 mb-0.5">{label}</p>
                      <p className="text-[14px] font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-2">No subscription data available.</p>
            )}
          </div>
        </div>

        {/* Payment history */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold text-ink">Payment history</h2>
          </div>

          {histLoading ? (
            <div className="p-5 flex flex-col gap-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard size={28} className="text-ink-3 mx-auto mb-3" />
              <p className="text-sm text-ink-2">No payments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    {['Date', 'Plan', 'Amount', 'Method', 'Status'].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-widest px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3 text-[13px] text-ink-2 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink font-medium">{p.plan_display_name}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-ink whitespace-nowrap">
                        ETB {Number(p.amount_etb).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-2 capitalize">
                        {p.payment_method?.replace(/_/g, ' ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.status === 'SUCCESS' ? 'success' : p.status === 'FAILED' ? 'danger' : 'default'} size="xs">
                          {p.status}
                        </Badge>
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
