/**
 * AdvertisementMap.jsx — Single-advertisement detail map.
 *
 * Renders a Leaflet map centred on the advertisement's location with
 * a single marker. Used on the AdDetailPage.
 *
 * Props:
 *   latitude   {number}
 *   longitude  {number}
 *   address    {string}
 *   title      {string}
 *   height     {string}  CSS height (default '260px')
 *   className  {string}
 */
import './LeafletInit.js'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'

export function AdvertisementMap({
  latitude,
  longitude,
  address,
  title,
  height = '260px',
  className = '',
}) {
  if (latitude == null || longitude == null) return null

  return (
    <div
      className={`rounded-xl overflow-hidden border border-border ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="font-sans text-[13px] text-ink max-w-[200px]">
              {title && <p className="font-semibold mb-1 leading-snug">{title}</p>}
              {address && (
                <div className="flex items-start gap-1">
                  <MapPin size={11} className="text-brand mt-0.5 shrink-0" />
                  <p className="text-[12px] text-ink-2 break-words">{address}</p>
                </div>
              )}
              <p className="text-[11px] text-ink-3 mt-1">
                {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
