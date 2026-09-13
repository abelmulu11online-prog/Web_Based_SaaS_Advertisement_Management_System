/**
 * DirectoryMapPage — repurposed AdsMapPage to show profile locations.
 * Shows published profiles with coordinates as map markers.
 * Users can filter by category, city, or radius from their location.
 */
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, List, Search, SlidersHorizontal, X } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { MapListingsView } from '../features/locations/components/MapListingsView.jsx'
import { RadiusSelector } from '../features/locations/components/RadiusSelector.jsx'
import { UserLocationButtonControlled } from '../features/locations/components/UserLocationButton.jsx'
import { useGeolocation } from '../features/locations/hooks/useGeolocation.js'
import { useMapPins } from '../features/locations/hooks/useMapPins.js'
import { findNearby } from '../features/locations/services/locationsService.js'
import { useCategories } from '../features/profiles/hooks/useCategories.js'

export default function DirectoryMapPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '')

  const mapParams = {}
  if (search) mapParams.search = search
  if (categoryId) mapParams.category_id = categoryId

  const { data: allPins = [], isLoading: pinsLoading } = useMapPins(mapParams)
  const { data: categoriesData } = useCategories()
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  const geo = useGeolocation()
  const [radiusKm, setRadiusKm]           = useState(10)
  const [nearbyPins, setNearbyPins]       = useState(null)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError]     = useState(null)
  const [filterOpen, setFilterOpen]       = useState(false)

  useEffect(() => {
    if (geo.lat == null || geo.lng == null) return
    let cancelled = false
    setNearbyLoading(true)
    setNearbyError(null)

    findNearby(geo.lat, geo.lng, radiusKm)
      .then(results => { if (!cancelled) setNearbyPins(results) })
      .catch(() => { if (!cancelled) setNearbyError('Failed to load nearby profiles.') })
      .finally(() => { if (!cancelled) setNearbyLoading(false) })

    return () => { cancelled = true }
  }, [geo.lat, geo.lng, radiusKm])

  const displayPins = nearbyPins ?? allPins
  const loading = pinsLoading || nearbyLoading

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />
      <main className="flex-1 flex flex-col" id="main-content">

        {/* Toolbar */}
        <div className="bg-surface border-b border-border px-4 py-2.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <MapPin size={15} className="text-brand" />
            <span className="text-[14px] font-semibold text-ink">Profile map</span>
            {!loading && (
              <span className="text-[12px] text-ink-3">
                · {displayPins.length} {displayPins.length === 1 ? 'profile' : 'profiles'}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search on map…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8 pl-7 pr-2 bg-canvas border border-border rounded-lg text-[13px] outline-none focus:border-brand"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="h-8 pl-2 pr-6 bg-canvas border border-border rounded-lg text-[13px] text-ink-2 outline-none focus:border-brand appearance-none cursor-pointer hidden sm:block"
          >
            <option value="">All categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* GPS + Radius */}
          <div className="flex items-center gap-2 ml-auto">
            <UserLocationButtonControlled
              loading={geo.loading}
              error={null}
              supported={geo.supported}
              onRequest={geo.getLocation}
              label={geo.lat != null ? 'Update location' : 'Near me'}
            />
            {geo.lat != null && <RadiusSelector value={radiusKm} onChange={setRadiusKm} />}
          </div>

          {/* Switch to list */}
          <Link
            to="/directory"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-brand transition-colors shrink-0"
          >
            <List size={14} />
            List view
          </Link>
        </div>

        {geo.error   && <div className="px-4 py-2 bg-danger-bg border-b border-red-200"><p className="text-[13px] text-danger">{geo.error}</p></div>}
        {nearbyError && <div className="px-4 py-2 bg-danger-bg border-b border-red-200"><p className="text-[13px] text-danger">{nearbyError}</p></div>}

        <div className="flex-1 p-0">
          <MapListingsView
            pins={displayPins}
            loading={loading}
            userLat={geo.lat}
            userLng={geo.lng}
            radiusKm={geo.lat != null ? radiusKm : null}
            height="calc(100vh - 115px)"
            className="rounded-none border-x-0 border-b-0"
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
