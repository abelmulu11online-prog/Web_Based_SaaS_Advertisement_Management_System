/**
 * RegisterPage.jsx
 *
 * Clean, high-contrast international-standard registration screen.
 * - Crisp, highly readable typography and form inputs
 * - Responsive card design centered on a subtle clean canvas
 * - Dynamic password strength meter with high-contrast text and clear requirements
 * - Celebratory verification notice card
 * - Preserves 100% of all validation rules, API calls, and accessibility hooks
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { register, resendVerification } from '../features/auth/services/authService.js'

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']

export default function RegisterPage() {
  const { t } = useTranslation()

  const PASSWORD_RULES = [
    { key: 'length', test: (v) => v.length >= 8 },
    { key: 'uppercase', test: (v) => /[A-Z]/.test(v) },
    { key: 'number', test: (v) => /[0-9]/.test(v) },
    { key: 'special', test: (v) => /[^a-zA-Z0-9]/.test(v) },
  ]

  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [registered, setRegistered] = useState(false)

  const [resendLoading, setResendLoading] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: '' }))
    setServerError('')
  }

  function validate() {
    const e = {}
    if (!form.email) e.email = t('auth.register.emailRequired')
    if (!form.password) e.password = t('auth.register.passwordRequired')
    else if (PASSWORD_RULES.some((r) => !r.test(form.password)))
      e.password = t('auth.register.passwordWeak')
    if (form.password !== form.confirm)
      e.confirm = t('auth.register.passwordMismatch')
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) {
      setErrors(v)
      return
    }
    setLoading(true)
    try {
      await register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
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

  const pwStrength = PASSWORD_RULES.filter((r) => r.test(form.password)).length

  /* ── Check-your-email Screen ────────────────────────────────────────── */
  if (registered) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <Navbar />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16"
        >
          <div className="w-full max-w-[460px]">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-8 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5 shadow-sm text-[#1a6b5e]">
                <Mail size={30} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                {t('auth.register.checkInbox')}
              </h1>
              <p className="text-[14.5px] text-slate-600 mb-2">
                {t('auth.register.sentTo')}
              </p>
              <div className="inline-block px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[14.5px] font-bold text-slate-900 mb-4">
                {form.email}
              </div>
              <p className="text-[13.5px] text-slate-500 leading-relaxed mb-6 max-w-sm mx-auto">
                {t('auth.register.clickLink')}
              </p>

              {resendDone ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-2 text-[13.5px] text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl mb-6 shadow-sm"
                >
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  {t('auth.register.resentSuccess')}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex items-center gap-2 text-[13.5px] text-[#1a6b5e] hover:text-[#155a4e] font-semibold mb-6 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    size={14}
                    className={resendLoading ? 'animate-spin' : ''}
                  />
                  <span>
                    {resendLoading ? 'Sending…' : t('auth.register.resend')}
                  </span>
                </button>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 mb-6">
                <p className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">
                  {t('auth.register.cantFind')}
                </p>
                {['spam', 'email', 'wait'].map((key) => (
                  <div key={key} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a6b5e] mt-2 shrink-0" />
                    <p className="text-[13px] text-slate-600">
                      {t(`auth.register.tips.${key}`)}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[13.5px] text-slate-600">
                {t('auth.register.alreadyVerified')}{' '}
                <Link
                  to="/login"
                  className="text-[#1a6b5e] font-semibold hover:underline"
                >
                  {t('nav.login')}
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  /* ── Registration Form ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16"
      >
        <div className="w-full max-w-[460px]">
          {/* Main Register Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-7 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#1a6b5e] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-[#1a6b5e]/25 mx-auto mb-4 select-none">
                G
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('auth.register.title')}
              </h1>
              <p className="text-slate-600 text-[14.5px] mt-1.5 font-normal">
                {t('auth.register.hasAccount')}{' '}
                <Link
                  to="/login"
                  className="text-[#1a6b5e] font-semibold hover:underline"
                >
                  {t('auth.register.loginLink')}
                </Link>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4.5"
              noValidate
              aria-label={t('auth.register.title')}
            >
              {/* Email Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="reg-email"
                    className="block text-[13.5px] font-semibold text-slate-800"
                  >
                    {t('auth.register.emailLabel')}
                  </label>
                  {errors.email && (
                    <span className="text-[12px] text-red-600 font-semibold">
                      {errors.email}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-email"
                    type="email"
                    placeholder={t('auth.register.emailPlaceholder')}
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                    aria-required="true"
                    className={`w-full h-11 pl-10 pr-4 rounded-xl bg-white border text-slate-900 text-[14.5px] placeholder:text-slate-400 outline-none transition-all ${
                      errors.email
                        ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 focus:border-[#1a6b5e] focus:ring-2 focus:ring-[#1a6b5e]/20'
                    }`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="reg-password"
                    className="block text-[13.5px] font-semibold text-slate-800"
                  >
                    {t('auth.register.passwordLabel')}
                  </label>
                  {errors.password && (
                    <span className="text-[12px] text-red-600 font-semibold">
                      {errors.password}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('auth.register.passwordPlaceholder')}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    className={`w-full h-11 pl-10 pr-11 rounded-xl bg-white border text-slate-900 text-[14.5px] placeholder:text-slate-400 outline-none transition-all ${
                      errors.password
                        ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 focus:border-[#1a6b5e] focus:ring-2 focus:ring-[#1a6b5e]/20'
                    }`}
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

                {/* Password Strength Indicator */}
                {form.password.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-slate-600 font-medium">Strength</span>
                      <span
                        className={`font-bold ${
                          pwStrength <= 1
                            ? 'text-red-600'
                            : pwStrength === 2
                            ? 'text-amber-600'
                            : pwStrength === 3
                            ? 'text-blue-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {STRENGTH_LABELS[pwStrength]}
                      </span>
                    </div>

                    <div className="flex gap-1.5" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full transition-all duration-250 ${
                            i < pwStrength
                              ? [
                                  'bg-red-500',
                                  'bg-amber-500',
                                  'bg-blue-500',
                                  'bg-emerald-600',
                                ][pwStrength - 1]
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    <div
                      className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1"
                      aria-hidden="true"
                    >
                      {PASSWORD_RULES.map((r) => {
                        const pass = r.test(form.password)
                        return (
                          <span
                            key={r.key}
                            className={`flex items-center gap-1.5 text-[11.5px] transition-colors ${
                              pass
                                ? 'text-emerald-700 font-semibold'
                                : 'text-slate-400'
                            }`}
                          >
                            <CheckCircle2
                              size={12}
                              className={pass ? 'text-emerald-600' : 'text-slate-300'}
                            />
                            {t(`auth.register.rules.${r.key}`)}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="reg-confirm"
                    className="block text-[13.5px] font-semibold text-slate-800"
                  >
                    {t('auth.register.confirmLabel')}
                  </label>
                  {errors.confirm && (
                    <span className="text-[12px] text-red-600 font-semibold">
                      {errors.confirm}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-confirm"
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('auth.register.confirmPlaceholder')}
                    value={form.confirm}
                    onChange={(e) => set('confirm', e.target.value)}
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    className={`w-full h-11 pl-10 pr-4 rounded-xl bg-white border text-slate-900 text-[14.5px] placeholder:text-slate-400 outline-none transition-all ${
                      errors.confirm
                        ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 focus:border-[#1a6b5e] focus:ring-2 focus:ring-[#1a6b5e]/20'
                    }`}
                  />
                </div>
              </div>

              {/* Server Error Message */}
              {serverError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="bg-red-50 border border-red-200 rounded-xl p-3 text-[13.5px] text-red-700 font-medium flex items-start gap-2"
                >
                  <span aria-hidden="true" className="font-bold text-red-600">
                    ⚠
                  </span>
                  <span>{serverError}</span>
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
                    <span>{t('auth.register.createBtn')}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Note */}
          <p className="text-center text-[12.5px] text-slate-500 mt-6 leading-relaxed">
            {t('auth.register.verifyNote')}
          </p>
        </div>
      </main>
    </div>
  )
}
