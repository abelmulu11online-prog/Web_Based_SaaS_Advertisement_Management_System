/**
 * TermsOfServicePage.jsx — Terms of Service
 *
 * Identical design language to PrivacyPolicyPage:
 * - Document-editorial layout with reading-width column
 * - TOC at top with anchor links
 * - Hairline-separated sections, no cards or shadows
 * - .prose-li brand-dot bullet lists
 * - All content from i18n keys, preserved exactly
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/layout/PageShell.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'

const LAST_UPDATED = 'January 1, 2025'

function DocSection({ headingId, heading, children }) {
  return (
    <section className="prose-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="prose-h2 mb-3">
        {heading}
      </h2>
      {children}
    </section>
  )
}

function P({ children, className = '' }) {
  return <p className={`prose-p ${className}`}>{children}</p>
}

function ProseList({ items }) {
  return (
    <ul className="prose-ul" role="list">
      {items.map((item, i) => (
        <li key={i} className="prose-li">{item}</li>
      ))}
    </ul>
  )
}

export default function TermsOfServicePage() {
  const { t } = useTranslation()

  const TOC = [
    { num: '1', label: t('terms.accounts.heading',      '1. Accounts'),                  anchor: 'terms-accounts'      },
    { num: '2', label: t('terms.content.heading',       '2. User content'),               anchor: 'terms-content'       },
    { num: '3', label: t('terms.prohibited.heading',    '3. Prohibited conduct'),         anchor: 'terms-prohibited'    },
    { num: '4', label: t('terms.subscriptions.heading', '4. Subscriptions and payments'), anchor: 'terms-subscriptions' },
    { num: '5', label: t('terms.termination.heading',   '5. Termination'),                anchor: 'terms-termination'   },
    { num: '6', label: t('terms.disclaimer.heading',    '6. Disclaimer of warranties'),   anchor: 'terms-disclaimer'    },
    { num: '7', label: t('terms.liability.heading',     '7. Limitation of liability'),    anchor: 'terms-liability'     },
    { num: '8', label: t('terms.changes.heading',       '8. Changes to these terms'),     anchor: 'terms-changes'       },
    { num: '9', label: t('terms.contact.heading',       '9. Contact'),                    anchor: 'terms-contact'       },
  ]

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: t('common.home', 'Home'), to: '/' },
          { label: t('terms.title', 'Terms of service') },
        ]}
      />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="page-header">
        <p className="page-meta">
          <span aria-hidden="true">—</span>
          {t('terms.lastUpdated', 'Last updated')}: {LAST_UPDATED}
        </p>
        <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.03em] text-ink leading-[1.15]">
          {t('terms.title', 'Terms of service')}
        </h1>
      </header>

      {/* ── Table of Contents ────────────────────────────────────────────── */}
      <nav className="toc-nav" aria-label="Page contents">
        <p className="toc-nav-title" id="toc-label-terms">
          {t('common.contents', 'Contents')}
        </p>
        <ol aria-labelledby="toc-label-terms">
          {TOC.map(({ num, label, anchor }) => (
            <li key={anchor}>
              <a href={`#${anchor}`}>
                <span className="toc-num" aria-hidden="true">{num}</span>
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
            {t('terms.intro', 'By accessing or using GebetaPro, you agree to be bound by these Terms of Service. Please read them carefully. If you do not agree, do not use the platform.')}
          </P>
        </section>

        {/* 1. Accounts */}
        <DocSection headingId="terms-accounts-h" heading={t('terms.accounts.heading', '1. Accounts')}>
          <P>
            {t('terms.accounts.body', 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us immediately if you suspect unauthorised access.')}
          </P>
        </DocSection>

        {/* 2. User content */}
        <DocSection headingId="terms-content-h" heading={t('terms.content.heading', '2. User content')}>
          <P className="mb-3">
            {t('terms.content.body', 'You retain ownership of content you post on GebetaPro. By posting, you grant us a non-exclusive, worldwide, royalty-free licence to display that content as part of operating the platform.')}
          </P>
          <P className="mb-3">
            {t('terms.content.responsibility', 'You are solely responsible for ensuring your content:')}
          </P>
          <ProseList items={[
            t('terms.content.item1', 'Is accurate and not misleading'),
            t('terms.content.item2', 'Does not infringe any third-party intellectual property rights'),
            t('terms.content.item3', 'Does not contain offensive, illegal, or harmful material'),
          ]} />
        </DocSection>

        {/* 3. Prohibited conduct */}
        <DocSection headingId="terms-prohibited-h" heading={t('terms.prohibited.heading', '3. Prohibited conduct')}>
          <P className="mb-3">
            {t('terms.prohibited.intro', 'You agree not to:')}
          </P>
          <ProseList items={[
            t('terms.prohibited.item1', 'Use the platform for any unlawful purpose'),
            t('terms.prohibited.item2', 'Post false, fraudulent, or impersonated profiles'),
            t('terms.prohibited.item3', 'Attempt to gain unauthorised access to any part of the platform'),
            t('terms.prohibited.item4', 'Scrape or harvest data without our written permission'),
            t('terms.prohibited.item5', 'Interfere with or disrupt the platform or servers'),
          ]} />
        </DocSection>

        {/* 4. Subscriptions and payments */}
        <DocSection headingId="terms-subscriptions-h" heading={t('terms.subscriptions.heading', '4. Subscriptions and payments')}>
          <P>
            {t('terms.subscriptions.body', 'Some features require a paid subscription. All fees are stated in Ethiopian Birr (ETB) unless otherwise noted. Payments are processed through our third-party payment provider. Subscription fees are non-refundable except where required by applicable law.')}
          </P>
        </DocSection>

        {/* 5. Termination */}
        <DocSection headingId="terms-termination-h" heading={t('terms.termination.heading', '5. Termination')}>
          <P>
            {t('terms.termination.body', 'We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe pose a risk to the platform or other users. You may delete your account at any time from your dashboard.')}
          </P>
        </DocSection>

        {/* 6. Disclaimer of warranties */}
        <DocSection headingId="terms-disclaimer-h" heading={t('terms.disclaimer.heading', '6. Disclaimer of warranties')}>
          <P>
            {t('terms.disclaimer.body', 'GebetaPro is provided on an "as is" and "as available" basis without warranties of any kind, express or implied. We do not guarantee that the platform will be uninterrupted, error-free, or free of viruses or other harmful components.')}
          </P>
        </DocSection>

        {/* 7. Limitation of liability */}
        <DocSection headingId="terms-liability-h" heading={t('terms.liability.heading', '7. Limitation of liability')}>
          <P>
            {t('terms.liability.body', 'To the fullest extent permitted by law, GebetaPro shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.')}
          </P>
        </DocSection>

        {/* 8. Changes to these terms */}
        <DocSection headingId="terms-changes-h" heading={t('terms.changes.heading', '8. Changes to these terms')}>
          <P>
            {t('terms.changes.body', 'We may update these Terms from time to time. We will notify you of material changes via email or a prominent notice on the platform. Continued use after changes take effect constitutes acceptance of the updated Terms.')}
          </P>
        </DocSection>

        {/* 9. Contact */}
        <DocSection headingId="terms-contact-h" heading={t('terms.contact.heading', '9. Contact')}>
          <P>
            {t('terms.contact.body', 'For questions about these Terms, please')}{' '}
            <Link
              to="/contact"
              className="text-brand font-medium underline underline-offset-2 hover:text-brand-hover transition-colors"
            >
              {t('terms.contact.contactLink', 'contact us')}
            </Link>.
          </P>
        </DocSection>

      </div>
    </PageShell>
  )
}
