/**
 * PlanCard.jsx — Single plan tile for the pricing page.
 */
import { useNavigate } from 'react-router-dom'
import { useCreateCheckoutSession } from '../hooks/useSubscriptions.js'
import { Button } from '../../../components/ui/Button.jsx'

const FEATURE_BADGE_STYLE = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: '9999px',
  background: '#fbbf24',
  color: '#1a1a1a',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  marginLeft: '8px',
  verticalAlign: 'middle',
}

export function PlanCard({ plan, currentPlanName }) {
  const navigate = useNavigate()
  const checkout = useCreateCheckoutSession()
  const isCurrent = plan.name === currentPlanName
  const isFree    = plan.name === 'FREE'
  const isLoggedIn = !!localStorage.getItem('accessToken')

  function handleSubscribe() {
    if (!isLoggedIn) {
      // Redirect to register, then come back to pricing after auth
      navigate('/register', { state: { from: '/pricing' } })
      return
    }
    checkout.mutate({ planId: plan.id })
  }

  return (
    <div
      style={{
        border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: '16px',
        padding: '28px 24px',
        background: 'var(--code-bg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
      }}
    >
      {/* Featured badge */}
      {plan.is_featured && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fbbf24',
            color: '#1a1a1a',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 14px',
            borderRadius: '9999px',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}
        >
          FEATURED
        </div>
      )}

      {/* Plan name */}
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: '20px', color: 'var(--text-h)' }}>
          {plan.display_name}
        </h3>
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-h)' }}>
          {plan.price_etb === 0 ? (
            <span>Free</span>
          ) : (
            <>
              <span>ETB {Number(plan.price_etb).toLocaleString()}</span>
              <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text)', marginLeft: '4px' }}>
                /month
              </span>
            </>
          )}
        </div>
      </div>

      {/* Features list */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <li style={{ fontSize: '14px', color: 'var(--text)' }}>
          ✓ <strong>{plan.max_active_ads}</strong> active advertisement{plan.max_active_ads !== 1 ? 's' : ''}
        </li>
        <li style={{ fontSize: '14px', color: 'var(--text)' }}>
          ✓ Up to <strong>{plan.max_images_per_ad}</strong> images per ad
        </li>
        {plan.is_featured && (
          <li style={{ fontSize: '14px', color: 'var(--text)' }}>
            ✓ <span style={FEATURE_BADGE_STYLE}>Featured</span> badge on listings
          </li>
        )}
      </ul>

      {/* CTA button */}
      {isCurrent ? (
        <Button variant="secondary" disabled style={{ marginTop: 'auto' }}>
          Current Plan
        </Button>
      ) : isFree ? (
        <Button variant="secondary" disabled style={{ marginTop: 'auto' }}>
          Free Forever
        </Button>
      ) : (
        <Button
          variant="primary"
          loading={checkout.isPending}
          onClick={handleSubscribe}
          style={{ marginTop: 'auto' }}
        >
          {isLoggedIn ? 'Subscribe' : 'Sign up to subscribe'}
        </Button>
      )}
    </div>
  )
}
