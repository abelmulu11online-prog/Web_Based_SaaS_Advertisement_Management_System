/**
 * LoginPage.jsx
 *
 * Clean, high-contrast international-standard authentication screen.
 * - Crisp typography with high visibility and contrast
 * - Distraction-free, accessible, responsive card layout
 * - Seamless integration with Navbar and LanguageSelector
 * - Fully preserves auth logic, JWT decoding, redirection, and verification resend
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
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
    setForm((f) => ({ ...f, [key]: val }))
    setError('')
    setErrorCode('')
    setResendDone(false)
  }

  function decodeJwtRole(token) {
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      )
      return payload?.role ?? null
    } catch {
      return null
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.identifier || !form.password) {
      setError(t('auth.login.emailRequired'))
      return
    }
    setLoading(true)
    setResendDone(false)
    try {
      const data = await login({
        identifier: form.identifier.trim(),
        password: form.password,
      })
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
  const serverErrorId = 'login-server-error'

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16"
      >
        <div className="w-full max-w-[440px]">
          {/* Main Login Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-7 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#1a6b5e] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-[#1a6b5e]/25 mx-auto mb-4 select-none">
                G
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('auth.login.title')}
              </h1>
              <p className="text-slate-600 text-[14.5px] mt-1.5 font-normal">
                {t('auth.login.newAccount')}{' '}
                <Link
                  to="/register"
                  className="text-[#1a6b5e] font-semibold hover:underline"
                >
                  {t('auth.login.createFree')}
                </Link>
              </p>
            </div>

            {/* Email Verified Banner */}
            {justVerified && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-[13.5px] text-emerald-900 font-medium mb-6"
              >
                <CheckCircle2
                  size={16}
                  className="text-emerald-600 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <strong>{t('auth.login.emailVerified')}</strong>{' '}
                  {t('auth.login.accountActive')}
                </span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4.5"
              noValidate
              aria-label={t('auth.login.title')}
            >
              {/* Email / Identifier Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-[13.5px] font-semibold text-slate-800"
                >
                  {t('auth.login.emailLabel')}
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-email"
                    type="email"
                    name="identifier"
                    placeholder={t('auth.login.emailPlaceholder')}
                    value={form.identifier}
                    onChange={(e) => set('identifier', e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                    aria-describedby={error ? serverErrorId : undefined}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-300 text-slate-900 text-[14.5px] placeholder:text-slate-400 focus:border-[#1a6b5e] focus:ring-2 focus:ring-[#1a6b5e]/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[13.5px] font-semibold text-slate-800"
                  >
                    {t('auth.login.passwordLabel')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[12.5px] font-semibold text-[#1a6b5e] hover:underline"
                  >
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>

                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    placeholder={t('auth.login.passwordPlaceholder')}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    autoComplete="current-password"
                    required
                    aria-describedby={error ? serverErrorId : undefined}
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-white border border-slate-300 text-slate-900 text-[14.5px] placeholder:text-slate-400 focus:border-[#1a6b5e] focus:ring-2 focus:ring-[#1a6b5e]/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    aria-label={
                      showPass
                        ? t('auth.register.hidePass')
                        : t('auth.register.showPass')
                    }
                  >
                    {showPass ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Announcement Banner */}
              {error && (
                <div
                  id={serverErrorId}
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-[13.5px] text-red-700 font-medium"
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className="font-bold text-red-600">
                      ⚠
                    </span>
                    <span className="flex-1">{error}</span>
                  </div>
                  {isUnverified && (
                    <div className="mt-2.5 pt-2.5 border-t border-red-200 text-left">
                      {resendDone ? (
                        <p className="text-emerald-800 font-semibold">
                          {t('auth.login.verificationSent')}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resendLoading}
                          className="text-[#1a6b5e] font-semibold underline hover:no-underline disabled:opacity-50"
                        >
                          {resendLoading
                            ? t('auth.login.sending')
                            : t('auth.login.resendVerification')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-1 rounded-xl bg-[#1a6b5e] hover:bg-[#155a4e] text-white font-semibold text-[15px] shadow-md shadow-[#1a6b5e]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t('auth.login.loginBtn')}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Terms */}
          <p className="text-center text-[12.5px] text-slate-500 mt-6 leading-relaxed">
            {t('auth.login.termsNotice')}{' '}
            <Link to="/terms" className="underline hover:text-slate-800 font-medium">
              {t('auth.login.terms')}
            </Link>{' '}
            {t('auth.login.and')}{' '}
            <Link
              to="/privacy-policy"
              className="underline hover:text-slate-800 font-medium"
            >
              {t('auth.login.privacyPolicy')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
