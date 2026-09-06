/**
 * RegisterPage.jsx
 *
 * After successful registration the user sees a "check your email" screen
 * instead of being auto-logged in. This enforces email verification as the
 * first step before accessing the platform.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react'
import { Navbar }    from '../components/layout/Navbar.jsx'
import { Button }    from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { register, resendVerification } from '../features/auth/services/authService.js'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: v => v.length >= 8 },
  { label: 'Uppercase letter',       test: v => /[A-Z]/.test(v) },
  { label: 'Number',                 test: v => /[0-9]/.test(v) },
  { label: 'Special character',      test: v => /[^a-zA-Z0-9]/.test(v) },
]

export default function RegisterPage() {
  const [form,        setForm]        = useState({ email: '', password: '', confirm: '' })
  const [errors,      setErrors]      = useState({})
  const [serverError, setServerError] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [registered,  setRegistered]  = useState(false)  // show "check email" screen

  // Resend state
  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone,    setResendDone]    = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
    setServerError('')
  }

  function validate() {
    const e = {}
    if (!form.email)    e.email    = 'Email is required.'
    if (!form.password) e.password = 'Password is required.'
    else if (PASSWORD_RULES.some(r => !r.test(form.password)))
      e.password = 'Password does not meet all requirements.'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }

    setLoading(true)
    try {
      await register({ email: form.email.trim().toLowerCase(), password: form.password })
      // Show "check your email" screen — do NOT auto-login
      setRegistered(true)
    } catch (err) {
      setServerError(err?.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendLoading(true)
    try {
      await resendVerification(form.email.trim().toLowerCase())
      setResendDone(true)
    } catch {
      // silently ignore — backend never reveals if email exists
      setResendDone(true)
    } finally {
      setResendLoading(false)
    }
  }

  const pwStrength = PASSWORD_RULES.filter(r => r.test(form.password)).length

  /* ── Check-your-email screen ──────────────────────────────────────── */
  if (registered) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-[440px] text-center">

            {/* Icon */}
            <div className="w-20 h-20 rounded-3xl bg-brand-light border border-brand-border flex items-center justify-center mx-auto mb-6">
              <Mail size={34} className="text-brand" />
            </div>

            <h1 className="text-[24px] font-bold text-ink mb-2 tracking-tight">
              Check your inbox
            </h1>
            <p className="text-[15px] text-ink-2 leading-relaxed mb-1">
              We sent a verification link to
            </p>
            <p className="text-[15px] font-semibold text-ink mb-5">
              {form.email}
            </p>
            <p className="text-[13.5px] text-ink-3 leading-relaxed mb-8 max-w-xs mx-auto">
              Click the link in the email to activate your account.
              The link expires in 24 hours.
            </p>

            {/* Resend */}
            {resendDone ? (
              <div className="inline-flex items-center gap-2 text-[13px] text-success font-medium bg-success-bg border border-green-200 px-4 py-2.5 rounded-xl mb-6">
                <CheckCircle2 size={14} />
                Resent! Check your inbox again.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="inline-flex items-center gap-1.5 text-[13px] text-brand hover:text-brand-hover font-medium mb-6 disabled:opacity-50 transition-colors"
              >
                {resendLoading
                  ? <RefreshCw size={13} className="animate-spin-slow" />
                  : <RefreshCw size={13} />
                }
                Didn't receive it? Resend
              </button>
            )}

            {/* Help text */}
            <div className="bg-surface border border-border rounded-2xl p-5 text-left space-y-2.5 mb-6">
              <p className="text-[12.5px] font-semibold text-ink uppercase tracking-wide">Can't find the email?</p>
              {[
                'Check your spam or junk folder',
                'Make sure you entered the right email address',
                'Wait a minute — sometimes delivery takes a moment',
              ].map(tip => (
                <div key={tip} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-border mt-2 shrink-0" />
                  <p className="text-[13px] text-ink-2">{tip}</p>
                </div>
              ))}
            </div>

            <p className="text-[13px] text-ink-3">
              Already verified?{' '}
              <Link to="/login" className="text-brand font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Registration form ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-ink mb-1.5">Create your account</h1>
            <p className="text-sm text-ink-2">
              Already have an account?{' '}
              <Link to="/login" className="text-brand font-medium hover:underline">Log in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Email */}
            <FormField label="Email address" required error={errors.email}>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  error={errors.email}
                  className="pl-9"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </FormField>

            {/* Password */}
            <FormField label="Password" required error={errors.password}>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  error={errors.password}
                  className="pl-9 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-2">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors duration-200 ${
                          i < pwStrength
                            ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-brand'][pwStrength - 1]
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {PASSWORD_RULES.map(r => (
                      <span
                        key={r.label}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                          r.test(form.password) ? 'text-success' : 'text-ink-3'
                        }`}
                      >
                        <CheckCircle2 size={10} />
                        {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </FormField>

            {/* Confirm password */}
            <FormField label="Confirm password" required error={errors.confirm}>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  error={errors.confirm}
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
            </FormField>

            {serverError && (
              <div className="bg-danger-bg border border-red-200 rounded-lg px-3.5 py-2.5 text-[13px] text-danger">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              className="mt-1 rounded-xl"
            >
              Create account
            </Button>
          </form>

          <p className="text-center text-[12px] text-ink-3 mt-5 leading-relaxed">
            You'll need to verify your email before logging in.
          </p>
        </div>
      </div>
    </div>
  )
}
