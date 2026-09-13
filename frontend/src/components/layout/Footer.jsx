/**
 * Footer.jsx — Premium, typographically refined dark footer.
 *
 * Design decisions:
 * - Warm near-black (#1a1917) surface — matches the brand ink token
 * - 4-column desktop grid; 2-column mobile (brand full-width top, then 3 link cols)
 * - Section labels: small-caps style, tracked, muted — clear but not shouty
 * - Link text: 13px, white/70 → white on hover — legible without competing with content
 * - Ethiopian identity expressed through "Built in Ethiopia" + flag-colour dots,
 *   not through decorative imagery
 * - Language selector: compact dark variant, keyboard accessible
 * - Bottom bar: copyright left, legal links + Built-in-Ethiopia right — visually balanced
 * - No shadows, no gradients, no cards — hierarchy through spacing and opacity alone
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSelectorDark } from '../ui/LanguageSelector.jsx'

/* Design constants */
const BG         = '#1a1917'
const RULE_COLOR = 'rgba(255,255,255,0.07)'

export function Footer() {
  const { t } = useTranslation()

  const LINK_GROUPS = [
    {
      label: t('footer.groups.discover'),
      links: [
        { to: '/directory',                         label: t('footer.links.browseDirectory') },
        { to: '/directory?profile_type=FREELANCER', label: t('footer.links.freelancers')     },
        { to: '/directory?profile_type=SHOP',       label: t('footer.links.shops')           },
        { to: '/directory?profile_type=BUSINESS',   label: t('footer.links.businesses')      },
        { to: '/directory/map',                     label: t('footer.links.mapView')          },
      ],
    },
    {
      label: t('footer.groups.advertise'),
      links: [
        { to: '/register',          label: t('footer.links.createProfile') },
        { to: '/pricing',           label: t('footer.links.pricingPlans')  },
        { to: '/dashboard',         label: t('footer.links.myDashboard')   },
        { to: '/dashboard/profile', label: t('footer.links.editProfile')   },
      ],
    },
    {
      label: t('footer.groups.company'),
      links: [
        { to: '/about',          label: t('footer.links.aboutUs')        },
        { to: '/contact',        label: t('footer.links.contact')        },
        { to: '/privacy-policy', label: t('footer.links.privacyPolicy')  },
        { to: '/terms',          label: t('footer.links.termsOfService') },
      ],
    },
  ]

  return (
    <footer
      className="mt-auto text-white"
      style={{ background: BG }}
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* ── Main grid ──────────────────────────────────────────────────────
            Mobile:  2 columns — brand col spans both, then 3 link cols in 2+1
            Tablet:  same 2-col but link groups at 3
            Desktop: 4-col [brand | discover | advertise | company]
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="pt-12 pb-10 grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-x-8 gap-y-10 sm:gap-y-12">

          {/* ── Brand column ──────────────────────────────────────────────── */}
          <div className="col-span-2 md:col-span-1 md:pr-6">
            {/* Wordmark */}
            <Link
              to="/"
              className="inline-block mb-5 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
              aria-label="GebetaPro — home"
            >
              <span
                className="text-[17px] font-bold tracking-[-0.03em] text-white leading-none"
              >
                Gebeta
                <span className="text-brand">Pro</span>
              </span>
            </Link>

            {/* Tagline */}
            <p className="text-[13px] leading-[1.65] text-white/60 mb-6 max-w-[240px]">
              {t('footer.tagline')}
            </p>

            {/* Language selector */}
            <LanguageSelectorDark className="mb-6" />

            {/* Ethiopian identity — flag dots + location */}
            <div className="flex items-center gap-2.5">
              <div
                className="footer-eth-flag"
                aria-hidden="true"
                role="presentation"
              >
                <span style={{ background: '#078930' }} />
                <span style={{ background: '#FCDD09' }} />
                <span style={{ background: '#DA121A' }} />
              </div>
              <span className="text-[11.5px] text-white/50 tracking-wide">
                {t('footer.location')}
              </span>
            </div>
          </div>

          {/* ── Link columns ──────────────────────────────────────────────── */}
          {LINK_GROUPS.map(({ label, links }) => (
            <div key={label}>
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-white/40 mb-4 leading-none">
                {label}
              </h3>
              <ul className="flex flex-col gap-2.5" role="list">
                {links.map(({ to, label: linkLabel }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="
                        text-[13px] text-white/65
                        hover:text-white
                        hover:no-underline
                        transition-colors duration-150
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-white/40
                        focus-visible:rounded-sm
                      "
                    >
                      {linkLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────────
            Rule is rendered via border-top with a CSS variable so it stays
            consistent with the rest of the dark surface.
        ─────────────────────────────────────────────────────────────────────── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 py-5 text-[11.5px] text-white/40"
          style={{ borderTop: `1px solid ${RULE_COLOR}` }}
        >
          {/* Copyright */}
          <span className="whitespace-nowrap">
            {t('footer.rights', { year: new Date().getFullYear() })}
          </span>

          {/* Legal links + identity */}
          <div className="flex items-center gap-5 flex-wrap">
            <Link
              to="/privacy-policy"
              className="text-white/40 hover:text-white/70 hover:no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:rounded-sm"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              to="/terms"
              className="text-white/40 hover:text-white/70 hover:no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:rounded-sm"
            >
              {t('footer.terms')}
            </Link>
            {/* Separator dot */}
            <span className="text-white/20 select-none" aria-hidden="true">·</span>
            <span className="text-white/35 italic tracking-wide">
              {t('footer.builtIn')}
            </span>
          </div>
        </div>

      </div>
    </footer>
  )
}
