import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Heart, Clock } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge.jsx'

function formatPrice(price, priceType) {
  if (priceType === 'FREE') return 'Free'
  if (priceType === 'CONTACT_FOR_PRICE') return 'Contact for price'
  if (priceType === 'NEGOTIABLE' && price) return `ETB ${Number(price).toLocaleString()} · Negotiable`
  if (price) return `ETB ${Number(price).toLocaleString()}`
  return null
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function ListingCard({ ad }) {
  const [imgError, setImgError] = useState(false)
  const primary = ad.images?.find(i => i.is_primary) || ad.images?.[0]
  const imgUrl = !imgError && primary?.image_url
  const price = formatPrice(ad.price, ad.price_type)

  return (
    <Link to={`/ads/${ad.id}`} className="block group hover:no-underline">
      <article className="bg-surface border border-border rounded-xl overflow-hidden transition-all duration-200 group-hover:border-border-2 group-hover:-translate-y-px group-hover:shadow-md h-full flex flex-col">

        {/* Image */}
        <div className="relative overflow-hidden bg-surface-2 shrink-0" style={{ aspectRatio: '4/3' }}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={ad.title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-border-2)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
            </div>
          )}

          {ad.category_name && (
            <div className="absolute top-2 left-2">
              <Badge variant="dark" size="xs">{ad.category_name}</Badge>
            </div>
          )}

          <button
            aria-label="Save"
            onClick={e => { e.preventDefault(); e.stopPropagation() }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full text-ink-3 hover:text-red-500 hover:bg-white transition-all duration-150 border border-border/40"
          >
            <Heart size={12} />
          </button>
        </div>

        {/* Info */}
        <div className="p-3.5 flex flex-col gap-1.5 flex-1">
          <h3 className="text-[13.5px] font-semibold text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors duration-150">
            {ad.title}
          </h3>

          {price && (
            <p className="text-[15px] font-bold text-ink tracking-tight">{price}</p>
          )}

          <div className="flex-1" />

          <div className="flex items-center justify-between gap-2 mt-1.5">
            {ad.address && (
              <span className="flex items-center gap-1 text-[11px] text-ink-2 min-w-0">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{ad.address}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-ink-3 shrink-0">
              <Clock size={10} />
              {timeAgo(ad.published_at || ad.created_at)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
