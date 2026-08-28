/**
 * SubscriptionPage.jsx — Authenticated user's subscription dashboard.
 * Route: /dashboard/subscription
 */
import { Link } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { SubscriptionStatus } from '../features/subscriptions/components/SubscriptionStatus.jsx'
import { UsageBar } from '../features/subscriptions/components/UsageBar.jsx'
import { ExpiryCountdown } from '../features/subscriptions/components/ExpiryCountdown.jsx'
import { useMySubscription, usePaymentHistory } from '../features/subscriptions/hooks/useSubscriptions.js'

export default function SubscriptionPage() {
  const { data: subscription, isLoading, isError } = useMySubscription()
  const { data: historyData } = usePaymentHistory(1)

  const isLoggedIn = !!localStorage.getItem('accessToken')

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2>Please log in to view your subscription</h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '26px', color: 'var(--text-h)' }}>My Subscription</h1>
          <Link to="/pricing" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Change Plan</Button>
          </Link>
        </div>

        {/* Expiry warning banner */}
        {subscription && <ExpiryCountdown subscription={subscription} />}

        {/* Expired notice */}
        {subscription?.status === 'EXPIRED' && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px 16px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: 500 }}>
              ⚠️ Your subscription has expired and your published ads have been paused.{' '}
              <Link to="/pricing" style={{ color: '#991b1b', fontWeight: 700 }}>Renew your plan</Link> to re-publish them.
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ background: 'var(--code-bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '28px', textAlign: 'center', color: 'var(--text)' }}>
            Loading subscription…
          </div>
        )}

        {isError && (
          <div style={{ padding: '16px', background: '#fee2e2', borderRadius: '8px', color: '#991b1b' }}>
            Failed to load subscription. Please refresh.
          </div>
        )}

        {/* Subscription details card */}
        {!isLoading && subscription && (
          <div style={{ background: 'var(--code-bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SubscriptionStatus subscription={subscription} />
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />
            <UsageBar usage={subscription.usage} plan={subscription.plan} />
          </div>
        )}

        {/* Payment history */}
        {historyData?.payments?.length > 0 && (
          <div>
            <h2 style={{ fontSize: '18px', margin: '0 0 12px', color: 'var(--text-h)' }}>Payment History</h2>
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-h)' }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-h)' }}>Plan</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-h)' }}>Amount</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-h)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.payments.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < historyData.payments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--text)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-h)' }}>{p.plan_display_name}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-h)', fontWeight: 600 }}>
                        ETB {Number(p.amount_etb).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                          background: p.status === 'SUCCESS' ? '#dcfce7' : p.status === 'FAILED' ? '#fee2e2' : '#f3f4f6',
                          color: p.status === 'SUCCESS' ? '#166534' : p.status === 'FAILED' ? '#991b1b' : '#374151',
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
