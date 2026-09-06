import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, XCircle, AlertCircle, HelpCircle } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { usePaymentStatus, useCancelCheckout } from '../features/subscriptions/hooks/useSubscriptions.js'

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref')

  const { data, isLoading, isError } = usePaymentStatus(txRef)
  const cancel = useCancelCheckout()

  useEffect(() => {
    if (data?.status === 'success') {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'my'] })
      navigate('/subscription/success', { replace: true })
    }
  }, [data?.status, navigate, queryClient])

  async function handleCancel() {
    if (txRef) {
      try { await cancel.mutateAsync(txRef) } catch { /* non-critical */ }
    }
    navigate('/pricing', { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">

          {/* No tx_ref */}
          {!txRef && (
            <div className="flex flex-col items-center gap-4">
              <HelpCircle size={48} className="text-ink-3" />
              <h2 className="text-xl font-bold text-ink">Missing payment reference</h2>
              <p className="text-sm text-ink-2">We couldn't find your payment reference. Check your subscription status below.</p>
              <Button variant="primary" onClick={() => navigate('/dashboard/subscription')}>View subscription</Button>
            </div>
          )}

          {/* Processing */}
          {txRef && (data?.status === 'pending' || isLoading) && (
            <div className="flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center">
                <Loader2 size={28} className="text-brand animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink mb-2">Processing your payment…</h2>
                <p className="text-sm text-ink-2 mb-1">Confirming with Chapa. This usually takes a few seconds.</p>
                <p className="text-xs text-ink-3">
                  Reference: <code className="bg-surface-2 px-1.5 py-0.5 rounded text-[11px]">{txRef}</code>
                </p>
              </div>
              <Button variant="ghost" size="sm" loading={cancel.isPending} onClick={handleCancel}>
                Cancel and go back
              </Button>
            </div>
          )}

          {/* Failed */}
          {txRef && data?.status === 'failed' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-danger-bg flex items-center justify-center">
                <XCircle size={28} className="text-danger" />
              </div>
              <h2 className="text-xl font-bold text-ink">Payment failed</h2>
              <p className="text-sm text-ink-2">Your payment could not be processed. You have not been charged.</p>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => navigate('/pricing')}>Try again</Button>
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>Dashboard</Button>
              </div>
            </div>
          )}

          {/* Error fetching status */}
          {txRef && isError && !isLoading && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-warning-bg flex items-center justify-center">
                <AlertCircle size={28} className="text-warning" />
              </div>
              <h2 className="text-xl font-bold text-ink">Could not verify payment</h2>
              <p className="text-sm text-ink-2">We couldn't check your payment status. Your subscription page will show the latest status.</p>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => navigate('/dashboard/subscription')}>Check subscription</Button>
                <Button variant="secondary" onClick={() => navigate('/pricing')}>Back to pricing</Button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
