/**
 * AdsMapPage.jsx — Full-page map view of all published advertisements.
 *
 * Features:
 *  - Shows all published ads with coordinates as map markers.
 *  - "Use my location" button to centre the map on the user's GPS position.
 *  - Radius filter (5 / 10 / 25 / 50 / 100 km) to find nearby ads.
 *  - Clicking a marker shows title, image, price, and a link to the detail page.
 *  - Customer GPS is NEVER stored.
 *  - Responsive: full viewport height on desktop, 60vh on mobile.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, List } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { MapListingsView } from '../features/locations/components/MapListingsView.jsx'
import { RadiusSelector } from '../features/locations/components/RadiusSelector.jsx'
import { UserLocationButtonControlled } from '../features/locations/components/UserLocationButton.jsx'
import { useGeolocation } from '../features/locations/hooks/useGeolocation.js'
import { useMapPins } from '../features/locations/hooks/useMapPins.js'
import { findNearby } from '../features/locations/services/locationsService.js'

export default function AdsMapPage() {
  const { data: allPins = [], isLoading: pinsLoading } = useMapPins()

  const geo = useGeolocation()
  const [radiusKm, setRadiusKm]       = useState(10)
  const [nearbyPins, setNearbyPins]   = useState(null)  // null = not searching
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyError, setNearbyError]     = useState(null)

  // When user location changes or radius changes, fetch nearby ads
  useEffect(() => {
    if (geo.lat == null || geo.lng == null) return

    let cancelled = false
    setNearbyLoading(true)
    setNearbyError(null)

    findNearby(geo.lat, geo.lng, radiusKm)
      .then((results) => {
        if (!cancelled) setNearbyPins(results)
      })
      .catch(() => {
        if (!cancelled) setNearbyError('Failed to load nearby listings.')
      })
      .finally(() => {
        if (!cancelled) setNearbyLoading(false)
      })

    return () => { cancelled = true }
  }, [geo.lat, geo.lng, radiusKm])

  // Pins to show: nearby when user location is known, otherwise all
  const displayPins = nearbyPins ?? allPins
  const loading     = pinsLoading || nearbyLoading

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-surface border-b border-border px-4 py-2.5 flex flex-wrap items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2 shrink-0">
            <MapPin size={15} className="text-brand" />
            <span className="text-[14px] font-semibold text-ink">Map view</span>
            {!loading && (
              <span className="text-[12px] text-ink-3">
                · {displayPins.length} {displayPins.length === 1 ? 'listing' : 'listings'}
              </span>
            )}
          </div>

          {/* GPS + Radius */}
          <div className="flex items-center gap-3 flex-wrap ml-auto">
            <UserLocationButtonControlled
              loading={geo.loading}
              error={null}
              supported={geo.supported}
              onRequest={geo.getLocation}
              label={geo.lat != null ? 'Update location' : 'Near me'}
            />

            {geo.lat != null && (
              <RadiusSelector value={radiusKm} onChange={setRadiusKm} />
            )}
          </div>

          {/* Switch to list view */}
          <Link
            to="/ads"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-brand transition-colors shrink-0"
          >
            <List size={14} />
            List view
          </Link>
        </div>

        {/* GPS error */}
        {geo.error && (
          <div className="px-4 py-2 bg-danger-bg border-b border-red-200">
            <p className="text-[13px] text-danger">{geo.error}</p>
          </div>
        )}

        {/* Nearby error */}
        {nearbyError && (
          <div className="px-4 py-2 bg-danger-bg border-b border-red-200">
            <p className="text-[13px] text-danger">{nearbyError}</p>
          </div>
        )}

        {/* Map */}
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
