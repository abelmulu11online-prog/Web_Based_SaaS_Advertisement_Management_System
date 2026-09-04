/**
 * MapListingsView.jsx — Full map view showing published profile locations.
 */
import './LeafletInit.js'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MapProfilePopup } from './MapProfilePopup.jsx'
import { MapPin } from 'lucide-react'

function FlyToUser({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 13, { animate: true, duration: 1 })
    }
  }, [lat, lng, map])
  return null
}

const DEFAULT_CENTER = [9.0054, 38.7636]

export function MapListingsView({
  pins = [],
  loading = false,
  height = 'calc(100vh - 120px)',
  userLat = null,
  userLng = null,
  radiusKm = null,
  className = '',
}) {
  const center = userLat != null && userLng != null
    ? [userLat, userLng]
    : DEFAULT_CENTER

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-[500] bg-surface/70 flex items-center justify-center rounded-xl pointer-events-none">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2.5 shadow-sm">
            <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-ink">Loading map…</span>
          </div>
        </div>
      )}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          {userLat != null && userLng != null && <FlyToUser lat={userLat} lng={userLng} />}
          {userLat != null && userLng != null && radiusKm != null && (
            <Circle
              center={[userLat, userLng]}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.06, weight: 1.5 }}
            />
          )}
          {pins.map((pin) => (
            <Marker key={pin.id} position={[pin.latitude, pin.longitude]}>
              <Popup minWidth={200} maxWidth={220}>
                <MapProfilePopup profile={pin} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {!loading && (
        <div className="absolute bottom-3 left-3 z-[400] bg-surface/90 border border-border rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm pointer-events-none">
          <MapPin size={12} className="text-brand" />
          <span className="text-[12px] font-medium text-ink">
            {pins.length} {pins.length === 1 ? 'profile' : 'profiles'}
          </span>
        </div>
      )}
    </div>
  )
}
