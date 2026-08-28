/**
 * SubscriptionSuccessPage.jsx — Post-payment success confirmation.
 * Route: /subscription/success
 */
import { Link } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useMySubscription } from '../features/subscriptions/hooks/useSubscriptions.js'

export default function SubscriptionSuccessPage() {
  const { data: subscription, isLoading } = useMySubscription()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ color: 'var(--text-h)', margin: '0 0 12px', fontSize: '28px' }}>
          Payment Successful!
        </h1>

        {isLoading ? (
          <p style={{ color: 'var(--text)' }}>Loading your plan details…</p>
        ) : subscription ? (
          <>
            <p style={{ color: 'var(--text)', fontSize: '16px', marginBottom: '8px' }}>
              You are now on the{' '}
              <strong style={{ color: 'var(--text-h)' }}>{subscription.plan.display_name}</strong> plan.
            </p>
            {subscription.current_period_end && (
              <p style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '28px' }}>
                Your subscription is active until{' '}
                <strong>{new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}</strong>
                .
              </p>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--text)', marginBottom: '28px' }}>
            Your subscription has been activated. It may take a moment to reflect.
          </p>
        )}

        {/* What's next */}
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
          textAlign: 'left',
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: 'var(--text-h)' }}>What's next?</h3>
          <ul style={{ margin: 0, padding: '0 0 0 20px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.7 }}>
            <li>Go to your dashboard to publish advertisements</li>
            <li>Your plan allows <strong>{subscription?.plan?.max_active_ads ?? '—'}</strong> active ads</li>
            <li>Up to <strong>{subscription?.plan?.max_images_per_ad ?? '—'}</strong> images per ad</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
          <Link to="/dashboard/subscription" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">View Subscription</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
