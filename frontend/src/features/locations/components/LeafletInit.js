/**
 * LeafletInit.js — Fix Leaflet's default marker icon paths when bundled with Vite.
 *
 * Leaflet 1.x expects to find its marker images relative to the JS file.
 * When bundled by Vite the asset paths break, so we replace the default icon
 * with explicit imports here. Import this module once, before any map renders.
 */
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Remove the built-in _getIconUrl that looks for files in the wrong place
delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})
