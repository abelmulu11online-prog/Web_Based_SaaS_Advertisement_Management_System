/**
 * LoginPage.jsx
 *
 * Accessibility improvements:
 * - Every FormField now has a matching id so htmlFor wires label → input.
 * - Each Input has aria-describedby pointing to its field's error element id.
 * - Server error banner has role="alert" and aria-live="assertive".
 * - Eye-toggle button has a dynamic aria-label ("Show password" / "Hide password").
 * - <main id="main-content"> wraps page body so the skip-nav link works.
 * - autoComplete attributes retained for browser autofill.
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { login, resendVerification } from '../features/auth/services/authService.js'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'
  const justVerified = location.state?.verified === true

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setError('')
    setErrorCode('')
    setResendDone(false)
  }

  function decodeJwtRole(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload?.role ?? null
    } catch {
      return null
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.identifier || !form.password) { setError(t('auth.login.emailRequired')); return }
    setLoading(true)
    setResendDone(false)
    try {
      const data = await login({ identifier: form.identifier, password: form.password })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      const role = decodeJwtRole(data.accessToken)
      const destination = role === 'ADMIN' ? '/admin' : from
      navigate(destination, { replace: true })
    } catch (err) {
      const code = err?.response?.data?.code || ''
      setErrorCode(code)
      setError(err?.response?.data?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    if (!form.identifier) return
    setResendLoading(true)
    try {
      await resendVerification(form.identifier.trim().toLowerCase())
      setResendDone(true)
    } catch {
      // no-op
    } finally {
      setResendLoading(false)
    }
  }

  const isUnverified = errorCode === 'EMAIL_NOT_VERIFIED'
  // Stable id for the server-error block so inputs can reference it
  const serverErrorId = 'login-server-error'

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-ink mb-1.5">{t('auth.login.title')}</h1>
            <p className="text-sm text-ink-2">
              {t('auth.login.newAccount')}{' '}
              <Link to="/register" className="text-brand font-medium hover:underline">
                {t('auth.login.createFree')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate aria-label={t('auth.login.title')}>

            {justVerified && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-[13.5px] text-green-800"
              >
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <strong>{t('auth.login.emailVerified')}</strong>{' '}
                  {t('auth.login.accountActive')}
                </span>
              </div>
            )}

            {/* Email field — id="login-email" wires label → input */}
            <FormField
              id="login-email"
              label={t('auth.login.emailLabel')}
              required
            >
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
                <Input
                  id="login-email"
                  type="email"
                  name="identifier"
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={form.identifier}
                  onChange={e => set('identifier', e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                  autoFocus
                  aria-describedby={error ? serverErrorId : undefined}
                  aria-required="true"
                />
              </div>
            </FormField>

            {/* Password field */}
            <FormField
              id="login-password"
              label={t('auth.login.passwordLabel')}
              required
            >
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
                <Input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder={t('auth.login.passwordPlaceholder')}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                  aria-describedby={error ? serverErrorId : undefined}
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:rounded"
                  aria-label={showPass ? t('auth.register.hidePass') : t('auth.register.showPass')}
                  aria-controls="login-password"
                >
                  {showPass ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                </button>
              </div>
            </FormField>

            <div className="flex justify-end -mt-1">
              <Link to="/forgot-password" className="text-[13px] text-ink-2 hover:text-brand transition-colors">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            {/* Server error — role="alert" announces immediately; aria-live="assertive" */}
            {error && (
              <div
                id={serverErrorId}
                role="alert"
                aria-live="assertive"
                className="bg-danger-bg border border-red-200 rounded px-3.5 py-2.5 text-[13px] text-danger"
              >
                {/* ⚠ prefix so error is not communicated by color alone */}
                <span aria-hidden="true">⚠ </span>{error}
                {isUnverified && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    {resendDone ? (
                      <p className="text-green-700 font-medium">{t('auth.login.verificationSent')}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="text-brand font-medium underline hover:no-underline disabled:opacity-50"
                      >
                        {resendLoading ? t('auth.login.sending') : t('auth.login.resendVerification')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth className="mt-1">
              {t('auth.login.loginBtn')}
            </Button>
          </form>

          <p className="text-center text-[12px] text-ink-3 mt-6">
            {t('auth.login.termsNotice')}{' '}
            <Link to="/terms" className="underline hover:text-ink-2">{t('auth.login.terms')}</Link>{' '}
            {t('auth.login.and')}{' '}
            <Link to="/privacy-policy" className="underline hover:text-ink-2">{t('auth.login.privacyPolicy')}</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
