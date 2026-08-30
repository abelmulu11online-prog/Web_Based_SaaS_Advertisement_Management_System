import { useNavigate } from 'react-router-dom'
import { Check, Zap } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useSubscriptionPlans, useMySubscription, useCreateCheckoutSession } from '../features/subscriptions/hooks/useSubscriptions.js'

const PLAN_FEATURES = {
  FREE:     ['1 active listing', '3 images per ad', 'Basic visibility', 'Email support'],
  BASIC:    ['5 active listings', '5 images per ad', 'Standard visibility', 'Email support', 'Analytics'],
  PRO:      ['20 active listings', '10 images per ad', 'Featured badge on all ads', 'Priority support', 'Analytics', 'Promoted in search'],
  BUSINESS: ['100 active listings', '10 images per ad', 'Featured badge on all ads', 'Dedicated support', 'Full analytics', 'Top placement', 'Bulk management'],
}

export default function PricingPage() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const { data: plans, isLoading } = useSubscriptionPlans()
  const { data: mySubscription } = useMySubscription()
  const checkout = useCreateCheckoutSession()

  const currentPlanName = mySubscription?.plan?.name || null

  function handleSelect(plan) {
    if (plan.name === 'FREE') return
    if (!isLoggedIn) { navigate('/register', { state: { from: '/pricing' } }); return }
    checkout.mutate({ planId: plan.id })
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-surface border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-3 tracking-tight">
              Simple, transparent pricing
            </h1>
            <p className="text-base text-ink-2 max-w-lg mx-auto">
              Start for free. Upgrade as your business grows. All prices in Ethiopian Birr, billed monthly.
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-surface border border-border rounded-xl p-6 animate-pulse">
                  <div className="skeleton h-4 w-16 mb-3 rounded" />
                  <div className="skeleton h-8 w-28 mb-6 rounded" />
                  <div className="flex flex-col gap-2.5">
                    {[1,2,3,4].map(j => <div key={j} className="skeleton h-3 w-full rounded" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
              {[...(plans || [])].sort((a, b) => a.sort_order - b.sort_order).map(plan => {
                const isCurrent = plan.name === currentPlanName
                const isFeatured = plan.is_featured && plan.name === 'PRO'
                const features = PLAN_FEATURES[plan.name] || []

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-surface rounded-xl flex flex-col overflow-hidden transition-all duration-200 ${
                      isFeatured
                        ? 'border-2 border-brand shadow-lg'
                        : isCurrent
                        ? 'border-2 border-brand/40'
                        : 'border border-border hover:border-border-2 hover:shadow-sm'
                    }`}
                  >
                    {isFeatured && (
                      <div className="bg-brand text-white text-[11px] font-semibold tracking-widest text-center py-1.5 uppercase">
                        Most popular
                      </div>
                    )}

                    <div className="p-5 flex flex-col flex-1">
                      {/* Plan name */}
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[15px] font-bold text-ink">{plan.display_name}</h3>
                        {isCurrent && <Badge variant="brand" size="xs">Current</Badge>}
                      </div>

                      {/* Price */}
                      <div className="mt-3 mb-5">
                        {plan.price_etb === 0 ? (
                          <div className="text-3xl font-bold text-ink tracking-tight">Free</div>
                        ) : (
                          <div className="flex items-end gap-1">
                            <span className="text-3xl font-bold text-ink tracking-tight">
                              ETB {Number(plan.price_etb).toLocaleString()}
                            </span>
                            <span className="text-ink-3 text-sm mb-0.5">/mo</span>
                          </div>
                        )}
                      </div>

                      {/* Features */}
                      <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                        {features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-[13px] text-ink-2">
                            <Check size={13} className="text-brand mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {isCurrent ? (
                        <div className="w-full h-9 flex items-center justify-center rounded border border-border text-[13px] text-ink-3 font-medium bg-surface-2">
                          Current plan
                        </div>
                      ) : plan.name === 'FREE' ? (
                        <div className="w-full h-9 flex items-center justify-center rounded border border-border text-[13px] text-ink-3 font-medium">
                          Always free
                        </div>
                      ) : (
                        <Button
                          variant={isFeatured ? 'primary' : 'outline'}
                          fullWidth
                          loading={checkout.isPending}
                          onClick={() => handleSelect(plan)}
                        >
                          {isLoggedIn ? 'Subscribe' : 'Get started'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* FAQ strip */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-border">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes. Your plan stays active until the end of the billing period. No long-term contracts.' },
              { q: 'What payment methods are accepted?', a: 'Telebirr, CBE Birr, Amole, and other Ethiopian payment methods via Chapa.' },
              { q: 'What happens when my plan expires?', a: 'Your account reverts to the Free plan. Active listings will be paused until you renew.' },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-[13.5px] font-semibold text-ink mb-2">{q}</h3>
                <p className="text-[13px] text-ink-2 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
