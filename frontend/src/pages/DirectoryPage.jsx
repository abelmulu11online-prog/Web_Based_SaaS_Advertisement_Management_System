/**
 * DirectoryPage.jsx — GebetaPro discovery engine.
 *
 * Architecture:
 *   1. Compact discovery header  — focused, not a marketing hero
 *   2. Premium search bar        — unified query + location + submit
 *   3. Active filter chips       — clear context, easy removal
 *   4. Results toolbar           — count + view switcher + sort + map link
 *   5. Filter sidebar (desktop)  — lightweight, collapsible groups
 *   6. Result grid / list        — view-aware, layout-stable skeletons
 *   7. Pagination                — clean, keyboard-accessible
 *   8. Mobile filter sheet       — full-screen panel, sticky apply button
 *
 * All existing functionality is fully preserved:
 *   search, category_id, city, country, profile_type,
 *   verified_only, latitude, longitude, radius_km, page, page_size
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  Search, SlidersHorizontal, X, MapPin, LayoutGrid, List, Map,
  ChevronDown, ChevronUp, Users, BadgeCheck, LocateFixed, ArrowRight,
  ArrowUpRight,
} from 'lucide-react'
import { Navbar }    from '../components/layout/Navbar.jsx'
import { Footer }    from '../components/layout/Footer.jsx'
import { Button }    from '../components/ui/Button.jsx'
import { SkeletonCard, SkeletonListCard } from '../components/ui/Skeleton.jsx'
import { ProfileCard, ProfileListCard }   from '../features/profiles/components/ProfileCard.jsx'
import { useProfileSearch }  from '../features/profiles/hooks/useProfile.js'
import { useCategories }     from '../features/profiles/hooks/useCategories.js'
import { CategoryIconInline } from '../features/profiles/components/CategoryIcon.jsx'
import { RadiusSelector }    from '../features/locations/components/RadiusSelector.jsx'
import { UserLocationButtonControlled } from '../features/locations/components/UserLocationButton.jsx'
import { useGeolocation }    from '../features/locations/hooks/useGeolocation.js'

/* ── Constants ───────────────────────────────────────────────────────────────── */

const PROFILE_TYPES = [
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'FREELANCER',   label: 'Freelancer'   },
  { value: 'BUSINESS',     label: 'Business'     },
  { value: 'SHOP',         label: 'Shop'         },
  { value: 'COMPANY',      label: 'Company'      },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'PERSONAL',     label: 'Personal'     },
]

const SORT_OPTIONS = [
  { value: 'featured', label: 'Recommended'   },
  { value: 'rating',   label: 'Highest rated' },
  { value: 'newest',   label: 'Newest'        },
]

