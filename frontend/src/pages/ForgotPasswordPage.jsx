/**
 * ForgotPasswordPage.jsx
 *
 * Lets users request a password reset email.
 * Two states: form | sent
 *
 * The backend always returns a 200 regardless of whether the email
 * exists (enumeration protection), so the UI always shows the sent state.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, SendHorizonal } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { forgotPassword } from '../features/auth/services/authService.js'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError('Please enter your email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Enter a valid email address.'); return }

    setLoading(true)
    setError('')
    try {
      await forgotPassword(trimmed)
      setSent(true)
    } catch (err) {
      // Only show an error for genuine server failures — never for "email not found"
      const status = err?.response?.status
      if (status && status >= 500) {
        setError('Something went wrong on our end. Please try again in a moment.')
      } else {
        // Treat all 4xx the same as success (enumeration protection)
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px]">

          {sent ? (
            /* ── Sent state ─────────────────────────────────────────── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-brand" />
              </div>
              <h1 className="text-[22px] font-bold text-ink mb-2 tracking-tight">
                Check your inbox
              </h1>
              <p className="text-[14px] text-ink-2 mb-2 leading-relaxed max-w-sm mx-auto">
                If <strong className="text-ink">{email}</strong> is associated with a GebetaPro
                account, you'll receive a password reset link shortly.
              </p>
              <p className="text-[13px] text-ink-3 mb-8 max-w-xs mx-auto">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>

              {/* Allow re-sending */}
              <button
                type="button"
                onClick={() => { setSent(false) }}
                className="text-[13px] text-brand hover:underline font-medium mb-6 block mx-auto"
              >
                Didn't receive it? Try again
              </button>

              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink hover:no-underline transition-colors"
              >
                <ArrowLeft size={13} />
                Back to log in
              </Link>
            </div>
          ) : (
            /* ── Form state ─────────────────────────────────────────── */
            <>
              <div className="mb-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink hover:no-underline transition-colors mb-5"
                >
                  <ArrowLeft size={13} />
                  Back to log in
                </Link>
                <h1 className="text-[24px] font-bold text-ink mb-1.5 tracking-tight">
                  Forgot your password?
                </h1>
                <p className="text-[14px] text-ink-2 leading-relaxed">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <FormField label="Email address" required error={error}>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
                    />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      error={error}
                      className="pl-9"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  fullWidth
                  iconRight={<SendHorizonal size={15} />}
                  className="rounded-xl mt-1"
                >
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
