/**
 * SubscriptionStatus.jsx — Current plan badge + billing period info.
 */

const STATUS_COLORS = {
  FREE:    { bg: '#f3f4f6', text: '#374151' },
  ACTIVE:  { bg: '#dcfce7', text: '#166534' },
  EXPIRED: { bg: '#fee2e2', text: '#991b1b' },
}

export function SubscriptionStatus({ subscription }) {
  if (!subscription) return null

  const { status, plan, current_period_end, days_remaining } = subscription
  const colors = STATUS_COLORS[status] || STATUS_COLORS.FREE

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Plan name + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)' }}>
          {plan.display_name} Plan
        </span>
        <span
          style={{
            padding: '2px 12px',
            borderRadius: '9999px',
            background: colors.bg,
            color: colors.text,
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {status}
        </span>
        {plan.is_featured && (
          <span
            style={{
              padding: '2px 10px',
              borderRadius: '9999px',
              background: '#fbbf24',
              color: '#1a1a1a',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            FEATURED
          </span>
        )}
      </div>

      {/* Billing info */}
      {current_period_end ? (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
          {status === 'EXPIRED'
            ? `Expired on ${new Date(current_period_end).toLocaleDateString()}`
            : `Active until ${new Date(current_period_end).toLocaleDateString()} (${days_remaining} day${days_remaining !== 1 ? 's' : ''} remaining)`}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
          Free plan — no expiry
        </p>
      )}

      {/* Price */}
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
        {plan.price_etb === 0 ? 'Free forever' : `ETB ${Number(plan.price_etb).toLocaleString()} / month`}
      </p>
    </div>
  )
}
