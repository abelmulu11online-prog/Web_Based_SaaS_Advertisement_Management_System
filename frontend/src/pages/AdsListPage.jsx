import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ChevronDown, MapPin, LayoutGrid, List, Map } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { ListingCard } from '../features/advertisements/components/ListingCard.jsx'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import { useAdvertisements, useCategories } from '../features/advertisements/hooks/useAdvertisements.js'
import { RadiusSelector } from '../features/locations/components/RadiusSelector.jsx'
import { UserLocationButtonControlled } from '../features/locations/components/UserLocationButton.jsx'
import { useGeolocation } from '../features/locations/hooks/useGeolocation.js'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

/** Flatten a category tree (root + children) into a single array for display. */
function flattenCategories(tree) {
  const result = []
  for (const cat of tree) {
    result.push(cat)
    if (Array.isArray(cat.children)) {
      for (const child of cat.children) result.push(child)
    }
  }
  return result
}

export default function AdsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid')

  const geo = useGeolocation()
  const [radiusKm, setRadiusKm] = useState(10)
  const [useNearMe, setUseNearMe] = useState(false)

  // category_id (UUID) is the canonical filter value.
  // We also support the legacy ?category=Name param coming from HomePage links
  // by resolving the name to an id once categories have loaded.
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',   // UUID — used for API call
    category_name_param: searchParams.get('category') || '', // legacy name param from URL
    location: searchParams.get('location') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    sort: 'newest',
    page: 1,
  })

  const { data: categoriesData } = useCategories()
  // Categories API returns a tree — flatten it for the sidebar list
  const categories = useMemo(() => {
    const tree = Array.isArray(categoriesData) ? categoriesData : []
    return flattenCategories(tree)
  }, [categoriesData])

  // Resolve legacy ?category=Name URL param to a UUID once categories load
  const resolvedCategoryId = useMemo(() => {
    if (filters.category_id) return filters.category_id
    if (!filters.category_name_param || !categories.length) return ''
    const match = categories.find(
      c => c.name.toLowerCase() === filters.category_name_param.toLowerCase() ||
           c.slug === filters.category_name_param.toLowerCase()
    )
    return match?.id || ''
  }, [filters.category_id, filters.category_name_param, categories])

  // Build API query params — always use category_id (UUID)
  const apiParams = {}
  if (filters.search)    apiParams.search      = filters.search
  if (resolvedCategoryId) apiParams.category_id = resolvedCategoryId
  if (filters.location)  apiParams.address     = filters.location
  if (filters.min_price) apiParams.min_price   = filters.min_price
  if (filters.max_price) apiParams.max_price   = filters.max_price
  apiParams.page      = filters.page
  apiParams.page_size = 24

  // Geo radius search
  if (useNearMe && geo.lat != null && geo.lng != null) {
    apiParams.lat       = geo.lat
    apiParams.lng       = geo.lng
    apiParams.radius_km = radiusKm
  }

  const { data: adsData, isLoading } = useAdvertisements(apiParams)
  const ads   = adsData?.advertisements || (Array.isArray(adsData) ? adsData : [])
  const total = adsData?.pagination?.total || ads.length

  function updateFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value, page: 1 }))
  }

  function selectCategory(cat) {
    // Store the UUID; clear the legacy name param
    setFilters(f => ({
      ...f,
      category_id: cat ? cat.id : '',
      category_name_param: '',
      page: 1,
    }))
  }

  function clearFilters() {
    setFilters({
      search: '', category_id: '', category_name_param: '',
      location: '', min_price: '', max_price: '', sort: 'newest', page: 1,
    })
    setSearchParams({})
    setUseNearMe(false)
    geo.clear()
  }

  // The "active" category id for sidebar highlight
  const activeCategoryId = resolvedCategoryId
  const activeFilterCount = [
    filters.category_id || filters.category_name_param,
    filters.location,
    filters.min_price,
    filters.max_price,
    useNearMe ? 'near' : '',
  ].filter(Boolean).length

  const FilterPanel = () => (
    <div className="flex flex-col gap-6">
      {/* Near me / radius search */}
      <div>
        <h3 className="text-[12px] font-semibold text-ink uppercase tracking-widest mb-3">Near me</h3>
        <div className="flex flex-col gap-2">
          <UserLocationButtonControlled
            loading={geo.loading}
            error={null}
            supported={geo.supported}
            onRequest={() => {
              geo.getLocation()
              setUseNearMe(true)
              setFilters(f => ({ ...f, page: 1 }))
            }}
            label={geo.lat != null ? 'Location set ✓' : 'Use my location'}
          />
          {geo.error && (
            <p className="text-[12px] text-danger leading-snug">{geo.error}</p>
          )}
          {geo.lat != null && (
            <>
              <RadiusSelector
                value={radiusKm}
                onChange={(km) => { setRadiusKm(km); setFilters(f => ({ ...f, page: 1 })) }}
              />
              <button
                onClick={() => { setUseNearMe(false); geo.clear(); setFilters(f => ({ ...f, page: 1 })) }}
                className="text-[12px] text-danger hover:underline text-left"
              >
                Clear location
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="text-[12px] font-semibold text-ink uppercase tracking-widest mb-3">Category</h3>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => selectCategory(null)}
            className={`text-left text-[13px] px-2.5 py-1.5 rounded transition-colors ${
              !activeCategoryId ? 'bg-brand-light text-brand font-medium' : 'text-ink-2 hover:bg-surface-2'
            }`}
          >
            All categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat)}
              className={`text-left text-[13px] px-2.5 py-1.5 rounded transition-colors ${
                cat.parent_id ? 'pl-5' : ''
              } ${
                activeCategoryId === cat.id
                  ? 'bg-brand-light text-brand font-medium'
                  : 'text-ink-2 hover:bg-surface-2'
              }`}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <h3 className="text-[12px] font-semibold text-ink uppercase tracking-widest mb-3">Location</h3>
        <div className="relative">
          <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input
            type="text"
            placeholder="City or area"
            value={filters.location}
            onChange={e => updateFilter('location', e.target.value)}
            className="w-full h-8 pl-7 pr-2.5 bg-canvas border border-border rounded text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-[12px] font-semibold text-ink uppercase tracking-widest mb-3">Price (ETB)</h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.min_price}
            onChange={e => updateFilter('min_price', e.target.value)}
            className="w-full h-8 px-2.5 bg-canvas border border-border rounded text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-brand transition-colors"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.max_price}
            onChange={e => updateFilter('max_price', e.target.value)}
            className="w-full h-8 px-2.5 bg-canvas border border-border rounded text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={clearFilters} className="text-[13px] text-danger hover:underline text-left">
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />

      <main className="flex-1">
        {/* Search bar row */}
        <div className="bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <form
              onSubmit={e => { e.preventDefault(); updateFilter('search', filters.search) }}
              className="flex-1 relative"
            >
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search listings…"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full h-9 pl-9 pr-3 bg-canvas border border-border rounded text-[13.5px] text-ink placeholder:text-ink-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
              />
            </form>

            {/* Sort */}
            <div className="relative hidden sm:block">
              <select
                value={filters.sort}
                onChange={e => updateFilter('sort', e.target.value)}
                className="h-9 pl-3 pr-7 bg-canvas border border-border rounded text-[13px] text-ink-2 outline-none focus:border-brand appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-border rounded overflow-hidden hidden sm:flex">
              {[['grid', <LayoutGrid size={14} />], ['list', <List size={14} />]].map(([mode, icon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`h-9 w-9 flex items-center justify-center transition-colors ${viewMode === mode ? 'bg-brand text-white' : 'bg-canvas text-ink-3 hover:bg-surface-2'}`}
                >
                  {icon}
                </button>
              ))}
            </div>

            {/* Map view link */}
            <Link
              to="/ads/map"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 border border-border rounded text-[13px] text-ink-2 hover:border-brand hover:text-brand transition-colors"
            >
              <Map size={14} />
              Map
            </Link>

            {/* Mobile filter toggle */}
            <Button
              variant="secondary" size="sm"
              icon={<SlidersHorizontal size={13} />}
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden"
            >
              Filters {activeFilterCount > 0 && <span className="ml-1 bg-brand text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <FilterPanel />
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-ink-2">
                {isLoading ? 'Loading…' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''} found`}
              </p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-[13px] text-danger hover:underline flex items-center gap-1">
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>

            {isLoading ? (
              <div className={`grid ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'} gap-4`}>
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">🔍</p>
                <h3 className="text-lg font-semibold text-ink mb-2">No listings found</h3>
                <p className="text-sm text-ink-2 mb-6">Try adjusting your search or filters.</p>
                <Button variant="secondary" onClick={clearFilters}>Clear all filters</Button>
              </div>
            ) : (
              <div className={`grid ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'} gap-4`}>
                {ads.map(ad => <ListingCard key={ad.id} ad={ad} />)}
              </div>
            )}

            {/* Pagination */}
            {adsData?.pagination && adsData.pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="secondary" size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                >
                  Previous
                </Button>
                <span className="text-[13px] text-ink-2 px-3">
                  Page {filters.page} of {adsData.pagination.total_pages}
                </span>
                <Button
                  variant="secondary" size="sm"
                  disabled={filters.page >= adsData.pagination.total_pages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="w-72 bg-surface h-full overflow-y-auto p-5 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-ink">Filters</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-ink-3 hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <FilterPanel />
            <Button variant="primary" fullWidth className="mt-6" onClick={() => setDrawerOpen(false)}>
              Apply filters
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
