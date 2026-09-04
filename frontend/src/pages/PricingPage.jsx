import { useNavigate } from 'react-router-dom'
import {
  Check, X as XIcon, Star, Zap, Shield, Crown,
  Wrench, FolderOpen, FileText, Image, Link2,
  BadgeCheck, TrendingUp, Users
} from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useSubscriptionPlans, useMySubscription, useCreateCheckoutSession } from '../features/subscriptions/hooks/useSubscriptions.js'

// Feature rows — what each plan includes
// value: true = yes, false = no, string = specific value
const FEATURES = [
  { label: 'Public profile', icon: <Users size={14} />, free: true, basic: true, pro: true, business: true },
  { label: 'Services you can list', icon: <Wrench size={14} />, free: '3', basic: '10', pro: '50', business: 'Unlimited' },
  { label: 'Portfolio items', icon: <FolderOpen size={14} />, free: '2', basic: '10', pro: '50', business: 'Unlimited' },
  { label: 'Posts & updates', icon: <FileText size={14} />, free: '5', basic: '20', pro: '100', business: 'Unlimited' },
  { label: 'Gallery photos', icon: <Image size={14} />, free: '3', basic: '10', pro: '30', business: 'Unlimited' },
  { label: 'Social media links', icon: <Link2 size={14} />, free: '3', basic: 'All', pro: 'All', business: 'All' },
  { label: 'Business hours', icon: <Check size={14} />, free: true, basic: true, pro: true, business: true },
  { label: 'Contact & WhatsApp button', icon: <Zap size={14} />, free: true, basic: true, pro: true, business: true },
  { label: 'Featured in search results', icon: <Star size={14} />, free: false, basic: false, pro: true, business: true },
  { label: 'Top placement in search', icon: <TrendingUp size={14} />, free: false, basic: false, pro: false, business: true },
  { label: 'Verified badge eligible', icon: <BadgeCheck size={14} />, free: false, basic: false, pro: true, business: true },
  { label: 'Reviews & ratings', icon: <Star size={14} />, free: true, basic: true, pro: true, business: true },
  { label: 'Map pin location', icon: <Check size={14} />, free: true, basic: true, pro: true, business: true },
]

const PLAN_META = {
  FREE:     { icon: <Shield size={20} />,  color: 'text-gray-500',   bg: 'bg-gray-50',   highlight: false, tag: null },
  BASIC:    { icon: <Zap size={20} />,     color: 'text-blue-500',   bg: 'bg-blue-50',   highlight: false, tag: null },
  PRO:      { icon: <Star size={20} />,    color: 'text-brand',      bg: 'bg-brand-light', highlight: true, tag: 'Most popular' },
  BUSINESS: { icon: <Crown size={20} />,   color: 'text-amber-500',  bg: 'bg-amber-50',  highlight: false, tag: 'Best for businesses' },
}

