/**
 * ForgotPasswordPage.jsx
 * i18n: English / አማርኛ
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, SendHorizonal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { forgotPassword } from '../features/auth/services/authService.js'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed)                              { setError(t('auth.forgot.emailEmpty'));   return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError(t('auth.forgot.emailInvalid')); return }

    setLoading(true)
    setError('')
    try {
      await forgotPassword(trimmed)
      setSent(true)
    } catch (err) {
      const status = err?.response?.status
      if (status && status >= 500) {
        setError(t('auth.forgot.serverError'))
      } else {
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
                {t('auth.forgot.checkInbox')}
              </h1>
              <p className="text-[14px] text-ink-2 mb-2 leading-relaxed max-w-sm mx-auto">
                {t('auth.forgot.sentMsg', { email })}
              </p>
              <p className="text-[13px] text-ink-3 mb-8 max-w-xs mx-auto">
                {t('auth.forgot.linkExpires')}
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-[13px] text-brand hover:underline font-medium mb-6 block mx-auto"
              >
                {t('auth.forgot.tryAgain')}
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink hover:no-underline transition-colors"
              >
                <ArrowLeft size={13} />
                {t('auth.forgot.backToLogin')}
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
                  {t('auth.forgot.backToLogin')}
                </Link>
                <h1 className="text-[24px] font-bold text-ink mb-1.5 tracking-tight">
                  {t('auth.forgot.title')}
                </h1>
                <p className="text-[14px] text-ink-2 leading-relaxed">
                  {t('auth.forgot.subtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <FormField label={t('auth.forgot.emailLabel')} required error={error}>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
                    />
                    <Input
                      type="email"
                      placeholder={t('auth.forgot.emailPlaceholder')}
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
                  {t('auth.forgot.sendBtn')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
