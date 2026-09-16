/**
 * ResetPasswordPage.jsx
 * i18n: English / አማርኛ
 */
import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { resetPassword } from '../features/auth/services/authService.js'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const token          = searchParams.get('token')

  const PASSWORD_RULES = [
    { key: 'length',   test: v => v.length >= 8          },
    { key: 'uppercase',test: v => /[A-Z]/.test(v)        },
    { key: 'number',   test: v => /[0-9]/.test(v)        },
    { key: 'special',  test: v => /[^a-zA-Z0-9]/.test(v) },
  ]

  const [form,      setForm]      = useState({ password: '', confirm: '' })
  const [errors,    setErrors]    = useState({})
  const [showPass,  setShowPass]  = useState(false)
  const [status,    setStatus]    = useState(token ? 'form' : 'no-token')
  const [serverErr, setServerErr] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (status !== 'success') return
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); navigate('/login'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [status, navigate])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
    setServerErr('')
  }

  function validate() {
    const e = {}
    if (!form.password) {
      e.password = t('auth.register.passwordRequired')
    } else if (PASSWORD_RULES.some(r => !r.test(form.password))) {
      e.password = t('auth.register.passwordWeak')
    }
    if (form.password !== form.confirm) {
      e.confirm = t('auth.register.passwordMismatch')
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    setStatus('loading')
    try {
      await resetPassword(token, form.password)
      setStatus('success')
    } catch (err) {
      const code = err?.response?.data?.code || ''
      const msg  = err?.response?.data?.message || t('auth.reset.failed')
      setServerErr(msg)
      setStatus(code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' ? 'error' : 'form')
    }
  }

  const pwStrength = PASSWORD_RULES.filter(r => r.test(form.password)).length

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )

  if (status === 'no-token') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-5">
            <XCircle size={28} className="text-ink-3" />
          </div>
          <h1 className="text-[20px] font-bold text-ink mb-2">{t('auth.reset.invalidToken')}</h1>
          <p className="text-[14px] text-ink-2 mb-6 max-w-xs mx-auto leading-relaxed">
            {t('auth.reset.invalidToken')}
          </p>
          <Link to="/forgot-password">
            <Button variant="primary" size="md" className="rounded-xl">{t('auth.reset.requestNew')}</Button>
          </Link>
        </div>
      </Shell>
    )
  }

  if (status === 'error') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger-bg border border-red-200 flex items-center justify-center mx-auto mb-5">
            <XCircle size={28} className="text-danger" />
          </div>
          <h1 className="text-[20px] font-bold text-ink mb-2">{t('auth.reset.invalidToken')}</h1>
          <p className="text-[14px] text-ink-2 mb-6 max-w-xs mx-auto leading-relaxed">{serverErr}</p>
          <Link to="/forgot-password">
            <Button variant="primary" size="md" className="rounded-xl">{t('auth.reset.requestNew')}</Button>
          </Link>
          <p className="text-[13px] text-ink-3 mt-4">
            <Link to="/login" className="text-brand hover:underline">{t('auth.forgot.backToLogin')}</Link>
          </p>
        </div>
      </Shell>
    )
  }

  if (status === 'success') {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-success-bg border border-green-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={30} className="text-success" />
          </div>
          <h1 className="text-[22px] font-bold text-ink mb-2 tracking-tight">
            {t('auth.reset.success')}
          </h1>
          <p className="text-[14px] text-ink-2 mb-6 max-w-sm mx-auto leading-relaxed">
            {t('auth.reset.success')}
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/login')} className="rounded-xl">
            {t('auth.reset.loginBtn')}
          </Button>
          <p className="text-[12px] text-ink-3 mt-4">
            Redirecting in {countdown}s…
          </p>
        </div>
      </Shell>
    )
  }

  const isSubmitting = status === 'loading'

  return (
    <Shell>
      <div className="mb-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink hover:no-underline transition-colors mb-5"
        >
          <ArrowLeft size={13} />
          {t('auth.forgot.backToLogin')}
        </Link>
        <h1 className="text-[24px] font-bold text-ink mb-1.5 tracking-tight">
          {t('auth.reset.title')}
        </h1>
        <p className="text-[14px] text-ink-2">{t('auth.reset.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

        <FormField label={t('auth.reset.newPasswordLabel')} required error={errors.password}>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <Input
              type={showPass ? 'text' : 'password'}
              placeholder={t('auth.reset.newPasswordPlaceholder')}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              error={errors.password}
              className="pl-9 pr-10"
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
              aria-label={showPass ? t('auth.register.hidePass') : t('auth.register.showPass')}
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
                    key={r.key}
                    className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                      r.test(form.password) ? 'text-success' : 'text-ink-3'
                    }`}
                  >
                    <CheckCircle2 size={10} />
                    {t(`auth.register.rules.${r.key}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </FormField>

        <FormField label={t('auth.reset.confirmLabel')} required error={errors.confirm}>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <Input
              type={showPass ? 'text' : 'password'}
              placeholder={t('auth.reset.confirmPlaceholder')}
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              error={errors.confirm}
              className="pl-9"
              autoComplete="new-password"
            />
          </div>
        </FormField>

        {serverErr && status === 'form' && (
          <div className="bg-danger-bg border border-red-200 rounded-lg px-3.5 py-2.5 text-[13px] text-danger">
            {serverErr}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          fullWidth
          className="rounded-xl mt-1"
        >
          {t('auth.reset.resetBtn')}
        </Button>
      </form>
    </Shell>
  )
}
