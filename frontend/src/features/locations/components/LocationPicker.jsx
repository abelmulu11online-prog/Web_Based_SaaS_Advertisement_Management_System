/**
 * LocationPicker.jsx — Interactive map for selecting advertisement location.
 *
 * Features:
 *  - Address search via Nominatim (LocationSearch component)
 *  - Click map to place / move marker
 *  - "Use my location" GPS button (one-shot, not tracked, not stored in DB)
 *  - Reverse geocode on GPS or map-click to suggest an address string
 *  - Draggable marker
 *  - Calls onChange({ latitude, longitude, address }) when location changes
 *
 * Props:
 *   latitude   {number|null}
 *   longitude  {number|null}
 *   address    {string}
 *   onChange   {({latitude, longitude, address}) => void}
 *   height     {string}   CSS height for the map (default '300px')
 */
import './LeafletInit.js'
import { useEffect, useRef, useCallback, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, X } from 'lucide-react'
import { LocationSearch } from './LocationSearch.jsx'
import { UserLocationButtonControlled } from './UserLocationButton.jsx'
import { useGeolocation } from '../hooks/useGeolocation.js'
import { reverseGeocode } from '../services/locationsService.js'

// Default centre when no coordinates are set: Addis Ababa
const DEFAULT_CENTER = [9.0054, 38.7636]
const DEFAULT_ZOOM   = 12

// ── Inner component: handles map clicks ──────────────────────────────────────

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ── Inner component: flies map to a new centre ───────────────────────────────

function MapFlyTo({ lat, lng, zoom = 15 }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], zoom, { animate: true, duration: 1 })
    }
  }, [lat, lng, zoom, map])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

export function LocationPicker({
  latitude,
  longitude,
  address = '',
  onChange,
  height = '300px',
}) {
  const hasCoords = latitude != null && longitude != null
  const [flyTarget, setFlyTarget] = useState(null)
  const [reverseLoading, setReverseLoading] = useState(false)
  const markerRef = useRef(null)

  const geo = useGeolocation()

  // ── Notify parent of changes ─────────────────────────────────────────────

  const notify = useCallback(
    (lat, lng, addr) => {
      onChange?.({ latitude: lat, longitude: lng, address: addr })
    },
    [onChange],
  )

  // ── Reverse geocode helper ────────────────────────────────────────────────

  async function fetchAddress(lat, lng) {
    setReverseLoading(true)
    try {
      const result = await reverseGeocode(lat, lng)
      return result.display_name || ''
    } catch {
      return ''
    } finally {
      setReverseLoading(false)
    }
  }

  // ── Handle map click ──────────────────────────────────────────────────────

  async function handleMapClick(lat, lng) {
    const addr = await fetchAddress(lat, lng)
    notify(lat, lng, addr || address)
  }

  // ── Handle marker drag end ────────────────────────────────────────────────

  async function handleDragEnd() {
    const marker = markerRef.current
    if (!marker) return
    const { lat, lng } = marker.getLatLng()
    const addr = await fetchAddress(lat, lng)
    notify(lat, lng, addr || address)
  }

  // ── Handle search result selection ────────────────────────────────────────

  function handleSearchSelect(result) {
    const lat = result.lat
    const lng = result.lon
    notify(lat, lng, result.display_name)
    setFlyTarget({ lat, lng })
  }

  // ── Handle GPS button ─────────────────────────────────────────────────────

  useEffect(() => {
    if (geo.lat != null && geo.lng != null) {
      ;(async () => {
        const addr = await fetchAddress(geo.lat, geo.lng)
        notify(geo.lat, geo.lng, addr || address)
        setFlyTarget({ lat: geo.lat, lng: geo.lng })
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.lat, geo.lng])

  // ── Clear location ────────────────────────────────────────────────────────

  function handleClear() {
    notify(null, null, '')
    geo.clear()
    setFlyTarget(null)
  }

  const mapCenter = hasCoords ? [latitude, longitude] : DEFAULT_CENTER

  return (
    <div className="flex flex-col gap-3">
      {/* Search + GPS controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <LocationSearch
            onSelect={handleSearchSelect}
            placeholder="Search for a city or address…"
          />
        </div>
        <UserLocationButtonControlled
          loading={geo.loading}
          error={null}
          supported={geo.supported}
          onRequest={geo.getLocation}
          label="My location"
        />
      </div>

      {/* GPS error */}
      {geo.error && (
        <p className="text-[12px] text-danger">{geo.error}</p>
      )}

      {/* Reverse geocode loading indicator */}
      {reverseLoading && (
        <p className="text-[12px] text-ink-3">Getting address…</p>
      )}

      {/* Map */}
      <div
        className="rounded-xl overflow-hidden border border-border"
        style={{ height }}
      >
        <MapContainer
          center={mapCenter}
          zoom={hasCoords ? 15 : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <ClickHandler onMapClick={handleMapClick} />

          {flyTarget && (
            <MapFlyTo lat={flyTarget.lat} lng={flyTarget.lng} />
          )}

          {hasCoords && (
            <Marker
              position={[latitude, longitude]}
              draggable={true}
              ref={markerRef}
              eventHandlers={{ dragend: handleDragEnd }}
            >
              <Popup>
                <div className="text-[12px] text-ink font-sans">
                  <p className="font-semibold mb-0.5">Selected location</p>
                  <p className="text-ink-2">{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</p>
                  {address && <p className="text-ink-2 mt-0.5 max-w-[180px] break-words">{address}</p>}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Hint */}
      <p className="text-[12px] text-ink-3">
        {hasCoords
          ? 'Drag the marker or click the map to adjust the location.'
          : 'Click on the map, search above, or use GPS to set the location.'}
      </p>

      {/* Selected coordinates + clear */}
      {hasCoords && (
        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
          <MapPin size={13} className="text-brand shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-ink truncate">
              {address || `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`}
            </p>
            <p className="text-[11px] text-ink-3">
              {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-ink-3 hover:text-danger transition-colors shrink-0"
            title="Clear location"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
