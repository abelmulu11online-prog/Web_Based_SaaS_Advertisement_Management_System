/**
 * HomePage.jsx — GebetaPro homepage redesign.
 *
 * Section order & composition strategy:
 *  1. Hero           — Full-bleed, dark surface. Search is the signature product moment.
 *  2. Quick Discovery — Asymmetric category gateway. No uniform icon grid.
 *  3. Featured       — Editorial mixed-size profile layout. One large + supporting small.
 *  4. Location       — City-based discovery. Horizontal scroll strip on mobile.
 *  5. Map CTA        — Split composition. Visual map preview + strong copy.
 *  6. Why GebetaPro  — Large editorial typography. No feature cards.
 *  7. Get Discovered — Full-bleed dark moment. Two-audience CTA.
 *
 * Data connections are preserved exactly — only visual composition changes.
 */
import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, MapPin, ArrowRight, Users, Map,
  ArrowUpRight, ChevronRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useProfileSearch } from '../features/profiles/hooks/useProfile.js'
import { useCategories } from '../features/profiles/hooks/useCategories.js'
import { ProfileCard, ProfileCardLarge } from '../features/profiles/components/ProfileCard.jsx'
import { CategoryIconInline } from '../features/profiles/components/CategoryIcon.jsx'
import { toEnglishSearchTerm, toEnglishCity } from '../lib/searchTermMap.js'

/* ── Static city keys (actual names stay the same for URL params) ─────────── */
const CITY_KEYS = [
  { nameKey: 'addisAbaba', subKey: 'addisAbabaSub', name: 'Addis Ababa' },
  { nameKey: 'gondar',     subKey: 'gondarSub',     name: 'Gondar'      },
  { nameKey: 'hawassa',    subKey: 'hawassaSub',    name: 'Hawassa'     },
  { nameKey: 'bahirDar',   subKey: 'bahirDarSub',   name: 'Bahir Dar'   },
  { nameKey: 'mekelle',    subKey: 'mekelleSub',    name: 'Mekelle'     },
  { nameKey: 'direDawa',   subKey: 'direDawaSub',   name: 'Dire Dawa'   },
  { nameKey: 'jimma',      subKey: 'jimmaSub',      name: 'Jimma'       },
  { nameKey: 'adama',      subKey: 'adamaSub',      name: 'Adama'       },
]

const POPULAR_SEARCH_KEYS = [
  'electrician','plumber','lawyer','restaurant',
  'photographer','tutor','doctor','driver',
]

