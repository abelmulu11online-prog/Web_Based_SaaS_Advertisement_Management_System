import { useNavigate, Link } from 'react-router-dom'
import {
  Eye, TrendingUp, CreditCard, ArrowRight, Star,
  CheckCircle2, Circle, AlertCircle, Users, MessageSquare,
  Plus, BadgeCheck, Edit3
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { useMyProfile, useProfileCompletion, useUpdateProfile } from '../features/profiles/hooks/useProfile.js'
import { useMySubscription } from '../features/subscriptions/hooks/useSubscriptions.js'

function StatCard({ label, value, icon, loading, sub }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11.5px] font-semibold text-ink-3 uppercase tracking-widest">{label}</span>
        <span className="text-ink-3">{icon}</span>
      </div>
      {loading
        ? <Skeleton className="h-7 w-16" />
        : <div className="text-2xl font-extrabold text-ink tracking-tight">{value ?? '—'}</div>
      }
      {sub && <p className="text-[11.5px] text-ink-3 mt-1">{sub}</p>}
    </div>
  )
}

function CompletionBar({ score }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="w-full bg-border rounded-full h-2 overflow-hidden">
      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')

  const { data: profile, isLoading: profileLoading } = useMyProfile()
  const { data: completion, isLoading: completionLoading } = useProfileCompletion()
  const { data: subscription, isLoading: subLoading } = useMySubscription()
  const updateProfile = useUpdateProfile()

  if (!isLoggedIn) {
    return (
      <DashboardLayout title={t('dashboard.title')}>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-ink-2">{t('dashboard.loginRequired')}</p>
          <Button variant="primary" onClick={() => navigate('/login')}>{t('dashboard.login')}</Button>
        </div>
      </DashboardLayout>
    )
  }

  const score = completion?.score ?? 0
  const checks = completion?.checks ?? []
  const incompleteChecks = checks.filter(c => !c.done).slice(0, 4)
  const isPublished = profile?.is_published ?? false
  const planName = subscription?.plan?.display_name || t('pricing.free')

  const QUICK_ACTIONS = [
    { label: t('dashboard.quickActions.editProfileInfo'), to: '/dashboard/profile',              icon: <Edit3 size={15} /> },
    { label: t('dashboard.quickActions.services'),        to: '/dashboard/profile/services',      icon: <Plus size={15} /> },
    { label: t('dashboard.quickActions.portfolio'),       to: '/dashboard/profile/portfolio',     icon: <Plus size={15} /> },
    { label: t('dashboard.quickActions.socialLinks'),     to: '/dashboard/profile/social-links',  icon: <Plus size={15} /> },
    { label: t('dashboard.quickActions.businessHours'),   to: '/dashboard/profile/hours',         icon: <Plus size={15} /> },
    { label: t('dashboard.quickActions.posts'),           to: '/dashboard/profile/posts',         icon: <Plus size={15} /> },
    { label: t('dashboard.quickActions.achievements'),    to: '/dashboard/profile/achievements',  icon: <Plus size={15} /> },
  ]

  return (
    <DashboardLayout title={t('dashboard.overview')}>
      <div className="flex flex-col gap-7">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">
              {profile ? t('dashboard.welcome', { name: profile.display_name || '' }) : t('dashboard.title')}
            </h2>
            <p className="text-sm text-ink-2 mt-0.5">{t('dashboard.yourPresence')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {profile?.slug && (
              <Link to={`/p/${profile.slug}`} target="_blank">
                <Button variant="ghost" size="sm" icon={<Eye size={13} />}>{t('dashboard.viewProfile')}</Button>
              </Link>
            )}
            <Button variant="primary" size="sm" icon={<Edit3 size={13} />} onClick={() => navigate('/dashboard/profile')}>
              {t('dashboard.editProfile')}
            </Button>
          </div>
        </div>

        {/* Profile completion */}
        {!completionLoading && (
          <div className={`rounded-2xl border p-5 ${score >= 80 ? 'bg-emerald-50 border-emerald-200' : score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className={`text-[13.5px] font-bold ${score >= 80 ? 'text-emerald-700' : score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                  {t('dashboard.profileComplete', { score })}
                  {score >= 80 && ' 🎉'}
                </p>
                <p className="text-[12px] text-ink-2 mt-0.5">
                  {score < 100 ? t('dashboard.rankHigher') : t('dashboard.fullyComplete')}
                </p>
              </div>
              <span className={`text-xl font-extrabold ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {score}%
              </span>
            </div>
            <CompletionBar score={score} />
            {incompleteChecks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {incompleteChecks.map(c => (
                  <span key={c.key} className="inline-flex items-center gap-1 text-[11.5px] text-ink-2 bg-white/70 px-2.5 py-1 rounded-full border border-white">
                    <Circle size={9} className="text-ink-3" /> {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Published status */}
        <div className={`flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border ${isPublished ? 'bg-emerald-50 border-emerald-200' : 'bg-surface border-border'}`}>
          <div className="flex items-center gap-3">
            {isPublished
              ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              : <AlertCircle size={18} className="text-amber-500 shrink-0" />
            }
            <div>
              <p className={`text-[13.5px] font-semibold ${isPublished ? 'text-emerald-700' : 'text-ink'}`}>
                {isPublished ? t('dashboard.profileLive') : t('dashboard.notPublished')}
              </p>
              <p className="text-[12px] text-ink-2">
                {isPublished ? t('dashboard.visitorsFind') : t('dashboard.publish')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={isPublished ? 'secondary' : 'primary'}
              size="sm"
              loading={updateProfile.isPending}
              onClick={() => profile && updateProfile.mutate({ is_published: !isPublished })}
            >
              {isPublished ? t('dashboard.unpublish') : t('dashboard.publishNow')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/profile')}>
              {t('dashboard.edit')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t('dashboard.stats.profileViews')}  value="—" icon={<Eye size={15} />} sub={t('dashboard.stats.last30Days')} />
          <StatCard label={t('dashboard.stats.contactClicks')} value="—" icon={<TrendingUp size={15} />} sub={t('dashboard.stats.last30Days')} />
          <StatCard label={t('dashboard.stats.reviews')} value={profile?.review_count ?? '—'} icon={<Star size={15} />} loading={profileLoading} />
          <StatCard label={t('dashboard.stats.plan')} value={subLoading ? '—' : planName} icon={<CreditCard size={15} />} loading={subLoading} />
        </div>

        {/* Subscription */}
        {!subLoading && subscription && (
          <div className={`flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border ${subscription.status === 'ACTIVE' ? 'bg-blue-50 border-blue-200' : 'bg-warning-bg border-yellow-200'}`}>
            <div>
              <p className={`text-[13px] font-bold ${subscription.status === 'ACTIVE' ? 'text-blue-700' : 'text-warning'}`}>
                {planName} · {subscription.status}
              </p>
              {subscription.days_remaining != null && (
                <p className="text-[12px] text-ink-2 mt-0.5">
                  {subscription.days_remaining > 0
                    ? t('dashboard.subscription.daysRemaining', { days: subscription.days_remaining })
                    : t('dashboard.subscription.expired')}
                </p>
              )}
            </div>
            <Link to="/pricing">
              <Button variant="ghost" size="sm">
                {subscription.plan?.name === 'FREE'
                  ? t('dashboard.subscription.upgrade')
                  : t('dashboard.subscription.manage')}
              </Button>
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h3 className="text-[15px] font-bold text-ink mb-3">{t('dashboard.manageProfile')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ label, to, icon }) => (
              <Link key={to} to={to}
                className="flex items-center gap-2.5 p-3.5 bg-surface border border-border rounded-xl hover:border-brand hover:shadow-sm transition-all group hover:no-underline"
              >
                <span className="text-ink-3 group-hover:text-brand transition-colors">{icon}</span>
                <span className="text-[13px] font-medium text-ink">{label}</span>
                <ArrowRight size={12} className="ml-auto text-ink-4 group-hover:text-brand transition-colors" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
