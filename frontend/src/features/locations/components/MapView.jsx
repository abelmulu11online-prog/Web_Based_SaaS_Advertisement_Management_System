/**
 * MapView.jsx — Base Leaflet map wrapper.
 *
 * Renders an OpenStreetMap tile layer via React Leaflet.
 * All other map components (markers, popups) are composed as children.
 *
 * Props:
 *   center    {[lat, lng]}  Map centre (default: Addis Ababa)
 *   zoom      {number}      Initial zoom level (default: 13)
 *   height    {string}      CSS height (default: '400px')
 *   className {string}      Extra Tailwind classes
 *   children  {ReactNode}   Markers, popups, etc.
 */
import './LeafletInit.js'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Default centre: Addis Ababa, Ethiopia
const DEFAULT_CENTER = [9.0054, 38.7636]
const DEFAULT_ZOOM = 13

export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  height = '400px',
  className = '',
  children,
  ...rest
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden border border-border ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        {...rest}
      >
        {/* OpenStreetMap tiles — free, no API key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {children}
      </MapContainer>
    </div>
  )
}
