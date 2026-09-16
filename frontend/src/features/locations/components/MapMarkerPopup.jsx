/**
 * MapMarkerPopup.jsx — Leaflet Popup content for an advertisement marker.
 *
 * Shows: title, image thumbnail, price, address, link to detail page.
 *
 * Props:
 *   ad  {object} — advertisement map pin data
 *         { id, title, latitude, longitude, address, price, price_type, primary_image_url }
 */
import { Link } from 'react-router-dom'
import { MapPin, ExternalLink } from 'lucide-react'

function formatPrice(price, priceType) {
  if (priceType === 'FREE') return 'Free'
  if (priceType === 'CONTACT_FOR_PRICE') return 'Contact for price'
  if (price != null) return `ETB ${Number(price).toLocaleString()}`
  return null
}

export function MapMarkerPopup({ ad }) {
  const priceLabel = formatPrice(ad.price, ad.price_type)

  return (
    <div className="w-52 text-left font-sans">
      {/* Image */}
      {ad.primary_image_url ? (
        <div className="h-28 -mx-[12px] -mt-[13px] mb-2.5 overflow-hidden rounded-t-lg">
          <img
            src={ad.primary_image_url}
            alt={ad.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="h-20 -mx-[12px] -mt-[13px] mb-2.5 bg-surface-2 rounded-t-lg flex items-center justify-center">
          <MapPin size={20} className="text-ink-3" />
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] font-semibold text-ink leading-snug mb-1 line-clamp-2">
        {ad.title}
      </p>

      {/* Price */}
      {priceLabel && (
        <p className="text-[13px] font-bold text-brand mb-1">{priceLabel}</p>
      )}

      {/* Address */}
      {ad.address && (
        <div className="flex items-start gap-1 mb-2.5">
          <MapPin size={11} className="text-ink-3 mt-0.5 shrink-0" />
          <p className="text-[11px] text-ink-2 leading-snug line-clamp-2">{ad.address}</p>
        </div>
      )}

      {/* Distance (when available) */}
      {ad.distance_km != null && (
        <p className="text-[11px] text-ink-3 mb-2">
          {ad.distance_km < 1
            ? `${Math.round(ad.distance_km * 1000)} m away`
            : `${ad.distance_km.toFixed(1)} km away`}
        </p>
      )}

      {/* Link */}
      <Link
        to={`/ads/${ad.id}`}
        className="inline-flex items-center gap-1 text-[12px] text-brand font-medium hover:underline"
      >
        View listing <ExternalLink size={11} />
      </Link>
    </div>
  )
}
