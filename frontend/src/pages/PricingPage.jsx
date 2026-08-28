/**
 * PricingPage.jsx — Public pricing page showing all subscription plans.
 * Route: /pricing (no auth required)
 */
import { Navbar } from '../components/layout/Navbar.jsx'
import { PlanCard } from '../features/subscriptions/components/PlanCard.jsx'
import { useSubscriptionPlans, useMySubscription } from '../features/subscriptions/hooks/useSubscriptions.js'

export default function PricingPage() {
  const { data: plans, isLoading, isError } = useSubscriptionPlans()
  const { data: mySubscription } = useMySubscription()

  const currentPlanName = mySubscription?.plan?.name || null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', margin: '0 0 12px', color: 'var(--text-h)' }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--text)', margin: 0 }}>
            All prices are in Ethiopian Birr (ETB). Pay monthly, cancel anytime.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: '280px',
                  background: 'var(--code-bg)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '8px', color: '#991b1b', textAlign: 'center' }}>
            Failed to load plans. Please refresh the page.
          </div>
        )}

        {/* Plan grid */}
        {!isLoading && !isError && plans && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              alignItems: 'stretch',
            }}
          >
            {[...plans]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlanName={currentPlanName}
                />
              ))}
          </div>
        )}

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '13px', color: 'var(--text)' }}>
          Payments are processed via Telebirr, CBE Birr, and other Ethiopian payment methods through Chapa.
        </p>
      </main>
    </div>
  )
}
