/**
 * ExpiryCountdown.jsx — "Expires in N days — Renew Now" banner.
 * Renders only when days_remaining <= 3 on an ACTIVE subscription.
 */
import { Link } from 'react-router-dom'

export function ExpiryCountdown({ subscription }) {
  if (!subscription) return null

  const { status, days_remaining } = subscription

  // Only show for ACTIVE subscriptions expiring in 3 days or fewer
  if (status !== 'ACTIVE' || days_remaining === null || days_remaining > 3) return null

  return (
    <div
      style={{
        background: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '14px', color: '#92400e', fontWeight: 500 }}>
        ⚠️ Your plan expires in{' '}
        <strong>{days_remaining} day{days_remaining !== 1 ? 's' : ''}</strong>
        . Renew to keep your ads published.
      </span>
      <Link
        to="/pricing"
        style={{
          background: '#f59e0b',
          color: '#fff',
          padding: '6px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Renew Now →
      </Link>
    </div>
  )
}
