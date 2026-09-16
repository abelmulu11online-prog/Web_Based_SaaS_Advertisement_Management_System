/**
 * RegisterPage.jsx
 * After successful registration the user sees a "check your email" screen.
 * i18n: English / አማርኛ
 *
 * Accessibility improvements:
 * - Every FormField has a matching id so htmlFor wires label → input.
 * - Inputs have aria-describedby pointing to field error ids.
 * - Password strength bar section has role="status" + aria-live="polite" so
 *   screen readers announce strength changes without losing focus.
 * - Password rules list items are aria-hidden="true" — the live region already
 *   summarises strength; repeating each rule would be too verbose.
 * - Server error has role="alert" aria-live="assertive".
 * - <main id="main-content"> wraps body for skip-nav.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar }    from '../components/layout/Navbar.jsx'
import { Button }    from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { register, resendVerification } from '../features/auth/services/authService.js'

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']

export default function RegisterPage() {
  const { t } = useTranslation()

  const PASSWORD_RULES = [
    { key: 'length',   test: v => v.length >= 8          },
    { key: 'uppercase',test: v => /[A-Z]/.test(v)        },
    { key: 'number',   test: v => /[0-9]/.test(v)        },
    { key: 'special',  test: v => /[^a-zA-Z0-9]/.test(v) },
  ]

  const [form,        setForm]        = useState({ email: '', password: '', confirm: '' })
  const [errors,      setErrors]      = useState({})
  const [serverError, setServerError] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [registered,  setRegistered]  = useState(false)

  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone,    setResendDone]    = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
    setServerError('')
  }

  function validate() {
    const e = {}
    if (!form.email)    e.email    = t('auth.register.emailRequired')
    if (!form.password) e.password = t('auth.register.passwordRequired')
    else if (PASSWORD_RULES.some(r => !r.test(form.password)))
      e.password = t('auth.register.passwordWeak')
    if (form.password !== form.confirm) e.confirm = t('auth.register.passwordMismatch')
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    setLoading(true)
    try {
      await register({ email: form.email.trim().toLowerCase(), password: form.password })
      setRegistered(true)
    } catch (err) {
      setServerError(err?.response?.data?.message || t('auth.register.failed'))
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
        <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-[440px] text-center">

            <div className="w-20 h-20 rounded-3xl bg-brand-light border border-brand-border flex items-center justify-center mx-auto mb-6" aria-hidden="true">
              <Mail size={34} className="text-brand" aria-hidden="true" />
            </div>

            <h1 className="text-[24px] font-bold text-ink mb-2 tracking-tight">
              {t('auth.register.checkInbox')}
            </h1>
            <p className="text-[15px] text-ink-2 leading-relaxed mb-1">
              {t('auth.register.sentTo')}
            </p>
            <p className="text-[15px] font-semibold text-ink mb-5">{form.email}</p>
            <p className="text-[13.5px] text-ink-3 leading-relaxed mb-8 max-w-xs mx-auto">
              {t('auth.register.clickLink')}
            </p>

            {resendDone ? (
              <div
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-2 text-[13px] text-success font-medium bg-success-bg border border-green-200 px-4 py-2.5 rounded-xl mb-6"
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                {t('auth.register.resentSuccess')}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="inline-flex items-center gap-1.5 text-[13px] text-brand hover:text-brand-hover font-medium mb-6 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
                aria-label={t('auth.register.resend')}
              >
                {resendLoading
                  ? <RefreshCw size={13} className="animate-spin-slow" aria-hidden="true" />
                  : <RefreshCw size={13} aria-hidden="true" />
                }
                {t('auth.register.resend')}
              </button>
            )}

            <div className="bg-surface border border-border rounded-2xl p-5 text-left space-y-2.5 mb-6">
              <p className="text-[12.5px] font-semibold text-ink uppercase tracking-wide">
                {t('auth.register.cantFind')}
              </p>
              {['spam', 'email', 'wait'].map(key => (
                <div key={key} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-border mt-2 shrink-0" aria-hidden="true" />
                  <p className="text-[13px] text-ink-2">{t(`auth.register.tips.${key}`)}</p>
                </div>
              ))}
            </div>

            <p className="text-[13px] text-ink-3">
              {t('auth.register.alreadyVerified')}{' '}
              <Link to="/login" className="text-brand font-medium hover:underline">
                {t('nav.login')}
              </Link>
            </p>
          </div>
        </main>
      </div>
    )
  }

  /* ── Registration form ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-ink mb-1.5">{t('auth.register.title')}</h1>
            <p className="text-sm text-ink-2">
              {t('auth.register.hasAccount')}{' '}
              <Link to="/login" className="text-brand font-medium hover:underline">
                {t('auth.register.loginLink')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate aria-label={t('auth.register.title')}>

            {/* Email */}
            <FormField
              id="reg-email"
              label={t('auth.register.emailLabel')}
              required
              error={errors.email}
            >
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder={t('auth.register.emailPlaceholder')}
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  error={errors.email}
                  className="pl-9"
                  autoComplete="email"
                  autoFocus
                  aria-required="true"
                  aria-describedby={errors.email ? 'reg-email-error' : undefined}
                />
              </div>
            </FormField>

            {/* Password */}
            <FormField
              id="reg-password"
              label={t('auth.register.passwordLabel')}
              required
              error={errors.password}
            >
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
                <Input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('auth.register.passwordPlaceholder')}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  error={errors.password}
                  className="pl-9 pr-10"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-describedby={[
                    errors.password ? 'reg-password-error' : null,
                    form.password.length > 0 ? 'pw-strength-status' : null,
                  ].filter(Boolean).join(' ') || undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
                  aria-label={showPass ? t('auth.register.hidePass') : t('auth.register.showPass')}
                  aria-controls="reg-password"
                >
                  {showPass ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                </button>
              </div>

              {form.password.length > 0 && (
                <div className="mt-2">
                  {/* Visual strength bars */}
                  <div className="flex gap-1 mb-2" aria-hidden="true">
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

                  {/* Screen-reader live region — announces strength as text, not just color */}
                  <p
                    id="pw-strength-status"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                  >
                    {pwStrength === 0 && 'Password strength: none'}
                    {pwStrength === 1 && 'Password strength: Weak — add uppercase letters, numbers, and special characters'}
                    {pwStrength === 2 && 'Password strength: Fair — add more character types'}
                    {pwStrength === 3 && 'Password strength: Good — one more type needed'}
                    {pwStrength === 4 && 'Password strength: Strong — all requirements met'}
                  </p>

                  {/* Visual rule indicators — aria-hidden because live region covers them */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1" aria-hidden="true">
                    {PASSWORD_RULES.map(r => (
                      <span
                        key={r.key}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                          r.test(form.password) ? 'text-success' : 'text-ink-3'
                        }`}
                      >
                        <CheckCircle2 size={10} aria-hidden="true" />
                        {t(`auth.register.rules.${r.key}`)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </FormField>

            {/* Confirm password */}
            <FormField
              id="reg-confirm"
              label={t('auth.register.confirmLabel')}
              required
              error={errors.confirm}
            >
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
                <Input
                  id="reg-confirm"
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('auth.register.confirmPlaceholder')}
                  value={form.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  error={errors.confirm}
                  className="pl-9"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-describedby={errors.confirm ? 'reg-confirm-error' : undefined}
                />
              </div>
            </FormField>

            {/* Server error */}
            {serverError && (
              <div
                role="alert"
                aria-live="assertive"
                className="bg-danger-bg border border-red-200 rounded-lg px-3.5 py-2.5 text-[13px] text-danger"
              >
                <span aria-hidden="true">⚠ </span>{serverError}
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
              {t('auth.register.createBtn')}
            </Button>
          </form>

          <p className="text-center text-[12px] text-ink-3 mt-5 leading-relaxed">
            {t('auth.register.verifyNote')}
          </p>
        </div>
      </main>
    </div>
  )
}
