/**
 * ProfileLocationMap.jsx — Static mini-map for displaying a profile's location.
 * Non-interactive — just shows the pin. Directions open in Google Maps.
 */
import '../../locations/components/LeafletInit.js'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export function ProfileLocationMap({ lat, lng }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: '176px' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
        dragging={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  )
}
