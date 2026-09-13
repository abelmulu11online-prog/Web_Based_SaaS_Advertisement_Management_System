/**
 * AboutPage.jsx — About GebetaPro
 *
 * Design approach:
 * - Editorial layout: strong H1, generous lead, then numbered sections
 * - Each section separated by a hairline rule — no cards, no shadows
 * - "What we offer" presented as a feature grid, not a raw bullet list
 * - CTA at bottom: direct link to Contact
 * - Fully responsive — single column on mobile, comfortable reading width throughout
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageShell } from '../components/layout/PageShell.jsx'
import { Breadcrumb } from '../components/ui/Breadcrumb.jsx'

/* ── Feature items for "What we offer" ─────────────────────────────────────── */
function FeatureItem({ children }) {
  return (
    <li className="flex items-baseline gap-3">
      {/* Brand dot — same pattern as prose-li but controlled here */}
      <span
        className="inline-block w-1 h-1 rounded-full bg-brand mt-[0.6em] shrink-0"
        aria-hidden="true"
      />
      <span className="text-[14.5px] text-ink-2 leading-relaxed">{children}</span>
    </li>
  )
}

export default function AboutPage() {
  const { t } = useTranslation()

  const FEATURES = [
    t('about.platform.item1', 'Free and premium business profiles'),
    t('about.platform.item2', 'Category and location-based discovery'),
    t('about.platform.item3', 'Interactive map view of listings'),
    t('about.platform.item4', 'Portfolio, services, products, and business hours'),
    t('about.platform.item5', 'Flexible subscription plans for increased visibility'),
  ]

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { label: t('common.home', 'Home'), to: '/' },
          { label: t('about.title', 'About us') },
        ]}
      />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="page-header">
        <p className="page-meta">
          <span aria-hidden="true">—</span>
          {t('footer.groups.company', 'Company')}
        </p>
        <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.03em] text-ink leading-[1.15] mb-4">
          {t('about.title', 'About us')}
        </h1>
        <p className="text-[16px] text-ink-2 leading-relaxed max-w-[36rem]">
          {t('about.subtitle', "Ethiopia's discovery platform — connecting skilled people, businesses, and services with the people who need them.")}
        </p>
      </header>

      {/* ── Sections ────────────────────────────────────────────────────── */}
      <div className="space-y-0">

        {/* Mission */}
        <section className="about-section" aria-labelledby="about-mission">
          <h2 id="about-mission" className="prose-h2 mb-3">
            {t('about.mission.heading', 'Our mission')}
          </h2>
          <p className="prose-p">
            {t('about.mission.body', 'GebetaPro was built to make it easier for talented individuals and growing businesses across Ethiopia to get discovered. Whether you are a freelancer, a shop owner, or running a large enterprise, we give you a professional profile that puts you in front of the right audience.')}
          </p>
        </section>

        {/* Story */}
        <section className="about-section" aria-labelledby="about-story">
          <h2 id="about-story" className="prose-h2 mb-3">
            {t('about.story.heading', 'Our story')}
          </h2>
          <p className="prose-p">
            {t('about.story.body', 'We started with a simple observation: finding reliable local services in Ethiopia was still largely word-of-mouth. GebetaPro changes that by building a structured, searchable directory that works for everyone — from Addis Ababa to Hawassa, Gondar to Bahir Dar.')}
          </p>
        </section>

        {/* What we offer */}
        <section className="about-section" aria-labelledby="about-platform">
          <h2 id="about-platform" className="prose-h2 mb-4">
            {t('about.platform.heading', 'What we offer')}
          </h2>
          <ul className="space-y-2.5" role="list">
            {FEATURES.map((f, i) => (
              <FeatureItem key={i}>{f}</FeatureItem>
            ))}
          </ul>
        </section>

        {/* Get in touch */}
        <section className="about-section" aria-labelledby="about-contact">
          <h2 id="about-contact" className="prose-h2 mb-3">
            {t('about.contact.heading', 'Get in touch')}
          </h2>
          <p className="prose-p mb-5">
            {t('about.contact.body', 'Have questions or want to partner with us?')}
          </p>
          <Link
            to="/contact"
            className="
              inline-flex items-center gap-2
              text-[13.5px] font-medium text-brand
              border border-brand-border
              bg-brand-light hover:bg-brand hover:text-white
              px-4 py-2 rounded-lg
              transition-all duration-150
              hover:no-underline
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
            "
          >
            {t('about.contact.link', 'Contact our team')}
            {/* Arrow */}
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </section>

      </div>
    </PageShell>
  )
}
