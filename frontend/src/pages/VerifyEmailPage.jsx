/**
 * VerifyEmailPage.jsx
 *
 * Handles the link users click in their verification email.
 * URL pattern: /verify-email?token=<raw_token>
 *
 * States:
 *   verifying  — API call in flight (auto-triggered on mount)
 *   success    — email verified, user can proceed to login/dashboard
 *   error      — invalid / expired / already-used token
 *   resending  — user requested a new email
 *   resent     — resend succeeded
 */
import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Mail, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { verifyEmail, resendVerification } from '../features/auth/services/authService.js'

export default function VerifyEmailPage() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const token           = searchParams.get('token')

  const [status,  setStatus]  = useState('verifying') // verifying | success | error | no-token
  const [errMsg,  setErrMsg]  = useState('')
  const [errCode, setErrCode] = useState('')

  // Resend sub-form
  const [resendEmail,   setResendEmail]   = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone,    setResendDone]    = useState(false)
  const [resendErr,     setResendErr]     = useState('')

  /* ── Auto-verify on mount ─────────────────────────────────────────── */
  useEffect(() => {
    if (!token) { setStatus('no-token'); return }

    verifyEmail(token)
      .then(() => {
        // Redirect to login page with a success message
        navigate('/login', { state: { verified: true }, replace: true })
      })
      .catch(err => {
        const code = err?.response?.data?.code || ''
        const msg  = err?.response?.data?.message || 'Verification failed. The link may be invalid or expired.'
        setErrCode(code)
        setErrMsg(msg)
        setStatus('error')
      })
  }, [token])

  /* ── Resend handler ───────────────────────────────────────────────── */
  async function handleResend(e) {
    e.preventDefault()
    if (!resendEmail.trim()) { setResendErr('Please enter your email address.'); return }
    setResendLoading(true)
    setResendErr('')
    try {
      await resendVerification(resendEmail.trim().toLowerCase())
      setResendDone(true)
    } catch {
      setResendErr('Something went wrong. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  /* ── Shared page shell ────────────────────────────────────────────── */
  const Shell = ({ children }) => (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[440px]">
          {children}
        </div>
      </div>
    </div>
  )

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (status === 'verifying') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-5">
            <Loader2 size={28} className="text-brand animate-spin-slow" />
          </div>
          <h1 className="text-[20px] font-bold text-ink mb-2">Verifying your email…</h1>
          <p className="text-[14px] text-ink-2">This will only take a moment.</p>
        </div>
      </Shell>
    )
  }

  /* ── Success ──────────────────────────────────────────────────────── */
  if (status === 'success') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-success-bg border border-green-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={30} className="text-success" />
          </div>
          <h1 className="text-[22px] font-bold text-ink mb-2 tracking-tight">
            Email verified!
          </h1>
          <p className="text-[14px] text-ink-2 mb-8 leading-relaxed max-w-sm mx-auto">
            Your email address has been confirmed. Your GebetaPro account is now fully active.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              iconRight={<ArrowRight size={15} />}
              onClick={() => navigate('/dashboard')}
              className="rounded-xl"
            >
              Go to dashboard
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/directory')}
              className="rounded-xl"
            >
              Browse directory
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  /* ── No token in URL ──────────────────────────────────────────────── */
  if (status === 'no-token') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-ink-3" />
          </div>
          <h1 className="text-[20px] font-bold text-ink mb-2">Check your inbox</h1>
          <p className="text-[14px] text-ink-2 mb-8 leading-relaxed max-w-sm mx-auto">
            We sent a verification link to your email. Click the link in that email to activate your account.
          </p>
          <ResendForm
            email={resendEmail}
            setEmail={setResendEmail}
            onSubmit={handleResend}
            loading={resendLoading}
            done={resendDone}
            error={resendErr}
          />
        </div>
      </Shell>
    )
  }

  /* ── Error ────────────────────────────────────────────────────────── */
  const isExpired   = errCode === 'TOKEN_EXPIRED'
  const isAlreadyUsed = errCode === 'TOKEN_ALREADY_USED'

  return (
    <Shell>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-danger-bg border border-red-200 flex items-center justify-center mx-auto mb-5">
          <XCircle size={28} className="text-danger" />
        </div>
        <h1 className="text-[20px] font-bold text-ink mb-2">
          {isAlreadyUsed ? 'Already verified' : isExpired ? 'Link expired' : 'Verification failed'}
        </h1>
        <p className="text-[14px] text-ink-2 mb-6 leading-relaxed max-w-sm mx-auto">
          {isAlreadyUsed
            ? 'This verification link has already been used. Your email is confirmed — you can log in.'
            : isExpired
            ? 'This verification link has expired. Request a fresh one below and check your inbox.'
            : errMsg}
        </p>

        {isAlreadyUsed ? (
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/login')}
            className="rounded-xl"
          >
            Log in
          </Button>
        ) : (
          resendDone ? (
            <div className="bg-success-bg border border-green-200 rounded-xl px-5 py-4 text-[13.5px] text-success font-medium">
              ✓ A new verification email is on its way. Check your inbox.
            </div>
          ) : (
            <ResendForm
              email={resendEmail}
              setEmail={setResendEmail}
              onSubmit={handleResend}
              loading={resendLoading}
              done={resendDone}
              error={resendErr}
            />
          )
        )}

        <p className="text-[13px] text-ink-3 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </Shell>
  )
}

/* ── Resend sub-form ────────────────────────────────────────────────────────── */
function ResendForm({ email, setEmail, onSubmit, loading, done, error }) {
  if (done) {
    return (
      <div className="bg-success-bg border border-green-200 rounded-xl px-5 py-4 text-[13.5px] text-success font-medium">
        ✓ A new verification email is on its way. Check your inbox.
      </div>
    )
  }
  return (
    <form onSubmit={onSubmit} className="text-left bg-surface border border-border rounded-2xl p-5">
      <p className="text-[13px] font-semibold text-ink mb-3">Resend verification email</p>
      <FormField error={error}>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={error}
            className="pl-9"
            autoComplete="email"
          />
        </div>
      </FormField>
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={loading}
        icon={<RefreshCw size={13} />}
        fullWidth
        className="mt-3 rounded-lg"
      >
        Send new link
      </Button>
    </form>
  )
}
