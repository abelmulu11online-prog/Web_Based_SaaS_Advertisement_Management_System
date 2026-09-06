/**
 * Footer.jsx — Structured, typographically refined dark footer.
 *
 * Design principles:
 * - Dark surface, warm ink palette — not harsh pure-black
 * - Strong typographic grouping without visual noise
 * - Generous whitespace, no borders between columns
 * - Brand identity anchored in the first column
 * - Secondary links use restrained opacity hierarchy
 */
import { Link } from 'react-router-dom'

const LINK_GROUPS = [
  {
    label: 'Discover',
    links: [
      { to: '/directory',                         label: 'Browse directory' },
      { to: '/directory?profile_type=FREELANCER', label: 'Freelancers' },
      { to: '/directory?profile_type=SHOP',       label: 'Shops' },
      { to: '/directory?profile_type=BUSINESS',   label: 'Businesses' },
      { to: '/directory/map',                     label: 'Map view' },
    ],
  },
  {
    label: 'Advertise',
    links: [
      { to: '/register',          label: 'Create profile' },
      { to: '/pricing',           label: 'Pricing plans' },
      { to: '/dashboard',         label: 'My dashboard' },
      { to: '/dashboard/profile', label: 'Edit profile' },
    ],
  },
  {
    label: 'Company',
    links: [
      { to: '#', label: 'About us' },
      { to: '#', label: 'Contact' },
      { to: '#', label: 'Privacy policy' },
      { to: '#', label: 'Terms of service' },
    ],
  },
]

/* Warm dark surface — matches the ink color token */
const BG = '#1a1917'
const BG_RULE = 'rgba(255,255,255,0.08)'

export function Footer() {
  return (
    <footer
      className="mt-auto text-white"
      style={{ background: BG }}
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* ── Main grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-[1.8fr_1fr_1fr_1fr] gap-10 sm:gap-12 pt-14 pb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 pr-0 md:pr-8">
            {/* Wordmark */}
            <Link
              to="/"
              className="inline-block mb-4 hover:no-underline"
              aria-label="GebetaPro — home"
            >
              <span className="text-[20px] font-bold tracking-tight text-white">
                Gebeta
                <span className="text-brand">Pro</span>
              </span>
            </Link>

            {/* Tagline */}
            <p className="text-[13.5px] leading-relaxed text-white/50 mb-6 max-w-[260px]">
              Ethiopia's discovery platform. Find skilled people,
              businesses, and services near you.
            </p>

            {/* Location signal */}
            <div className="flex items-center gap-2">
              {/* Ethiopian flag color bar — a subtle nod to identity */}
              <div className="flex gap-0.5 items-center" aria-hidden="true">
                <span className="inline-block w-2 h-2 rounded-full bg-[#078930]" />
                <span className="inline-block w-2 h-2 rounded-full bg-[#FCDD09]" />
                <span className="inline-block w-2 h-2 rounded-full bg-[#DA121A]" />
              </div>
              <span className="text-[12px] text-white/35 tracking-wide">
                Addis Ababa, Ethiopia
              </span>
            </div>
          </div>

          {/* Link columns */}
          {LINK_GROUPS.map(({ label, links }) => (
            <div key={label}>
              <h3
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-5"
              >
                {label}
              </h3>
              <ul className="flex flex-col gap-3" role="list">
                {links.map(({ to, label: linkLabel }) => (
                  <li key={linkLabel}>
                    <Link
                      to={to}
                      className="
                        text-[13px] text-white/55 hover:text-white
                        hover:no-underline transition-colors duration-150
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

        {/* ── Bottom rule ───────────────────────────────────────────────────── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 py-6 text-[12px] text-white/25"
          style={{ borderTop: `1px solid ${BG_RULE}` }}
        >
          <span>© {new Date().getFullYear()} GebetaPro. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link
              to="#"
              className="text-white/25 hover:text-white/60 hover:no-underline transition-colors duration-150"
            >
              Privacy
            </Link>
            <Link
              to="#"
              className="text-white/25 hover:text-white/60 hover:no-underline transition-colors duration-150"
            >
              Terms
            </Link>
            <span className="text-white/20">Built in Ethiopia</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
