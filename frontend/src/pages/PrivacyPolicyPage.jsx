/**
 * PrivacyPolicyPage.jsx — Privacy Policy
 *
 * Design approach:
 * - Document-editorial layout: tight reading column, strong typographic hierarchy
 * - TOC at top: compact 2-column grid of anchor links for quick navigation
 * - Sections: hairline rule separators, no cards, no shadows
 * - Section numbers are part of the heading text — no decorative numbering UI
 * - Lists use the .prose-li CSS class (brand dot + comfortable spacing)
 * - Last-updated shown as a small metadata label in the page header
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/layout/PageShell.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'

const LAST_UPDATED = 'January 1, 2025'

/* ── Section wrapper ─────────────────────────────────────────────────────────
 * Applies the hairline top border + spacing from .prose-section CSS class.
 * `id` is the anchor for the TOC.
 */
function DocSection({ id, heading, headingId, children }) {
  return (
    <section
      className="prose-section"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="prose-h2 mb-3">
        {heading}
      </h2>
      {children}
    </section>
  )
}

/* ── Prose paragraph ─────────────────────────────────────────────────────── */
function P({ children, className = '' }) {
  return <p className={`prose-p ${className}`}>{children}</p>
}

/* ── Prose list ──────────────────────────────────────────────────────────── */
function ProseList({ items }) {
  return (
    <ul className="prose-ul" role="list">
      {items.map((item, i) => (
        <li key={i} className="prose-li">{item}</li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  const { t } = useTranslation()

  /* TOC entries — label + anchor id */
  const TOC = [
    { num: '1', label: t('privacy.collect.heading', '1. Information we collect'),   anchor: 'privacy-collect'  },
    { num: '2', label: t('privacy.use.heading',     '2. How we use your information'), anchor: 'privacy-use'   },
    { num: '3', label: t('privacy.share.heading',   '3. Sharing of information'),    anchor: 'privacy-share'   },
    { num: '4', label: t('privacy.public.heading',  '4. Public profile data'),       anchor: 'privacy-public'  },
    { num: '5', label: t('privacy.security.heading','5. Data security'),             anchor: 'privacy-security'},
    { num: '6', label: t('privacy.rights.heading',  '6. Your rights'),               anchor: 'privacy-rights'  },
    { num: '7', label: t('privacy.contact.heading', '7. Contact'),                   anchor: 'privacy-contact' },
  ]

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: t('common.home', 'Home'), to: '/' },
          { label: t('privacy.title', 'Privacy policy') },
        ]}
      />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="page-header">
        <p className="page-meta">
          <span aria-hidden="true">—</span>
          {t('privacy.lastUpdated', 'Last updated')}: {LAST_UPDATED}
        </p>
        <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.03em] text-ink leading-[1.15]">
          {t('privacy.title', 'Privacy policy')}
        </h1>
      </header>

      {/* ── Table of Contents ────────────────────────────────────────────── */}
      <nav className="toc-nav" aria-label="Page contents">
        <p className="toc-nav-title" id="toc-label">
          {t('common.contents', 'Contents')}
        </p>
        <ol aria-labelledby="toc-label">
          {TOC.map(({ num, label, anchor }) => (
            <li key={anchor}>
              <a href={`#${anchor}`}>
                <span className="toc-num" aria-hidden="true">{num}</span>
                {/* Strip leading "N. " from label to avoid duplicate numbers */}
                <span>{label.replace(/^\d+\.\s*/, '')}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Document body ────────────────────────────────────────────────── */}
      <div className="prose-body">

        {/* Intro */}
        <section aria-label="Introduction">
          <P>
            {t('privacy.intro', 'GebetaPro ("we", "us", or "our") operates the GebetaPro platform. This Privacy Policy explains how we collect, use, and protect your personal information when you use our services.')}
          </P>
        </section>

        {/* 1. Information we collect */}
        <DocSection
          id="privacy-collect"
          headingId="privacy-collect-h"
          heading={t('privacy.collect.heading', '1. Information we collect')}
        >
          <P className="mb-3">
            {t('privacy.collect.intro', 'We collect information you provide directly to us, including:')}
          </P>
          <ProseList items={[
            t('privacy.collect.item1', 'Account registration details (name, email address, password)'),
            t('privacy.collect.item2', 'Profile information (business name, description, phone number, location, images)'),
            t('privacy.collect.item3', 'Payment information processed securely through our payment provider'),
            t('privacy.collect.item4', 'Communications you send us'),
          ]} />
          <P className="mt-4">
            {t('privacy.collect.auto', 'We also collect certain information automatically, such as your IP address, browser type, and pages visited, to operate and improve our platform.')}
          </P>
        </DocSection>

        {/* 2. How we use your information */}
        <DocSection
          id="privacy-use"
          headingId="privacy-use-h"
          heading={t('privacy.use.heading', '2. How we use your information')}
        >
          <ProseList items={[
            t('privacy.use.item1', 'To create and manage your account and profile'),
            t('privacy.use.item2', 'To process subscription payments'),
            t('privacy.use.item3', 'To display your profile to other users in the directory'),
            t('privacy.use.item4', 'To send transactional emails (verification, password reset, receipts)'),
            t('privacy.use.item5', 'To improve platform features and user experience'),
            t('privacy.use.item6', 'To comply with legal obligations'),
          ]} />
        </DocSection>

        {/* 3. Sharing of information */}
        <DocSection
          id="privacy-share"
          headingId="privacy-share-h"
          heading={t('privacy.share.heading', '3. Sharing of information')}
        >
          <P>
            {t('privacy.share.body', 'We do not sell your personal data. We may share information with trusted service providers who assist us in operating the platform (e.g. payment processors, email delivery services), subject to strict confidentiality obligations. We may also disclose information when required by law.')}
          </P>
        </DocSection>

        {/* 4. Public profile data */}
        <DocSection
          id="privacy-public"
          headingId="privacy-public-h"
          heading={t('privacy.public.heading', '4. Public profile data')}
        >
          <P>
            {t('privacy.public.body', 'Information you add to your public profile — such as your business name, description, location, phone number, services, and images — is visible to all visitors of the platform. Be mindful of what you choose to publish.')}
          </P>
        </DocSection>

        {/* 5. Data security */}
        <DocSection
          id="privacy-security"
          headingId="privacy-security-h"
          heading={t('privacy.security.heading', '5. Data security')}
        >
          <P>
            {t('privacy.security.body', 'We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS) and secure password hashing. No method of transmission over the internet is 100% secure, so we cannot guarantee absolute security.')}
          </P>
        </DocSection>

        {/* 6. Your rights */}
        <DocSection
          id="privacy-rights"
          headingId="privacy-rights-h"
          heading={t('privacy.rights.heading', '6. Your rights')}
        >
          <P className="mb-3">
            {t('privacy.rights.intro', 'You have the right to:')}
          </P>
          <ProseList items={[
            t('privacy.rights.item1', 'Access and update your personal information via your dashboard'),
            t('privacy.rights.item2', 'Request deletion of your account and associated data'),
            t('privacy.rights.item3', 'Opt out of marketing communications at any time'),
          ]} />
          <P className="mt-4">
            {t('privacy.rights.contact', 'To exercise these rights, please')}{' '}
            <Link
              to="/contact"
              className="text-brand font-medium underline underline-offset-2 hover:text-brand-hover transition-colors"
            >
              {t('privacy.rights.contactLink', 'contact us')}
            </Link>.
          </P>
        </DocSection>

        {/* 7. Contact */}
        <DocSection
          id="privacy-contact"
          headingId="privacy-contact-h"
          heading={t('privacy.contact.heading', '7. Contact')}
        >
          <P>
            {t('privacy.contact.body', 'If you have questions about this Privacy Policy, reach us at')}{' '}
            <a
              href="mailto:hello@gebetapro.com"
              className="text-brand font-medium underline underline-offset-2 hover:text-brand-hover transition-colors"
            >
              hello@gebetapro.com
            </a>.
          </P>
        </DocSection>

      </div>
    </PageShell>
  )
}
