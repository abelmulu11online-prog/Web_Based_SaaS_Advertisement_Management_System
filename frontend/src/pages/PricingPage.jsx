import { useNavigate } from 'react-router-dom'
import {
  Check, X as XIcon, Star, Zap, Shield, Crown,
  Wrench, FolderOpen, FileText, Image, Link2,
  BadgeCheck, TrendingUp, Users
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { useSubscriptionPlans, useMySubscription, useCreateCheckoutSession } from '../features/subscriptions/hooks/useSubscriptions.js'

// Static plan meta without translated tags (tags computed inside component)
const PLAN_META_ICONS = {
  FREE:     { icon: <Shield size={20} />,  color: 'text-gray-500',   bg: 'bg-gray-50'      },
  BASIC:    { icon: <Zap size={20} />,     color: 'text-blue-500',   bg: 'bg-blue-50'      },
  PRO:      { icon: <Star size={20} />,    color: 'text-brand',      bg: 'bg-brand-light'  },
  BUSINESS: { icon: <Crown size={20} />,   color: 'text-amber-500',  bg: 'bg-amber-50'     },
}

function FeatureValue({ value }) {
  if (value === true)  return <Check size={16} className="text-emerald-500 mx-auto" />
  if (value === false) return <XIcon size={14} className="text-border-2 mx-auto" />
  return <span className="text-[12.5px] font-semibold text-ink">{value}</span>
}

export default function PricingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const { data: plans, isLoading } = useSubscriptionPlans()
  const { data: mySubscription } = useMySubscription()
  const checkout = useCreateCheckoutSession()

  const currentPlanName = mySubscription?.plan?.name || null

  // Feature rows — built inside component so labels re-render on language change
  const FEATURES = [
    { labelKey: 'features.publicProfile',  icon: <Users size={14} />,     free: true,   basic: true,        pro: true,        business: true        },
    { labelKey: 'features.servicesListed', icon: <Wrench size={14} />,    free: '3',    basic: '10',        pro: '50',        business: t('common.unlimited') },
    { labelKey: 'features.portfolioItems', icon: <FolderOpen size={14} />,free: '2',    basic: '10',        pro: '50',        business: t('common.unlimited') },
    { labelKey: 'features.posts',          icon: <FileText size={14} />,  free: '5',    basic: '20',        pro: '100',       business: t('common.unlimited') },
    { labelKey: 'features.galleryPhotos',  icon: <Image size={14} />,     free: '3',    basic: '10',        pro: '30',        business: t('common.unlimited') },
    { labelKey: 'features.socialLinks',    icon: <Link2 size={14} />,     free: '3',    basic: t('common.all'), pro: t('common.all'), business: t('common.all') },
    { labelKey: 'features.businessHours',  icon: <Check size={14} />,     free: true,   basic: true,        pro: true,        business: true        },
    { labelKey: 'features.contactButton',  icon: <Zap size={14} />,       free: true,   basic: true,        pro: true,        business: true        },
    { labelKey: 'features.featuredSearch', icon: <Star size={14} />,      free: false,  basic: false,       pro: true,        business: true        },
    { labelKey: 'features.topPlacement',   icon: <TrendingUp size={14} />,free: false,  basic: false,       pro: false,       business: true        },
    { labelKey: 'features.verifiedBadge',  icon: <BadgeCheck size={14} />,free: false,  basic: false,       pro: true,        business: true        },
    { labelKey: 'features.reviews',        icon: <Star size={14} />,      free: true,   basic: true,        pro: true,        business: true        },
    { labelKey: 'features.mapPin',         icon: <Check size={14} />,     free: true,   basic: true,        pro: true,        business: true        },
  ]

  const PLAN_META = {
    FREE:     { ...PLAN_META_ICONS.FREE,     highlight: false, tag: null },
    BASIC:    { ...PLAN_META_ICONS.BASIC,    highlight: false, tag: null },
    PRO:      { ...PLAN_META_ICONS.PRO,      highlight: true,  tag: t('pricing.mostPopular') },
    BUSINESS: { ...PLAN_META_ICONS.BUSINESS, highlight: false, tag: t('pricing.bestForBusiness') },
  }

  const PLAN_COLUMNS = ['FREE', 'BASIC', 'PRO', 'BUSINESS']

  function handleSelect(plan) {
    if (plan.name === 'FREE') return
    if (!isLoggedIn) { navigate('/register', { state: { from: '/pricing' } }); return }
    checkout.mutate({ planId: plan.id })
  }

  const sortedPlans = [...(plans || [])].sort((a, b) => a.sort_order - b.sort_order)

  const FAQ = [
    { q: t('pricing.faq.cancel_q'),   a: t('pricing.faq.cancel_a')   },
    { q: t('pricing.faq.payment_q'),  a: t('pricing.faq.payment_a')  },
    { q: t('pricing.faq.downgrade_q'),a: t('pricing.faq.downgrade_a')},
  ]

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar />
      <main className="flex-1" id="main-content">

        {/* Header */}
        <div className="bg-gradient-to-br from-brand to-indigo-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-14 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
              {t('pricing.title')}
            </h1>
            <p className="text-white/80 text-base max-w-xl mx-auto">
              {t('pricing.subtitle')}
            </p>
            <p className="text-white/50 text-sm mt-3">{t('pricing.currency')}</p>
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
                const highlights = [0,1,2,3].map(i => t(`pricing.planHighlights.${plan.name}.${i}`))

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
                      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center mb-3`}>
                        <span className={meta.color}>{meta.icon}</span>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[15px] font-bold text-ink">{plan.display_name}</h3>
                        {isCurrent && <Badge variant="brand" size="xs">{t('pricing.currentPlan')}</Badge>}
                      </div>

                      {/* Price */}
                      <div className="my-4">
                        {plan.price_etb === 0 || plan.price_etb === '0.00' ? (
                          <div>
                            <span className="text-3xl font-extrabold text-ink">{t('pricing.free')}</span>
                            <p className="text-[12px] text-ink-3 mt-0.5">{t('pricing.forever')}</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-end gap-1">
                              <span className="text-3xl font-extrabold text-ink">
                                {Number(plan.price_etb).toLocaleString()}
                              </span>
                              <span className="text-ink-3 text-sm mb-0.5">{t('pricing.etbPerMonth')}</span>
                            </div>
                            <p className="text-[12px] text-ink-3 mt-0.5">{t('pricing.billedMonthly')}</p>
                          </div>
                        )}
                      </div>

                      {/* Key highlights */}
                      <div className="flex-1 space-y-2 mb-5">
                        {highlights.map((hl, i) => (
                          <p key={i} className={`text-[12.5px] flex gap-2 ${
                            (plan.name === 'PRO' && i === 1) ? 'font-semibold text-brand' :
                            (plan.name === 'PRO' && i === 2) ? 'font-semibold text-brand' :
                            (plan.name === 'BUSINESS' && i === 1) ? 'font-semibold text-amber-600' :
                            'text-ink-2'
                          }`}>
                            {(plan.name === 'PRO' && i === 1) ? <Star size={13} className="shrink-0 mt-0.5 fill-brand" /> :
                             (plan.name === 'PRO' && i === 2) ? <BadgeCheck size={13} className="shrink-0 mt-0.5" /> :
                             (plan.name === 'BUSINESS' && i === 1) ? <Crown size={13} className="shrink-0 mt-0.5" /> :
                             <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />}
                            {hl}
                          </p>
                        ))}
                      </div>

                      {/* CTA */}
                      {isCurrent ? (
                        <div className="w-full h-9 flex items-center justify-center rounded-lg border border-border text-[13px] text-ink-3 font-medium bg-surface-2">
                          {t('pricing.currentPlan')}
                        </div>
                      ) : plan.name === 'FREE' ? (
                        <Button variant="secondary" fullWidth onClick={() => !isLoggedIn && navigate('/register')}>
                          {isLoggedIn ? t('pricing.yourDefaultPlan') : t('pricing.getStartedFree')}
                        </Button>
                      ) : (
                        <Button
                          variant={isPro ? 'primary' : 'outline'}
                          fullWidth
                          loading={checkout.isPending}
                          onClick={() => handleSelect(plan)}
                        >
                          {isLoggedIn ? t('pricing.upgrade', { plan: plan.display_name }) : t('pricing.getStarted')}
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
              <h2 className="text-[15px] font-bold text-ink">{t('pricing.featureComparison')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-[12px] font-semibold text-ink-3 uppercase tracking-widest w-1/2">
                      {t('pricing.feature')}
                    </th>
                    {PLAN_COLUMNS.map(p => (
                      <th key={p} className={`px-4 py-3 text-center text-[12px] font-bold ${p === 'PRO' ? 'text-brand' : 'text-ink'}`}>
                        {p === 'FREE' ? t('pricing.free') : p === 'BASIC' ? 'Basic' : p === 'PRO' ? 'Pro' : 'Business'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {FEATURES.map(feat => (
                    <tr key={feat.labelKey} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 text-[13px] text-ink-2">
                          <span className="text-ink-3">{feat.icon}</span>
                          {t(`pricing.${feat.labelKey}`)}
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
            {FAQ.map(({ q, a }) => (
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