function flattenCategories(tree) {
  const result = []
  for (const cat of tree) {
    result.push(cat)
    if (Array.isArray(cat.children)) {
      for (const child of cat.children) result.push({ ...child, isChild: true })
    }
  }
  return result
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

/**
 * CollapsibleGroup — filter section with animated open/close.
 * Starts open by default; can be controlled.
 */
function CollapsibleGroup({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="
          w-full flex items-center justify-between
          py-3 text-left
          text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3
          hover:text-ink transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        "
        aria-expanded={open}
      >
        {title}
        {open
          ? <ChevronUp  size={13} className="text-ink-4 shrink-0" />
          : <ChevronDown size={13} className="text-ink-4 shrink-0" />
        }
      </button>
      {open && (
        <div className="pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Toggle — minimal on/off pill switch.
 */
function Toggle({ checked, onChange, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex w-8 h-[18px] rounded-full border
        transition-colors duration-150 shrink-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        ${checked ? 'bg-brand border-brand' : 'bg-surface-2 border-border-2'}
      `}
    >
      <span
        className={`
          absolute top-[2px] w-[13px] h-[13px] bg-white rounded-full shadow
          transition-transform duration-150
          ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}
        `}
      />
    </button>
  )
}

/* ── FilterPanel ─────────────────────────────────────────────────────────────── */
/**
 * The full filter panel — rendered in the desktop sidebar AND the mobile sheet.
 * Receives all filter state + setters from the parent; owns no state itself.
 */
function FilterPanel({
  filters, updateFilter,
  categories, geo, radiusKm, setRadiusKm,
  useNearMe, setUseNearMe,
  clearFilters, activeFilterCount,
}) {
  return (
    <div className="flex flex-col">

      {/* ── Near me ──────────────────────────────────────────────────── */}
      <CollapsibleGroup title="Near me" defaultOpen>
        <div className="flex flex-col gap-2">
          <UserLocationButtonControlled
            loading={geo.loading}
            error={null}
            supported={geo.supported}
            onRequest={() => {
              geo.getLocation()
              setUseNearMe(true)
              updateFilter('page', 1)
            }}
            label={geo.lat != null ? 'Location set ✓' : 'Use my location'}
          />
          {geo.error && (
            <p className="text-[11.5px] text-danger leading-snug">{geo.error}</p>
          )}
          {geo.lat != null && (
            <>
              <RadiusSelector
                value={radiusKm}
                onChange={km => { setRadiusKm(km); updateFilter('page', 1) }}
              />
              <button
                type="button"
                onClick={() => { setUseNearMe(false); geo.clear?.(); updateFilter('page', 1) }}
                className="text-[12px] text-danger hover:underline text-left"
              >
                Clear location
              </button>
            </>
          )}
        </div>
      </CollapsibleGroup>

      {/* ── Category ─────────────────────────────────────────────────── */}
      <CollapsibleGroup title="Category" defaultOpen>
        <div className="flex flex-col gap-px max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          <button
            type="button"
            onClick={() => updateFilter('category_id', '')}
            className={`
              text-left text-[13px] px-2 py-1.5 rounded-lg transition-colors duration-100
              ${!filters.category_id
                ? 'bg-brand-light text-brand font-semibold'
                : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }
            `}
          >
            All categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateFilter('category_id', cat.id)}
              className={`
                text-left text-[13px] px-2 py-1.5 rounded-lg transition-colors duration-100
                flex items-center gap-1.5
                ${cat.isChild ? 'pl-5 text-[12px]' : ''}
                ${filters.category_id === cat.id
                  ? 'bg-brand-light text-brand font-semibold'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }
              `}
            >
              <CategoryIconInline slug={cat.slug} name={cat.name} size={12} className="shrink-0" />
              {cat.name}
            </button>
          ))}
        </div>
      </CollapsibleGroup>

      {/* ── Location ─────────────────────────────────────────────────── */}
      <CollapsibleGroup title="Location" defaultOpen>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              type="text"
              placeholder="City or area"
              value={filters.city}
              onChange={e => updateFilter('city', e.target.value)}
              className="
                w-full h-8 pl-7 pr-2.5
                bg-canvas border border-border rounded-lg
                text-[13px] text-ink placeholder:text-ink-3
                outline-none focus:border-brand transition-colors duration-150
              "
              aria-label="Filter by city"
            />
          </div>
          <input
            type="text"
            placeholder="Country"
            value={filters.country}
            onChange={e => updateFilter('country', e.target.value)}
            className="
              w-full h-8 px-2.5
              bg-canvas border border-border rounded-lg
              text-[13px] text-ink placeholder:text-ink-3
              outline-none focus:border-brand transition-colors duration-150
            "
            aria-label="Filter by country"
          />
        </div>
      </CollapsibleGroup>

      {/* ── Profile type ─────────────────────────────────────────────── */}
      <CollapsibleGroup title="Type" defaultOpen>
        <div className="flex flex-col gap-px">
          <button
            type="button"
            onClick={() => updateFilter('profile_type', '')}
            className={`
              text-left text-[13px] px-2 py-1.5 rounded-lg transition-colors duration-100
              ${!filters.profile_type
                ? 'bg-brand-light text-brand font-semibold'
                : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }
            `}
          >
            All types
          </button>
          {PROFILE_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => updateFilter('profile_type', t.value)}
              className={`
                text-left text-[13px] px-2 py-1.5 rounded-lg transition-colors duration-100
                ${filters.profile_type === t.value
                  ? 'bg-brand-light text-brand font-semibold'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }
              `}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CollapsibleGroup>

      {/* ── Trust ────────────────────────────────────────────────────── */}
      <CollapsibleGroup title="Trust" defaultOpen={false}>
        <label
          htmlFor="verified-toggle"
          className="flex items-center justify-between cursor-pointer select-none group py-0.5"
        >
          <span className="flex items-center gap-1.5 text-[13px] text-ink">
            <BadgeCheck size={13} className="text-brand" aria-hidden="true" />
            Verified only
          </span>
          <Toggle
            id="verified-toggle"
            checked={filters.verified_only}
            onChange={v => updateFilter('verified_only', v)}
          />
        </label>
      </CollapsibleGroup>

      {/* ── Clear all ────────────────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={clearFilters}
          className="
            mt-3 flex items-center gap-1.5 text-[12.5px] text-danger
            hover:underline transition-colors duration-150
          "
        >
          <X size={12} />
          Clear all filters
        </button>
      )}
    </div>
  )
}

/* ── ActiveFilterChips ───────────────────────────────────────────────────────── */
function ActiveFilterChips({ filters, categories, useNearMe, updateFilter, setUseNearMe, geo, clearFilters }) {
  const chips = []

  if (filters.search) {
    chips.push({
      key: 'search',
      label: `"${filters.search}"`,
      onRemove: () => updateFilter('search', ''),
    })
  }
  if (filters.category_id) {
    const cat = categories.find(c => c.id === filters.category_id)
    chips.push({
      key: 'category',
      label: cat?.name || 'Category',
      onRemove: () => updateFilter('category_id', ''),
    })
  }
  if (filters.city) {
    chips.push({
      key: 'city',
      label: filters.city,
      icon: <MapPin size={10} />,
      onRemove: () => updateFilter('city', ''),
    })
  }
  if (filters.country) {
    chips.push({
      key: 'country',
      label: filters.country,
      icon: <MapPin size={10} />,
      onRemove: () => updateFilter('country', ''),
    })
  }
  if (filters.profile_type) {
    const t = PROFILE_TYPES.find(p => p.value === filters.profile_type)
    chips.push({
      key: 'type',
      label: t?.label || filters.profile_type,
      onRemove: () => updateFilter('profile_type', ''),
    })
  }
  if (filters.verified_only) {
    chips.push({
      key: 'verified',
      label: 'Verified',
      icon: <BadgeCheck size={10} />,
      onRemove: () => updateFilter('verified_only', false),
    })
  }
  if (useNearMe && geo.lat != null) {
    chips.push({
      key: 'nearme',
      label: 'Near me',
      icon: <LocateFixed size={10} />,
      onRemove: () => { setUseNearMe(false); geo.clear?.(); updateFilter('page', 1) },
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Active filters">
      {chips.map(chip => (
        <span
          key={chip.key}
          className="
            inline-flex items-center gap-1.5
            text-[12px] font-medium text-ink
            bg-surface border border-border
            pl-2.5 pr-1.5 py-1 rounded-full
            transition-colors duration-150
          "
        >
          {chip.icon && <span className="text-ink-3" aria-hidden="true">{chip.icon}</span>}
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="
              flex items-center justify-center
              w-4 h-4 rounded-full
              text-ink-3 hover:text-ink hover:bg-surface-2
              transition-colors duration-100
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand
            "
            aria-label={`Remove ${chip.label} filter`}
          >
            <X size={9} />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-[12px] text-ink-3 hover:text-danger transition-colors duration-150 underline underline-offset-2"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────────────────────────────────── */
function EmptyState({ filters, categories, clearFilters, updateFilter }) {
  const hasSearch   = !!filters.search
  const hasLocation = !!(filters.city || filters.country)
  const hasCat      = !!filters.category_id
  const catName     = hasCat ? categories.find(c => c.id === filters.category_id)?.name : null

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-5">
        <Users size={24} className="text-ink-4" aria-hidden="true" />
      </div>

      {/* Headline */}
      <h3 className="text-[17px] font-semibold text-ink mb-2">
        {hasSearch
          ? `No results for "${filters.search}"`
          : 'No profiles found'
        }
      </h3>

      {/* Contextual explanation */}
      <p className="text-[13.5px] text-ink-2 max-w-sm leading-relaxed mb-6">
        {hasLocation && hasSearch
          ? `We couldn't find "${filters.search}" in ${filters.city || filters.country}. Try a different location or broader search.`
          : hasCat && hasSearch
          ? `No ${catName} results for "${filters.search}". Try removing the category filter.`
          : hasSearch
          ? 'Try different keywords, or browse without a search term.'
          : 'Try removing some filters to see more results.'
        }
      </p>

      {/* Suggested actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        {hasSearch && (
          <button
            type="button"
            onClick={() => updateFilter('search', '')}
            className="
              inline-flex items-center gap-1.5 text-[13px] font-medium
              text-ink border border-border bg-surface
              px-3.5 py-2 rounded-lg
              hover:border-brand-border hover:bg-brand-light/30
              transition-all duration-150
            "
          >
            <X size={12} /> Clear search
          </button>
        )}
        {hasLocation && (
          <button
            type="button"
            onClick={() => { updateFilter('city', ''); updateFilter('country', '') }}
            className="
              inline-flex items-center gap-1.5 text-[13px] font-medium
              text-ink border border-border bg-surface
              px-3.5 py-2 rounded-lg
              hover:border-brand-border hover:bg-brand-light/30
              transition-all duration-150
            "
          >
            <MapPin size={12} /> Remove location
          </button>
        )}
        {(hasSearch || hasLocation || hasCat) && (
          <Button variant="secondary" size="md" onClick={clearFilters}>
            Clear all filters
          </Button>
        )}
      </div>
    </div>
  )
}

/* ── Pagination ──────────────────────────────────────────────────────────────── */
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  // Build visible page numbers — first, last, current ±1, with ellipsis
  const pages = []
  const addPage = (n) => { if (!pages.includes(n) && n >= 1 && n <= totalPages) pages.push(n) }
  addPage(1)
  addPage(page - 1)
  addPage(page)
  addPage(page + 1)
  addPage(totalPages)
  pages.sort((a, b) => a - b)

  // Insert null for gaps
  const items = []
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push(null)
    items.push(pages[i])
  }

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-10"
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="
          h-9 px-3.5 rounded-lg border border-border text-[13px] font-medium text-ink-2
          hover:border-brand-border hover:text-ink hover:bg-surface-2
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-transparent
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        "
        aria-label="Previous page"
      >
        ←
      </button>

      {items.map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-2 text-ink-4 text-[13px]">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`
              h-9 min-w-[36px] px-2.5 rounded-lg
              text-[13px] font-medium
              transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
              ${p === page
                ? 'bg-brand text-white border border-brand'
                : 'border border-border text-ink-2 hover:border-brand-border hover:text-ink hover:bg-surface-2'
              }
            `}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="
          h-9 px-3.5 rounded-lg border border-border text-[13px] font-medium text-ink-2
          hover:border-brand-border hover:text-ink hover:bg-surface-2
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-transparent
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        "
        aria-label="Next page"
      >
        →
      </button>
    </nav>
  )
}

/* ════════════════════════════════════════════════════════════════════════════════
   DirectoryPage
════════════════════════════════════════════════════════════════════════════════ */
export default function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  /* ── View state ─────────────────────────────────────────────────────────── */
  const [sheetOpen, setSheetOpen] = useState(false)       // mobile filter sheet
  const [viewMode, setViewMode]   = useState('grid')       // 'grid' | 'list'
  const searchInputRef = useRef(null)

  /* ── Geolocation ────────────────────────────────────────────────────────── */
  const geo = useGeolocation()
  const [radiusKm, setRadiusKm]   = useState(10)
  const [useNearMe, setUseNearMe] = useState(false)

  /* ── Filter state (initialized from URL params) ─────────────────────────── */
  const [filters, setFilters] = useState({
    search:        searchParams.get('search')        || '',
    category_id:   searchParams.get('category_id')   || '',
    city:          searchParams.get('city')           || '',
    country:       searchParams.get('country')        || '',
    profile_type:  searchParams.get('profile_type')  || '',
    verified_only: searchParams.get('verified_only') === 'true',
    sort:          searchParams.get('sort')           || 'featured',
    page:          1,
  })

  /* ── Local search input (tracks typed value before submit) ─────────────── */
  const [searchInput, setSearchInput] = useState(filters.search)

  /* ── Categories ─────────────────────────────────────────────────────────── */
  const { data: categoriesData } = useCategories()
  const categories = useMemo(
    () => flattenCategories(Array.isArray(categoriesData) ? categoriesData : []),
    [categoriesData],
  )

  /* ── API params ─────────────────────────────────────────────────────────── */
  const apiParams = useMemo(() => {
    const p = { page: filters.page, page_size: 24 }
    if (filters.search)        p.search        = filters.search
    if (filters.category_id)   p.category_id   = filters.category_id
    if (filters.city)          p.city          = filters.city
    if (filters.country)       p.country       = filters.country
    if (filters.profile_type)  p.profile_type  = filters.profile_type
    if (filters.verified_only) p.verified_only = true
    if (useNearMe && geo.lat != null) {
      p.latitude  = geo.lat
      p.longitude = geo.lng
      p.radius_km = radiusKm
    }
    return p
  }, [filters, useNearMe, geo.lat, geo.lng, radiusKm])

  /* ── Data ───────────────────────────────────────────────────────────────── */
  const { data, isLoading } = useProfileSearch(apiParams)
  const profiles    = data?.profiles    || []
  const pagination  = data?.pagination  || {}
  const total       = pagination.total  ?? profiles.length
  const totalPages  = pagination.total_pages ?? 1

  /* ── Handlers ───────────────────────────────────────────────────────────── */
  const updateFilter = useCallback((key, value) => {
    setFilters(f => ({ ...f, [key]: value, page: key === 'page' ? value : 1 }))
  }, [])

  function submitSearch(e) {
    e?.preventDefault()
    updateFilter('search', searchInput.trim())
  }

  function clearFilters() {
    setFilters({
      search: '', category_id: '', city: '', country: '',
      profile_type: '', verified_only: false, sort: 'featured', page: 1,
    })
    setSearchInput('')
    setSearchParams({})
    setUseNearMe(false)
    geo.clear?.()
  }

  /* Keyboard shortcut: "/" focuses the search input */
  useEffect(() => {
    function handler(e) {
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  /* Close sheet on route change */
  useEffect(() => { setSheetOpen(false) }, [searchParams])

  /* ── Derived ─────────────────────────────────────────────────────────────── */
  const activeFilterCount = [
    filters.category_id, filters.city, filters.country,
    filters.profile_type, filters.verified_only ? 'v' : '',
    useNearMe && geo.lat != null ? 'n' : '',
  ].filter(Boolean).length

  const allActiveCount = activeFilterCount + (filters.search ? 1 : 0)

  const filterPanelProps = {
    filters, updateFilter, categories,
    geo, radiusKm, setRadiusKm,
    useNearMe, setUseNearMe,
    clearFilters, activeFilterCount,
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />

      <main className="flex-1" id="main-content">

        {/* ══════════════════════════════════════════════════════════════════
            § 1  DISCOVERY HEADER
            Compact. Focused. The search is the centrepiece.
        ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 pb-0">

            {/* Context label */}
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-1.5">
              Directory
            </p>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-ink tracking-tight mb-5">
              Find anyone across Ethiopia
            </h1>

            {/* ── Unified search bar ──────────────────────────────────── */}
            <form
              onSubmit={submitSearch}
              className="
                flex flex-col sm:flex-row
                bg-canvas border border-border rounded-xl overflow-hidden
                focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10
                transition-all duration-150
                mb-5
              "
              role="search"
              aria-label="Search the directory"
            >
              {/* Query */}
              <div className="flex items-center flex-1 gap-2.5 px-4 py-3 sm:py-0 sm:h-12">
                <Search size={15} className="text-ink-3 shrink-0" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Electrician, restaurant, lawyer, shop…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="
                    flex-1 bg-transparent text-[14px] text-ink
                    placeholder:text-ink-3 outline-none min-w-0
                  "
                  aria-label="Search query"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(''); updateFilter('search', '') }}
                    className="text-ink-3 hover:text-ink transition-colors shrink-0 focus-visible:outline-none"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px bg-border self-stretch my-2.5" aria-hidden="true" />
              <div className="sm:hidden h-px bg-border mx-4" aria-hidden="true" />

              {/* Location */}
              <div className="flex items-center gap-2.5 px-4 py-3 sm:py-0 sm:h-12 sm:w-44">
                <MapPin size={14} className="text-ink-3 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="City or area"
                  value={filters.city}
                  onChange={e => updateFilter('city', e.target.value)}
                  className="
                    flex-1 bg-transparent text-[14px] text-ink
                    placeholder:text-ink-3 outline-none min-w-0
                  "
                  aria-label="Location"
                />
              </div>

              {/* Submit */}
              <div className="p-1.5">
                <button
                  type="submit"
                  className="
                    h-9 sm:h-full px-5 rounded-lg
                    bg-brand text-white text-[13.5px] font-semibold
                    hover:bg-brand-hover active:scale-[0.98]
                    transition-all duration-150 w-full sm:w-auto
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
                  "
                >
                  Search
                </button>
              </div>
            </form>

            {/* ── Category quick-nav ──────────────────────────────────── */}
            {categories.filter(c => !c.isChild).length > 0 && (
              <div
                className="
                  flex items-center gap-1 overflow-x-auto pb-0
                  -mx-5 px-5 sm:-mx-8 sm:px-8
                "
                style={{ scrollbarWidth: 'none' }}
                role="navigation"
                aria-label="Filter by category"
              >
                <button
                  type="button"
                  onClick={() => updateFilter('category_id', '')}
                  className={`
                    flex items-center gap-1.5 px-3 py-2.5
                    text-[13px] font-medium whitespace-nowrap
                    border-b-2 transition-all duration-150 shrink-0
                    ${!filters.category_id
                      ? 'border-brand text-brand'
                      : 'border-transparent text-ink-2 hover:text-ink hover:border-border'
                    }
                  `}
                >
                  All
                </button>
                {categories.filter(c => !c.isChild).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateFilter('category_id', cat.id)}
                    className={`
                      flex items-center gap-1.5 px-3 py-2.5
                      text-[13px] font-medium whitespace-nowrap
                      border-b-2 transition-all duration-150 shrink-0
                      ${filters.category_id === cat.id
                        ? 'border-brand text-brand'
                        : 'border-transparent text-ink-2 hover:text-ink hover:border-border'
                      }
                    `}
                    aria-pressed={filters.category_id === cat.id}
                  >
                    <CategoryIconInline slug={cat.slug} name={cat.name} size={13} />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            § 2  RESULTS AREA
        ════════════════════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
          <div className="flex gap-7">

            {/* ── Desktop filter sidebar ──────────────────────────────── */}
            <aside
              className="hidden lg:block w-52 shrink-0"
              aria-label="Filters"
            >
              <div className="sticky top-[76px]">
                {/* Sidebar header */}
                <div className="flex items-center justify-between mb-1 pb-3 border-b border-border">
                  <span className="text-[13px] font-semibold text-ink">Filters</span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[12px] text-danger hover:underline transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <FilterPanel {...filterPanelProps} />
              </div>
            </aside>

            {/* ── Results column ─────────────────────────────────────── */}
            <div className="flex-1 min-w-0">

              {/* ── Results toolbar ──────────────────────────────────── */}
              <div className="flex items-center justify-between gap-4 mb-4">

                {/* Left: count + active chips */}
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-[13px] text-ink-2 whitespace-nowrap shrink-0">
                      {isLoading ? (
                        <span className="text-ink-3">Searching…</span>
                      ) : (
                        <>
                          <span className="text-[15px] font-bold text-ink">
                            {total.toLocaleString()}
                          </span>
                          {' '}
                          <span>
                            {total === 1 ? 'result' : 'results'}
                          </span>
                          {filters.city && (
                            <span className="text-ink-3"> in {filters.city}</span>
                          )}
                        </>
                      )}
                    </p>

                    {/* Active chips — desktop (inline with count) */}
                    <div className="hidden sm:block min-w-0">
                      <ActiveFilterChips
                        filters={filters}
                        categories={categories}
                        useNearMe={useNearMe}
                        updateFilter={updateFilter}
                        setUseNearMe={setUseNearMe}
                        geo={geo}
                        clearFilters={clearFilters}
                      />
                    </div>
                  </div>

                  {/* Active chips — mobile (below count) */}
                  <div className="sm:hidden">
                    <ActiveFilterChips
                      filters={filters}
                      categories={categories}
                      useNearMe={useNearMe}
                      updateFilter={updateFilter}
                      setUseNearMe={setUseNearMe}
                      geo={geo}
                      clearFilters={clearFilters}
                    />
                  </div>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Sort — desktop */}
                  <div className="relative hidden sm:block">
                    <select
                      value={filters.sort}
                      onChange={e => updateFilter('sort', e.target.value)}
                      className="
                        h-8 pl-3 pr-7 bg-surface border border-border rounded-lg
                        text-[12.5px] text-ink-2 outline-none
                        focus:border-brand
                        appearance-none cursor-pointer
                        transition-colors duration-150
                      "
                      aria-label="Sort results"
                    >
                      {SORT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={11}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>

                  {/* View toggle — desktop */}
                  <div
                    className="hidden sm:flex items-center bg-surface border border-border rounded-lg overflow-hidden"
                    role="group"
                    aria-label="View mode"
                  >
                    {[
                      { mode: 'grid', icon: <LayoutGrid size={13} />, label: 'Grid view' },
                      { mode: 'list', icon: <List       size={13} />, label: 'List view' },
                    ].map(({ mode, icon, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        aria-pressed={viewMode === mode}
                        aria-label={label}
                        className={`
                          h-8 w-8 flex items-center justify-center
                          transition-colors duration-150
                          ${viewMode === mode
                            ? 'bg-brand text-white'
                            : 'text-ink-3 hover:bg-surface-2 hover:text-ink'
                          }
                        `}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>

                  {/* Map link — desktop */}
                  <Link
                    to="/directory/map"
                    className="
                      hidden sm:inline-flex items-center gap-1.5 h-8 px-3
                      border border-border rounded-lg
                      text-[12.5px] font-medium text-ink-2
                      hover:border-brand-border hover:text-brand hover:bg-brand-light/40
                      transition-all duration-150
                    "
                    aria-label="Switch to map view"
                  >
                    <Map size={13} />
                    Map
                  </Link>

                  {/* Mobile: Filters + Sort + Map */}
                  <div className="flex items-center gap-1.5 lg:hidden">
                    {/* Filters button */}
                    <button
                      type="button"
                      onClick={() => setSheetOpen(true)}
                      className="
                        inline-flex items-center gap-1.5
                        h-8 px-3 rounded-lg border border-border
                        text-[12.5px] font-medium text-ink-2
                        hover:border-brand-border hover:text-ink
                        transition-all duration-150
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                      "
                      aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
                    >
                      <SlidersHorizontal size={13} />
                      Filters
                      {activeFilterCount > 0 && (
                        <span
                          className="
                            bg-brand text-white text-[10px] font-bold
                            w-4 h-4 rounded-full flex items-center justify-center shrink-0
                          "
                          aria-label={`${activeFilterCount} active filters`}
                        >
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    {/* Map — mobile */}
                    <Link
                      to="/directory/map"
                      className="
                        h-8 w-8 flex items-center justify-center
                        border border-border rounded-lg
                        text-ink-2 hover:border-brand-border hover:text-brand
                        transition-all duration-150
                      "
                      aria-label="Map view"
                    >
                      <Map size={13} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Results ──────────────────────────────────────────── */}
              {isLoading ? (
                /* Skeleton grid — mirrors real layout */
                viewMode === 'list' ? (
                  <div className="flex flex-col gap-2.5">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SkeletonListCard key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                )
              ) : profiles.length === 0 ? (
                <EmptyState
                  filters={filters}
                  categories={categories}
                  clearFilters={clearFilters}
                  updateFilter={updateFilter}
                />
              ) : viewMode === 'list' ? (
                <div className="flex flex-col gap-2.5" role="list" aria-label="Search results">
                  {profiles.map(profile => (
                    <div key={profile.id} role="listitem">
                      <ProfileListCard profile={profile} />
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                  role="list"
                  aria-label="Search results"
                >
                  {profiles.map(profile => (
                    <div key={profile.id} role="listitem">
                      <ProfileCard profile={profile} />
                    </div>
                  ))}
                </div>
              )}

              {/* ── Pagination ───────────────────────────────────────── */}
              <Pagination
                page={filters.page}
                totalPages={totalPages}
                onPageChange={p => updateFilter('page', p)}
              />

              {/* ── Map discovery nudge ──────────────────────────────── */}
              {!isLoading && profiles.length > 0 && (
                <div className="mt-10 flex items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                      <Map size={15} className="text-brand" aria-hidden="true" />
                    </div>
                    <p className="text-[13px] text-ink-2">
                      <span className="font-semibold text-ink">See results on a map.</span>
                      {' '}Explore by location and find who's near you.
                    </p>
                  </div>
                  <Link
                    to="/directory/map"
                    className="
                      shrink-0 inline-flex items-center gap-1
                      text-[13px] font-semibold text-brand
                      hover:text-brand-hover transition-colors duration-150
                      whitespace-nowrap
                    "
                  >
                    Open map <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ══════════════════════════════════════════════════════════════════════
          § 3  MOBILE FILTER SHEET
          Full-height bottom-anchored panel. Sticky header + apply button.
          Backdrop closes on click.
      ══════════════════════════════════════════════════════════════════════ */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40 animate-fade-in"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            className="
              fixed inset-x-0 bottom-0 z-50
              bg-surface rounded-t-2xl shadow-2xl
              flex flex-col
              max-h-[90dvh]
              animate-fade-up
            "
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-[16px] font-semibold text-ink">
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-[12px] font-bold text-brand">
                    ({activeFilterCount} active)
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { clearFilters(); setSheetOpen(false) }}
                    className="text-[13px] text-danger hover:underline"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="
                    w-8 h-8 flex items-center justify-center rounded-lg
                    text-ink-2 hover:bg-surface-2 hover:text-ink
                    transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                  "
                  aria-label="Close filters"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sort row — mobile only */}
            <div className="px-5 py-3 border-b border-border shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-2">
                Sort by
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => updateFilter('sort', o.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-[12.5px] font-medium border
                      transition-all duration-150
                      ${filters.sort === o.value
                        ? 'bg-brand text-white border-brand'
                        : 'bg-canvas text-ink-2 border-border hover:border-brand-border'
                      }
                    `}
                    aria-pressed={filters.sort === o.value}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable filter body */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <FilterPanel {...filterPanelProps} />
            </div>

            {/* Sticky apply button */}
            <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 border-t border-border shrink-0">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => setSheetOpen(false)}
                className="rounded-xl font-semibold"
              >
                Show {isLoading ? '…' : `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
