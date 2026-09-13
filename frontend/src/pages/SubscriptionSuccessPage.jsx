import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Megaphone, LayoutDashboard, ArrowRight } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { useMySubscription } from '../features/subscriptions/hooks/useSubscriptions.js'

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate()
  const { data: sub, isLoading } = useMySubscription()

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16" id="main-content">
        <div className="w-full max-w-md">

          {/* Success icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={36} className="text-success" />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">Payment successful!</h1>
            <p className="text-sm text-ink-2">Your subscription is now active.</p>
          </div>

          {/* Plan details card */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden mb-5">
            {isLoading ? (
              <div className="p-5 flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            ) : sub ? (
              <div className="divide-y divide-border">
                <div className="px-5 py-4 bg-success-bg">
                  <p className="text-xs text-success font-semibold uppercase tracking-widest mb-0.5">Active plan</p>
                  <p className="text-xl font-bold text-ink">{sub.plan.display_name}</p>
                </div>
                <div className="px-5 py-4 flex flex-col gap-2.5">
                  {[
                    ['Active listings', sub.plan.max_active_ads],
                    ['Images per ad', sub.plan.max_images_per_ad],
                    ['Featured badge', sub.plan.is_featured ? 'Yes' : 'No'],
                    sub.current_period_end && ['Renews', new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} className="flex justify-between text-[13px]">
                      <span className="text-ink-2">{label}</span>
                      <span className="font-medium text-ink">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-5 text-sm text-ink-2">Your subscription has been activated. It may take a moment to update.</div>
            )}
          </div>

          {/* What's next */}
          <div className="bg-surface border border-border rounded-xl p-5 mb-6">
            <h3 className="text-[13px] font-semibold text-ink mb-3">What's next?</h3>
            <ul className="flex flex-col gap-2.5">
              {[
                'Post your first advertisement',
                'Add photos to make your listing stand out',
                'Share your listing link with potential customers',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-[13px] text-ink-2">
                  <ArrowRight size={12} className="text-brand shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button variant="primary" fullWidth icon={<Megaphone size={14} />} onClick={() => navigate('/dashboard/advertisements/new')}>
              Post an ad now
            </Button>
            <Button variant="secondary" fullWidth icon={<LayoutDashboard size={14} />} onClick={() => navigate('/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
