/**
 * ContactPage.jsx — Contact GebetaPro
 *
 * Design approach:
 * - Two-column layout (wide PageShell): info sidebar left, form right on md+
 * - Info sidebar: icon-backed rows with small-caps labels — clean, not card-heavy
 * - Form: full FormField/Input/Textarea system — consistent with rest of app
 * - Primary action: full-width on mobile, auto-width on desktop
 * - Success state: brand-tinted panel replacing the form — not a modal, not an alert box
 * - All form state and validation preserved from original implementation
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/layout/PageShell.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input, Textarea } from '../components/ui/FormField.jsx'

/* ── Contact info row ───────────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="contact-info-item">
      <div className="contact-info-icon" aria-hidden="true">
        <Icon size={15} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="contact-info-label">{label}</p>
        <div className="contact-info-value">{children}</div>
      </div>
    </div>
  )
}

export default function ContactPage() {
  const { t } = useTranslation()

  const [form, setForm]       = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors]   = useState({})

  function validate() {
    const e = {}
    if (!form.name.trim())
      e.name = t('contact.errors.nameRequired', 'Name is required')
    if (!form.email.trim())
      e.email = t('contact.errors.emailRequired', 'Email is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = t('contact.errors.emailInvalid', 'Enter a valid email address')
    if (!form.message.trim())
      e.message = t('contact.errors.messageRequired', 'Message is required')
    return e
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitted(true)
  }

  return (
    <PageShell wide>
      <Breadcrumb
        items={[
          { label: t('common.home', 'Home'), to: '/' },
          { label: t('contact.title', 'Contact') },
        ]}
      />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="page-header">
        <p className="page-meta">
          <span aria-hidden="true">—</span>
          {t('footer.groups.company', 'Company')}
        </p>
        <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.03em] text-ink leading-[1.15] mb-3">
          {t('contact.title', 'Contact us')}
        </h1>
        <p className="text-[15.5px] text-ink-2 leading-relaxed">
          {t('contact.subtitle', "Have a question, feedback, or a partnership idea? We'd love to hear from you.")}
        </p>
      </header>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-[1fr_1.75fr] gap-10 lg:gap-14">

        {/* ── Info sidebar ────────────────────────────────────────────────── */}
        <aside aria-label="Contact information">
          <div className="space-y-6">
            <InfoRow
              icon={Mail}
              label={t('contact.info.email', 'Email')}
            >
              <a
                href="mailto:hello@gebetapro.com"
                className="text-ink-2 hover:text-brand transition-colors duration-150 break-all"
              >
                hello@gebetapro.com
              </a>
            </InfoRow>

            <div className="divider" role="presentation" />

            <InfoRow
              icon={MapPin}
              label={t('contact.info.location', 'Location')}
            >
              <span>{t('footer.location', 'Addis Ababa, Ethiopia')}</span>
            </InfoRow>

            <div className="divider" role="presentation" />

            <InfoRow
              icon={Clock}
              label={t('contact.info.response', 'Response time')}
            >
              <span>{t('contact.info.responseBody', 'We typically reply within 1–2 business days.')}</span>
            </InfoRow>
          </div>
        </aside>

        {/* ── Form / Success state ────────────────────────────────────────── */}
        <div>
          {submitted ? (
            /* Success panel */
            <div
              role="alert"
              className="success-panel"
              aria-live="polite"
            >
              {/* Checkmark — semantic SVG, no emoji */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                  >
                    <path
                      d="M4 9.5l3.5 3.5 6.5-7"
                      stroke="white"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-[16px] font-semibold text-ink tracking-[-0.01em] mb-1.5">
                {t('contact.success.title', 'Message sent')}
              </h2>
              <p className="text-[14px] text-ink-2 leading-relaxed">
                {t('contact.success.body', "Thanks for reaching out. We'll get back to you soon.")}
              </p>
            </div>
          ) : (
            /* Contact form */
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-label={t('contact.formLabel', 'Contact form')}
              className="space-y-5"
            >
              {/* Name + Email side by side on wider screens */}
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField
                  id="contact-name"
                  label={t('contact.form.name', 'Your name')}
                  error={errors.name}
                  required
                >
                  <Input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder={t('contact.form.namePlaceholder', 'e.g. Natnael Berhanu')}
                    value={form.name}
                    onChange={handleChange}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    error={errors.name}
                  />
                </FormField>

                <FormField
                  id="contact-email"
                  label={t('contact.form.email', 'Email address')}
                  error={errors.email}
                  required
                >
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    error={errors.email}
                  />
                </FormField>
              </div>

              <FormField
                id="contact-subject"
                label={t('contact.form.subject', 'Subject')}
              >
                <Input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  placeholder={t('contact.form.subjectPlaceholder', 'What is this about?')}
                  value={form.subject}
                  onChange={handleChange}
                />
              </FormField>

              <FormField
                id="contact-message"
                label={t('contact.form.message', 'Message')}
                error={errors.message}
                required
              >
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  placeholder={t('contact.form.messagePlaceholder', 'Tell us how we can help…')}
                  value={form.message}
                  onChange={handleChange}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  error={errors.message}
                />
              </FormField>

              {/* Submit */}
              <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto px-6"
                >
                  {t('contact.form.submit', 'Send message')}
                </Button>
                <p className="text-[12px] text-ink-3 leading-snug">
                  {t('auth.login.termsNotice', 'By submitting you agree to our')}{' '}
                  <Link
                    to="/privacy-policy"
                    className="underline underline-offset-2 hover:text-ink-2 transition-colors"
                  >
                    {t('footer.privacy', 'Privacy policy')}
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  )
}
