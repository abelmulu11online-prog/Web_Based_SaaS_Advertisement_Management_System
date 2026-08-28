/**
 * PaymentCallbackPage.jsx — Landing page after Chapa redirects the user back.
 *
 * Chapa appends ?tx_ref=<ref> to the return_url. This page:
 *  1. Reads tx_ref from the URL query string
 *  2. Polls GET /payment-status/:tx_ref every 3 seconds
 *  3. Redirects to /subscription/success once payment is confirmed
 *  4. Offers a cancel button that marks the payment FAILED and returns to /pricing
 *
 * Route: /subscription/callback
 */
import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { usePaymentStatus, useCancelCheckout } from '../features/subscriptions/hooks/useSubscriptions.js'

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Chapa appends tx_ref (sometimes trx_ref in older API versions)
  const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref')

  const { data, isLoading, isError } = usePaymentStatus(txRef)
  const cancel = useCancelCheckout()

  // Navigate to success page once payment is confirmed
  useEffect(() => {
    if (data?.status === 'success') {
      // Invalidate subscription cache so the success page shows fresh data
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'my'] })
      navigate('/subscription/success', { replace: true })
    }
  }, [data?.status, navigate, queryClient])

  const handleCancel = async () => {
    if (txRef) {
      try {
        await cancel.mutateAsync(txRef)
      } catch {
        // Non-critical — navigate anyway
      }
    }
    navigate('/pricing', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>

        {/* No tx_ref — something went wrong */}
        {!txRef && (
          <div>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>❓</div>
            <h2 style={{ color: 'var(--text-h)', margin: '0 0 12px' }}>Missing payment reference</h2>
            <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
              We couldn't find your payment reference. Please check your subscription status.
            </p>
            <Button variant="primary" onClick={() => navigate('/dashboard/subscription')}>
              View Subscription
            </Button>
          </div>
        )}

        {/* Processing / polling */}
        {txRef && (data?.status === 'pending' || isLoading) && (
          <div>
            <div
              style={{
                fontSize: '56px',
                marginBottom: '16px',
                animation: 'spin 1.5s linear infinite',
                display: 'inline-block',
              }}
            >
              ⏳
            </div>
            <h2 style={{ color: 'var(--text-h)', margin: '0 0 12px' }}>Processing your payment…</h2>
            <p style={{ color: 'var(--text)', marginBottom: '8px' }}>
              We're confirming your payment with Chapa. This usually takes a few seconds.
            </p>
            <p style={{ color: 'var(--text)', fontSize: '13px', marginBottom: '24px' }}>
              Reference:{' '}
              <code style={{ background: 'var(--code-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                {txRef}
              </code>
            </p>
            <Button
              variant="secondary"
              loading={cancel.isPending}
              onClick={handleCancel}
            >
              Cancel &amp; go back
            </Button>
          </div>
        )}

        {/* Failed */}
        {txRef && data?.status === 'failed' && (
          <div>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ color: '#dc2626', margin: '0 0 12px' }}>Payment failed</h2>
            <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
              Your payment could not be processed. You have not been charged.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => navigate('/pricing')}>Try Again</Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
          </div>
        )}

        {/* Error fetching status */}
        {txRef && isError && !isLoading && (
          <div>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: 'var(--text-h)', margin: '0 0 12px' }}>Could not verify payment</h2>
            <p style={{ color: 'var(--text)', marginBottom: '24px' }}>
              We couldn't check your payment status. Your subscription page will show the latest status.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => navigate('/dashboard/subscription')}>
                Check Subscription
              </Button>
              <Button variant="secondary" onClick={() => navigate('/pricing')}>
                Back to Pricing
              </Button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
