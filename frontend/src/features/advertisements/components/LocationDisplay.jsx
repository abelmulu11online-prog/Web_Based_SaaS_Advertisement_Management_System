/**
 * LocationDisplay.jsx — Shows an advertisement's location on a Leaflet map.
 *
 * Replaces the Phase 5 "Map coming soon" placeholder with a real
 * OpenStreetMap embed using React Leaflet.
 *
 * Props:
 *   latitude   {number|string|null}
 *   longitude  {number|string|null}
 *   address    {string|null}
 *   title      {string|null}   Optional: shown in the marker popup
 *   height     {string}        CSS height for the map tile (default '200px')
 */
import { MapPin } from 'lucide-react'
import { AdvertisementMap } from '../../locations/components/AdvertisementMap.jsx'

export function LocationDisplay({ latitude, longitude, address, title, height = '200px' }) {
  const lat = latitude  != null ? parseFloat(latitude)  : null
  const lng = longitude != null ? parseFloat(longitude) : null
  const hasCoords = lat != null && !isNaN(lat) && lng != null && !isNaN(lng)

  if (!address && !hasCoords) return null

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* Real Leaflet map when coordinates exist */}
      {hasCoords && (
        <AdvertisementMap
          latitude={lat}
          longitude={lng}
          address={address}
          title={title}
          height={height}
          className="rounded-none border-0 border-b border-border"
        />
      )}

      {/* Human-readable address */}
      {address && (
        <div className="flex items-start gap-2.5 px-4 py-3">
          <MapPin size={14} className="text-brand mt-0.5 shrink-0" />
          <p className="text-[13.5px] text-ink leading-snug">{address}</p>
        </div>
      )}

      {/* Show raw coords only when there is no address */}
      {hasCoords && !address && (
        <div className="flex items-start gap-2.5 px-4 py-3">
          <MapPin size={14} className="text-brand mt-0.5 shrink-0" />
          <code className="text-[12px] text-ink-2">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </code>
        </div>
      )}
    </div>
  )
}