/* ─────────────────────────────────────────────────────────────────────────────
   Hero search form
───────────────────────────────────────────────────────────────────────────── */
function HeroSearchForm({ onSearch }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [city, setCity]     = useState('')
  const searchRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    // Normalise to English so the backend ILIKE query can match stored data.
    // If the user typed a recognised translated term, resolve it to English;
    // otherwise pass the raw typed value unchanged.
    onSearch(toEnglishSearchTerm(search), toEnglishCity(city))
  }

  function handleQuick(englishTerm) {
    // englishTerm is already resolved by the caller (the button onClick)
    onSearch(englishTerm, '')
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search panel */}
      <form
        onSubmit={handleSubmit}
        className="
          search-ring-focus
          relative flex flex-col sm:flex-row
          bg-white rounded-2xl overflow-hidden
          shadow-[0_8px_40px_rgba(0,0,0,0.18)]
          transition-shadow duration-200
        "
        aria-label="Search GebetaPro"
      >
        {/* What */}
        <div className="flex items-center flex-1 gap-3 px-4 py-3.5 sm:py-0 sm:h-14">
          <Search size={17} className="text-ink-3 shrink-0" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            placeholder={t('home.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none min-w-0"
            aria-label="Search query"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="text-ink-3 hover:text-ink transition-colors shrink-0"
              aria-label={t('home.clearSearch')}
            >
              ×
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-border self-stretch my-3" aria-hidden="true" />
        <div className="block sm:hidden h-px bg-border mx-4" aria-hidden="true" />

        {/* Where */}
        <div className="flex items-center gap-3 px-4 py-3.5 sm:py-0 sm:h-14 sm:w-48">
          <MapPin size={15} className="text-ink-3 shrink-0" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('home.locationPlaceholder')}
            value={city}
            onChange={e => setCity(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none min-w-0"
            aria-label="Location"
          />
        </div>

        {/* Submit */}
        <div className="p-2">
          <button
            type="submit"
            className="
              h-10 sm:h-full px-5 rounded-xl
              bg-brand text-white text-[14px] font-semibold
              hover:bg-brand-hover active:scale-[0.98]
              transition-all duration-150 w-full sm:w-auto
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
            "
          >
            {t('home.searchBtn')}
          </button>
        </div>
      </form>

      {/* Popular searches */}
      <div className="flex items-center gap-2 flex-wrap justify-center mt-5" aria-label="Popular searches">
        <span className="text-[12px] text-ink-3 font-medium tracking-wide uppercase">
          {t('home.popular')}
        </span>
        {POPULAR_SEARCH_KEYS.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => handleQuick(toEnglishSearchTerm(t(`home.popularSearches.${key}`)))}
            className="
              text-[12.5px] text-ink-2 hover:text-brand
              px-3 py-1 rounded-full border border-border hover:border-brand-border
              bg-surface/80 hover:bg-brand-light/40
              transition-all duration-150
            "
          >
            {t(`home.popularSearches.${key}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Category gateway card (asymmetric discovery grid)
───────────────────────────────────────────────────────────────────────────── */
function CategoryGateway({ cat, large = false, onClick }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl text-left
        bg-surface border border-border
        hover:border-brand-border hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)]
        hover:-translate-y-0.5
        transition-all duration-200 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
        ${large ? 'p-6' : 'p-4'}
      `}
      aria-label={`${t('home.viewAll')} ${cat.name}`}
    >
      {/* Icon */}
      <div className={`mb-3 ${large ? 'mb-4' : ''}`}>
        <CategoryIconInline
          slug={cat.slug}
          name={cat.name}
          size={large ? 22 : 18}
          className="opacity-70 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Name */}
      <span
        className={`
          block font-semibold text-ink leading-tight
          ${large ? 'text-[15px]' : 'text-[13px]'}
        `}
      >
        {cat.name}
      </span>

      {/* Arrow — appears on hover */}
      <span
        className="
          absolute top-3 right-3
          text-ink-3 opacity-0 group-hover:opacity-100
          transition-opacity duration-150
        "
        aria-hidden="true"
      >
        <ArrowUpRight size={14} />
      </span>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   HomePage
───────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const { t } = useTranslation()
  const navigate  = useNavigate()
  const [activeCategoryId, setActiveCategoryId] = useState('')

  /* ── Data ──────────────────────────────────────────────────────────────── */
  const { data: categoriesData } = useCategories()
  const topCategories = useMemo(() => {
    const tree = Array.isArray(categoriesData) ? categoriesData : []
    return tree.slice(0, 8)
  }, [categoriesData])

  const { data: featuredData, isLoading } = useProfileSearch({ page_size: 8 })
  const featured = featuredData?.profiles || []

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  function handleSearch(search, city) {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (city)   params.set('city', city)
    if (activeCategoryId) params.set('category_id', activeCategoryId)
    navigate(`/directory?${params.toString()}`)
  }

  function handleCategorySearch(catId) {
    setActiveCategoryId(catId)
    navigate(`/directory?category_id=${catId}`)
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />
      <main className="flex-1" id="main-content">

        {/* ══════════════════════════════════════════════════════════════════
            § 1  HERO
            Light discovery surface — warm canvas with map-inspired geometry.
            Search is the signature product moment.
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{ background: 'var(--color-canvas)' }}
          aria-label="Search GebetaPro"
        >
          {/* Map-grid lines — evokes geographic discovery, brand color */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                'linear-gradient(var(--color-brand-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-brand-border) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
              opacity: 0.35,
            }}
          />

          {/* Map pin cluster — top-right decorative, structural to identity */}
          <div
            className="absolute top-8 right-8 pointer-events-none hidden sm:block"
            aria-hidden="true"
          >
            {[
              { size: 10, top: '0px',  left: '40px', opacity: 0.18 },
              { size: 7,  top: '28px', left: '0px',  opacity: 0.12 },
              { size: 8,  top: '52px', left: '64px', opacity: 0.15 },
              { size: 6,  top: '14px', left: '90px', opacity: 0.10 },
            ].map((pin, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-brand"
                style={{
                  width: pin.size, height: pin.size,
                  top: pin.top, left: pin.left,
                  opacity: pin.opacity,
                }}
              />
            ))}
          </div>

          {/* Same pins — bottom-left */}
          <div
            className="absolute bottom-12 left-6 pointer-events-none hidden sm:block"
            aria-hidden="true"
          >
            {[
              { size: 9,  top: '0px',  left: '24px', opacity: 0.14 },
              { size: 6,  top: '26px', left: '0px',  opacity: 0.09 },
              { size: 7,  top: '10px', left: '50px', opacity: 0.11 },
            ].map((pin, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-brand"
                style={{
                  width: pin.size, height: pin.size,
                  top: pin.top, left: pin.left,
                  opacity: pin.opacity,
                }}
              />
            ))}
          </div>

          {/* Soft brand radial glow — center, very subtle */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(26,107,94,0.06) 0%, transparent 80%)',
            }}
          />

          <div className="relative max-w-4xl mx-auto px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">

            {/* Eyebrow label — same style, adapted for light bg */}
            <div className="animate-fade-up flex justify-center mb-6">
              <span
                className="
                  inline-flex items-center gap-2
                  text-[11.5px] font-semibold uppercase tracking-[0.12em]
                  text-ink-3 border border-border
                  px-3.5 py-1.5 rounded-full bg-surface/80
                "
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
                {t('home.eyebrow')}
              </span>
            </div>

            {/* Primary statement — same font treatment, ink on light */}
            <h1
              className="
                animate-fade-up delay-75
                text-[38px] sm:text-[54px] lg:text-[64px]
                font-extrabold text-ink
                leading-[1.08] tracking-[-0.03em]
                mb-5
              "
            >
              {t('home.heroTitle1')}{' '}
              <br className="hidden sm:block" />
              <span
                className="relative inline-block"
                style={{
                  color: 'transparent',
                  WebkitTextStroke: '1.5px var(--color-brand-border)',
                }}
              >
                {t('home.heroTitle2')}
              </span>
              <br className="hidden sm:block" />
              <span className="text-ink/70">{t('home.heroTitle3')}</span>
            </h1>

            {/* Supporting message — styled like the "Why GebetaPro" body text */}
            {/* Supporting message — two intentional centered lines */}
            <div className="animate-fade-up delay-150 flex flex-col items-center gap-1.5 mb-10">
              {/* Line 1 — heavier, the promise */}
              <p className="
                text-[17px] sm:text-[20px] font-semibold text-ink
                text-center tracking-[-0.02em] leading-snug
              ">
                {t('home.heroSub1')}
                <span className="text-brand"> {t('home.heroSub1Brand')}</span>
              </p>
              {/* Line 2 — lighter, the instruction */}
              <p className="
                text-[14px] sm:text-[15px] font-normal text-ink-3
                text-center tracking-wide leading-relaxed
                uppercase
              ">
                {t('home.heroSub2')}
              </p>
            </div>

            {/* Search — the centrepiece */}
            <div className="animate-fade-up delay-225">
              <HeroSearchForm onSearch={handleSearch} />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            § 2  QUICK DISCOVERY — Category gateway
            Asymmetric composition. NOT a uniform 8-icon grid.
            First two categories get large cards; remaining six get small.
            On mobile: horizontally scrollable.
        ════════════════════════════════════════════════════════════════════ */}
        {topCategories.length > 0 && (
          <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
            {/* Section label */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-1.5">
                  {t('home.browseByType')}
                </p>
                <h2 className="text-[26px] sm:text-[32px] font-bold text-ink tracking-tight leading-tight">
                  {t('home.whatLookingFor')}
                </h2>
              </div>
              <button
                onClick={() => navigate('/directory')}
                className="
                  hidden sm:flex items-center gap-1.5
                  text-[13px] font-medium text-ink-2 hover:text-ink
                  transition-colors duration-150
                "
                aria-label="View all categories"
              >
                {t('home.viewAll')} <ChevronRight size={14} />
              </button>
            </div>

            {/* Desktop: asymmetric bento layout */}
            <div className="hidden sm:grid grid-cols-4 gap-3">
              {/* Large cards — first 2 */}
              {topCategories.slice(0, 2).map(cat => (
                <div key={cat.id} className="col-span-2 row-span-1">
                  <CategoryGateway
                    cat={cat}
                    large
                    onClick={() => handleCategorySearch(cat.id)}
                  />
                </div>
              ))}
              {/* Small cards — next 4 */}
              {topCategories.slice(2, 6).map(cat => (
                <CategoryGateway
                  key={cat.id}
                  cat={cat}
                  onClick={() => handleCategorySearch(cat.id)}
                />
              ))}
              {/* Last 2 — medium spanning */}
              {topCategories.slice(6, 8).map(cat => (
                <div key={cat.id} className="col-span-2">
                  <CategoryGateway
                    cat={cat}
                    onClick={() => handleCategorySearch(cat.id)}
                  />
                </div>
              ))}
            </div>

            {/* Mobile: horizontal scroll */}
            <div
              className="
                sm:hidden flex gap-3 overflow-x-auto pb-2
                snap-x snap-mandatory scroll-smooth
                -mx-5 px-5
              "
              style={{ scrollbarWidth: 'none' }}
            >
              {topCategories.map(cat => (
                <div
                  key={cat.id}
                  className="snap-start shrink-0 w-[140px]"
                >
                  <CategoryGateway
                    cat={cat}
                    onClick={() => handleCategorySearch(cat.id)}
                  />
                </div>
              ))}
            </div>

            {/* Mobile — view all link */}
            <div className="sm:hidden mt-4 text-center">
              <button
                onClick={() => navigate('/directory')}
                className="text-[13px] font-medium text-brand flex items-center gap-1 mx-auto hover:underline"
              >
                {t('home.viewAllCategories')} <ChevronRight size={13} />
              </button>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            § 3  FEATURED PROFILES — Editorial mixed-size layout
            One large hero card + supporting smaller cards.
            NOT a uniform 4-column grid.
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="border-t border-border"
          aria-label="Featured profiles"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
            {/* Header */}
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-1.5">
                  {t('home.featuredListings')}
                </p>
                <h2 className="text-[26px] sm:text-[32px] font-bold text-ink tracking-tight leading-tight">
                  {t('home.peopleMakingThings')}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconRight={<ArrowRight size={13} />}
                onClick={() => navigate('/directory')}
                className="hidden sm:inline-flex text-ink-2 shrink-0"
              >
                {t('home.seeAll')}
              </Button>
            </div>

            {/* Content */}
            {isLoading ? (
              /* Skeleton — preserves layout shape during load */
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2 sm:row-span-2 bg-surface border border-border rounded-2xl h-96 sm:h-full animate-pulse" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface border border-border rounded-2xl h-56 animate-pulse"
                  />
                ))}
              </div>
            ) : featured.length === 0 ? (
              <div className="text-center py-20 text-ink-2">
                <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-5">
                <Users size={36} className="mx-auto mb-4 text-ink-4" aria-hidden="true" />
              </div>
                <p className="text-[15px] font-medium text-ink mb-1">
                  {t('home.noListingsYet')}
                </p>
                <p className="text-[13px] text-ink-3">
                  {t('home.beFirst')}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop: editorial asymmetric grid */}
                <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Large hero card — spans 2 columns & 2 rows */}
                  {featured[0] && (
                    <div className="col-span-1 lg:col-span-2 row-span-2">
                      <ProfileCardLarge profile={featured[0]} />
                    </div>
                  )}
                  {/* Supporting cards */}
                  {featured.slice(1, 5).map(profile => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                  {/* Bottom row — remaining */}
                  {featured.slice(5, 8).map(profile => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>

                {/* Mobile: standard single-column stack */}
                <div className="sm:hidden grid grid-cols-2 gap-3">
                  {featured.slice(0, 6).map(profile => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>

                {/* Mobile — see all */}
                <div className="sm:hidden mt-6 text-center">
                  <Button
                    variant="secondary"
                    size="md"
                    iconRight={<ArrowRight size={14} />}
                    onClick={() => navigate('/directory')}
                  >
                    {t('home.seeAllListings')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            § 4  LOCATION DISCOVERY
            Horizontal city strip with a clear editorial header.
            Cities as navigable surfaces, not labeled buttons.
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-surface border-t border-border"
          aria-label="Discover by city"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16 items-start">

              {/* Left: copy */}
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-1.5">
                  {t('home.byLocation')}
                </p>
                <h2 className="text-[26px] sm:text-[32px] font-bold text-ink tracking-tight leading-tight mb-4">
                  {t('home.exploreCity')}
                </h2>
                <p className="text-[14px] text-ink-2 leading-relaxed max-w-sm mb-6">
                  {t('home.locationDesc')}
                </p>
                <button
                  onClick={() => navigate('/directory')}
                  className="
                    inline-flex items-center gap-2
                    text-[13.5px] font-semibold text-brand
                    hover:text-brand-hover transition-colors duration-150
                  "
                  aria-label="Browse all locations"
                >
                  {t('home.browseAllLocations')} <ArrowUpRight size={14} />
                </button>
              </div>

              {/* Right: city grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CITY_KEYS.map(({ nameKey, subKey, name }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      navigate(`/directory?city=${encodeURIComponent(name)}`)
                    }
                    className="
                      group text-left p-4 rounded-xl
                      bg-canvas border border-border
                      hover:border-brand-border hover:bg-brand-light/30
                      hover:-translate-y-0.5
                      transition-all duration-150 ease-out
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-brand focus-visible:ring-offset-2
                    "
                    aria-label={`Explore ${name}`}
                  >
                    <span className="block text-[13.5px] font-semibold text-ink mb-0.5 leading-tight">
                      {t(`home.cities.${nameKey}`)}
                    </span>
                    <span className="block text-[11px] text-ink-3 leading-tight">
                      {t(`home.cities.${subKey}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            § 5  MAP CTA
            Split layout — large typographic statement left, map invite right.
            Avoids the generic emoji-box treatment.
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="border-t border-border"
          aria-label="Discover on the map"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
            <div
              className="
                relative overflow-hidden rounded-3xl
                grid grid-cols-1 lg:grid-cols-2 gap-0
              "
              style={{ background: '#1a1917' }}
            >
              {/* Dot grid */}
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Left: copy */}
              <div className="relative z-10 p-8 sm:p-12 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-4">
                  {t('home.mapDiscovery')}
                </p>
                <h2 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight leading-tight mb-4">
                  {t('home.seeWhoAround')}
                  <br />
                  <span className="text-white/40">{t('home.onTheMap')}</span>
                </h2>
                <p className="text-[14px] text-white/50 leading-relaxed mb-8 max-w-sm">
                  {t('home.mapDesc')}
                </p>
                <div>
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<Map size={16} />}
                    onClick={() => navigate('/directory/map')}
                    className="rounded-xl"
                  >
                    {t('home.openMapView')}
                  </Button>
                </div>
              </div>

              {/* Right: stylised map preview surface */}
              <div
                className="relative h-56 lg:h-auto overflow-hidden"
                aria-hidden="true"
              >
                {/* Abstract map surface */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Grid lines suggesting a map */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                      backgroundSize: '32px 32px',
                    }}
                  />

                  {/* Pin cluster */}
                  <div className="relative w-full h-full">
                    {/* Simulated pin dots with brand color */}
                    {[
                      { top: '28%', left: '42%', size: 'lg', label: 'Addis Ababa' },
                      { top: '18%', left: '55%', size: 'sm', label: '' },
                      { top: '45%', left: '60%', size: 'sm', label: '' },
                      { top: '55%', left: '35%', size: 'sm', label: '' },
                      { top: '35%', left: '28%', size: 'sm', label: '' },
                      { top: '62%', left: '52%', size: 'md', label: '' },
                      { top: '22%', left: '38%', size: 'sm', label: '' },
                    ].map((pin, i) => (
                      <div
                        key={i}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ top: pin.top, left: pin.left }}
                      >
                        <div
                          className={`
                            rounded-full bg-brand shadow-[0_0_0_3px_rgba(26,107,94,0.25)]
                            ${pin.size === 'lg' ? 'w-4 h-4' : pin.size === 'md' ? 'w-3 h-3' : 'w-2 h-2'}
                          `}
                        />
                        {pin.label && (
                          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 whitespace-nowrap font-medium">
                            {pin.label}
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Subtle ripple on the main pin */}
                    <div
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ top: '28%', left: '42%' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full border border-brand/30"
                        style={{ animation: 'ring-pulse 3s ease infinite' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom fade to blend with dark surface */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, #1a1917)',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            § 6  WHY GEBETAPRO — Editorial storytelling
            NO feature cards. Large bold typography as the design tool.
            Three truths about the platform, stated plainly and powerfully.
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-canvas border-t border-border"
          aria-label="Why GebetaPro"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">

            {/* Large editorial statement */}
            <div className="max-w-3xl mb-16 sm:mb-20">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-5">
                {t('home.whyTitle')}
              </p>
              <h2
                className="
                  text-[32px] sm:text-[46px] lg:text-[54px]
                  font-extrabold text-ink tracking-[-0.03em]
                  leading-[1.08]
                "
              >
                A place to be found.{' '}
                <span className="text-ink-3 font-normal">
                  Whether you are an electrician, a lawyer,
                  a restaurant, a freelancer, or a shop owner —
                  GebetaPro is where Ethiopia looks for you.
                </span>
              </h2>
            </div>

            {/* Three truths — not cards, not icons. Just text hierarchy. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12 lg:gap-16">

              <div>
                <p className="text-[38px] sm:text-[44px] font-extrabold text-brand/20 leading-none mb-3 tracking-tight">
                  01
                </p>
                <h3 className="text-[17px] font-bold text-ink mb-2 leading-snug">
                  Anyone can join
                </h3>
                <p className="text-[14px] text-ink-2 leading-relaxed">
                  Tradespeople, creatives, professionals, shops, organisations.
                  If you have something to offer, create your profile and be
                  discovered — for free.
                </p>
              </div>

              <div>
                <p className="text-[38px] sm:text-[44px] font-extrabold text-brand/20 leading-none mb-3 tracking-tight">
                  02
                </p>
                <h3 className="text-[17px] font-bold text-ink mb-2 leading-snug">
                  Real reviews
                </h3>
                <p className="text-[14px] text-ink-2 leading-relaxed">
                  Genuine ratings from real customers help people choose
                  with confidence. No fake trust signals — just honest
                  feedback that builds reputations.
                </p>
              </div>

              <div>
                <p className="text-[38px] sm:text-[44px] font-extrabold text-brand/20 leading-none mb-3 tracking-tight">
                  03
                </p>
                <h3 className="text-[17px] font-bold text-ink mb-2 leading-snug">
                  Direct contact
                </h3>
                <p className="text-[14px] text-ink-2 leading-relaxed">
                  Phone, WhatsApp, Telegram, directions. Connect with
                  anyone directly — no intermediary, no booking fees,
                  no friction.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            § 7  GET DISCOVERED — The most powerful visual moment on the page.
            Dark surface. The second audience: people who want to advertise.
            Bold promise. Clear single CTA. Confident typographic statement.
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{ background: '#1a1917' }}
          aria-label="Create your profile"
        >
          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Brand glow — top right */}
          <div
            className="absolute -top-20 right-0 pointer-events-none"
            aria-hidden="true"
            style={{
              width: '480px',
              height: '480px',
              background:
                'radial-gradient(circle at top right, rgba(26,107,94,0.15) 0%, transparent 65%)',
            }}
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-center">

              {/* Left: statement */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-6">
                  {t('home.getDiscoveredTitle')}
                </p>
                <h2
                  className="
                    text-[34px] sm:text-[48px] lg:text-[56px]
                    font-extrabold text-white
                    tracking-[-0.03em] leading-[1.07]
                    mb-6
                  "
                >
                  {t('home.getDiscoveredTitle')}
                  <br />
                  <span
                    className="relative text-transparent"
                    style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.25)' }}
                  >
                    {t('home.getDiscoveredSub')}
                  </span>
                </h2>
                <p className="text-[15px] text-white/45 leading-relaxed max-w-md mb-10">
                  {t('home.getDiscoveredSub')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/register')}
                    className="rounded-xl font-semibold"
                  >
                    {t('home.startFreeProfile')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => navigate('/pricing')}
                    className="text-white/60 hover:text-white border-white/10 hover:border-white/25 hover:bg-white/5 rounded-xl"
                  >
                    {t('nav.pricing')}
                  </Button>
                </div>
              </div>

              {/* Right: profile card preview — abstract */}
              <div className="hidden lg:flex items-center justify-center">
                <div
                  className="
                    relative w-[280px]
                    rounded-2xl overflow-hidden
                    border border-white/8
                    bg-white/4
                  "
                  aria-hidden="true"
                >
                  {/* Fake cover */}
                  <div
                    className="h-28 w-full"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(26,107,94,0.35) 0%, rgba(255,255,255,0.04) 100%)',
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    />
                  </div>

                  <div className="px-5 pt-3 pb-5">
                    {/* Avatar placeholder */}
                    <div className="-mt-8 mb-3 w-12 h-12 rounded-xl bg-brand/30 border-2 border-[#1a1917] flex items-center justify-center">
                      <span className="text-[18px] font-bold text-brand/80">Y</span>
                    </div>
                    {/* Name placeholder */}
                    <div className="h-4 w-32 rounded bg-white/10 mb-2" />
                    {/* Headline placeholder */}
                    <div className="h-3 w-44 rounded bg-white/6 mb-1" />
                    <div className="h-3 w-36 rounded bg-white/6 mb-4" />
                    {/* Meta row */}
                    <div className="flex gap-2 pt-3 border-t border-white/8">
                      <div className="h-3 w-20 rounded bg-white/6" />
                      <div className="h-3 w-16 rounded bg-white/6" />
                    </div>
                  </div>

                  {/* "Your profile" label */}
                  <div
                    className="
                      absolute top-3 right-3
                      text-[10px] font-semibold uppercase tracking-[0.1em]
                      text-white/30 bg-white/6
                      px-2 py-1 rounded-full
                    "
                  >
                  Your profile
                </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
