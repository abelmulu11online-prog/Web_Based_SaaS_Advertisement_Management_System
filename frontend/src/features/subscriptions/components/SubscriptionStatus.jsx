import { Badge } from '../../../components/ui/Badge.jsx'

const STATUS = {
  ACTIVE:  { label: 'Active',  variant: 'success' },
  FREE:    { label: 'Free',    variant: 'default' },
  EXPIRED: { label: 'Expired', variant: 'danger'  },
}

export function SubscriptionStatus({ subscription }) {
  if (!subscription) return null
  const { label, variant } = STATUS[subscription.status] || { label: subscription.status, variant: 'default' }

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-ink">{subscription.plan.display_name}</h3>
          <Badge variant={variant} dot>{label}</Badge>
        </div>
        {subscription.plan.price_etb > 0 ? (
          <p className="text-sm text-ink-2">ETB {Number(subscription.plan.price_etb).toLocaleString()} / month</p>
        ) : (
          <p className="text-sm text-ink-2">Free plan</p>
        )}
      </div>

      {subscription.current_period_end && (
        <div className="text-right">
          <p className="text-[11px] text-ink-3 uppercase tracking-widest mb-0.5">Renews</p>
          <p className="text-[13px] font-medium text-ink">
            {new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
          {subscription.days_remaining != null && (
            <p className={`text-[12px] mt-0.5 ${subscription.days_remaining <= 5 ? 'text-warning font-medium' : 'text-ink-3'}`}>
              {subscription.days_remaining} days remaining
            </p>
          )}
        </div>
      )}
    </div>
  )
}