function FeatureValue({ value }) {
  if (value === true)  return <Check size={16} className="text-emerald-500 mx-auto" />
  if (value === false) return <XIcon size={14} className="text-border-2 mx-auto" />
  return <span className="text-[12.5px] font-semibold text-ink">{value}</span>
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

  const sortedPlans = [...(plans || [])].sort((a, b) => a.sort_order - b.sort_order)

  const PLAN_COLUMNS = ['FREE', 'BASIC', 'PRO', 'BUSINESS']

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar />
      <main className="flex-1">

        {/* Header */}
        <div className="bg-gradient-to-br from-brand to-indigo-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-14 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
              Simple, honest pricing
            </h1>
            <p className="text-white/80 text-base max-w-xl mx-auto">
              Start free and grow. Every plan gives you a full public profile — upgrade when you need more reach or visibility.
            </p>
            <p className="text-white/50 text-sm mt-3">All prices in Ethiopian Birr · Billed monthly</p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">

          {/* Plan cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="bg-surface border border-border rounded-2xl h-48 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
              {sortedPlans.map(plan => {
                const meta = PLAN_META[plan.name] || PLAN_META.FREE
                const isCurrent = plan.name === currentPlanName
                const isPro = plan.name === 'PRO'

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ${
                      isPro
                        ? 'border-2 border-brand shadow-xl shadow-brand/10'
                        : isCurrent
                        ? 'border-2 border-brand/30'
                        : 'border border-border hover:shadow-md'
                    } bg-surface`}
                  >
                    {meta.tag && (
                      <div className={`text-center py-1.5 text-[11px] font-bold uppercase tracking-widest ${
                        isPro ? 'bg-brand text-white' : 'bg-amber-400 text-amber-900'
                      }`}>
                        {meta.tag}
                      </div>
                    )}

                    <div className="p-5 flex flex-col flex-1">
                      {/* Icon + name */}
                      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center mb-3`}>
                        <span className={meta.color}>{meta.icon}</span>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[15px] font-bold text-ink">{plan.display_name}</h3>
                        {isCurrent && <Badge variant="brand" size="xs">Current</Badge>}
                      </div>

                      {/* Price */}
                      <div className="my-4">
                        {plan.price_etb === 0 || plan.price_etb === '0.00' ? (
                          <div>
                            <span className="text-3xl font-extrabold text-ink">Free</span>
                            <p className="text-[12px] text-ink-3 mt-0.5">Forever</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-end gap-1">
                              <span className="text-3xl font-extrabold text-ink">
                                {Number(plan.price_etb).toLocaleString()}
                              </span>
                              <span className="text-ink-3 text-sm mb-0.5">ETB/mo</span>
                            </div>
                            <p className="text-[12px] text-ink-3 mt-0.5">Billed monthly</p>
                          </div>
                        )}
                      </div>

                      {/* Key highlights for this plan */}
                      <div className="flex-1 space-y-2 mb-5">
                        {plan.name === 'FREE' && (
                          <>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Full public profile</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Up to 3 services</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Contact & social links</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Reviews & ratings</p>
                          </>
                        )}
                        {plan.name === 'BASIC' && (
                          <>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Everything in Free</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Up to 10 services</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> 10 portfolio items</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> All social links</p>
                          </>
                        )}
                        {plan.name === 'PRO' && (
                          <>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Everything in Basic</p>
                            <p className="text-[12.5px] font-semibold text-brand flex gap-2"><Star size={13} className="shrink-0 mt-0.5 fill-brand" /> Featured in search results</p>
                            <p className="text-[12.5px] font-semibold text-brand flex gap-2"><BadgeCheck size={13} className="shrink-0 mt-0.5" /> Verified badge eligible</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> 50 services & portfolio</p>
                          </>
                        )}
                        {plan.name === 'BUSINESS' && (
                          <>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Everything in Pro</p>
                            <p className="text-[12.5px] font-semibold text-amber-600 flex gap-2"><Crown size={13} className="shrink-0 mt-0.5" /> Top placement in search</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Unlimited everything</p>
                            <p className="text-[12.5px] text-ink-2 flex gap-2"><Check size={13} className="text-emerald-500 shrink-0 mt-0.5" /> Priority verification</p>
                          </>
                        )}
                      </div>

                      {/* CTA */}
                      {isCurrent ? (
                        <div className="w-full h-9 flex items-center justify-center rounded-lg border border-border text-[13px] text-ink-3 font-medium bg-surface-2">
                          Current plan
                        </div>
                      ) : plan.name === 'FREE' ? (
                        <Button variant="secondary" fullWidth onClick={() => !isLoggedIn && navigate('/register')}>
                          {isLoggedIn ? 'Your default plan' : 'Get started free'}
                        </Button>
                      ) : (
                        <Button
                          variant={isPro ? 'primary' : 'outline'}
                          fullWidth
                          loading={checkout.isPending}
                          onClick={() => handleSelect(plan)}
                        >
                          {isLoggedIn ? `Upgrade to ${plan.display_name}` : 'Get started'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Feature comparison table */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-12">
            <div className="px-6 py-4 border-b border-border bg-surface-2">
              <h2 className="text-[15px] font-bold text-ink">Full feature comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-[12px] font-semibold text-ink-3 uppercase tracking-widest w-1/2">Feature</th>
                    {PLAN_COLUMNS.map(p => (
                      <th key={p} className={`px-4 py-3 text-center text-[12px] font-bold ${p === 'PRO' ? 'text-brand' : 'text-ink'}`}>
                        {p === 'FREE' ? 'Free' : p === 'BASIC' ? 'Basic' : p === 'PRO' ? 'Pro' : 'Business'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {FEATURES.map(feat => (
                    <tr key={feat.label} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 text-[13px] text-ink-2">
                          <span className="text-ink-3">{feat.icon}</span>
                          {feat.label}
                        </div>
                      </td>
                      {PLAN_COLUMNS.map(p => (
                        <td key={p} className={`px-4 py-3 text-center ${p === 'PRO' ? 'bg-brand-light/30' : ''}`}>
                          <FeatureValue value={feat[p.toLowerCase()]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-border">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes. Your plan stays active until the end of the billing period. No long-term contracts or penalties.' },
              { q: 'What payment methods?', a: 'Telebirr, CBE Birr, Amole, and all major Ethiopian payment methods via Chapa.' },
              { q: 'What happens when I downgrade?', a: 'You keep access until the billing period ends. After that, your content is preserved but hidden if it exceeds Free plan limits.' },
            ].map(({ q, a }) => (
              <div key={q} className="p-5 bg-surface border border-border rounded-xl">
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
