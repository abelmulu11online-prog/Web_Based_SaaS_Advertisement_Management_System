/**
 * ServiceCard.jsx — Editorial service entry.
 *
 * Two modes:
 *   default — full description, price, tags. Used on the Services tab.
 *   compact  — trimmed for Overview preview list.
 *
 * Layout: index number (muted) · title · description · price · meta
 * No generic icon boxes. No heavy card borders. The number creates rhythm.
 */
import { ArrowUpRight, MapPin } from 'lucide-react'

function formatPrice(price, pricingType, currency = 'ETB') {
  if (pricingType === 'CONTACT_FOR_PRICE' || !price) return 'Contact for price'
  const prefix = pricingType === 'STARTING_FROM' ? 'From ' : ''
  const suffix  = pricingType === 'HOURLY' ? '/hr' : pricingType === 'NEGOTIABLE' ? ' (negotiable)' : ''
  return `${prefix}${parseFloat(price).toLocaleString()} ${currency}${suffix}`
}

const AVAILABILITY_LABELS = {
  BY_APPOINTMENT: 'By appointment',
  UNAVAILABLE:    'Unavailable',
}

export function ServiceCard({ service, compact = false, index = null }) {
  const imgUrl = service.primary_image?.image_url
  const priceStr = formatPrice(service.price_from, service.pricing_type, service.currency)
  const isContactPrice = priceStr === 'Contact for price'

  return (
    <div
      className="
        group relative
        border-b border-border last:border-b-0
        py-5 first:pt-0
        transition-colors duration-150
      "
    >
      <div className="flex gap-4 items-start">

        {/* Index number — creates editorial rhythm */}
        {index !== null && (
          <span
            className="
              text-[13px] font-bold text-ink-4 tabular-nums
              w-6 shrink-0 mt-0.5 select-none
            "
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        {/* Image — only rendered when present */}
        {imgUrl && !compact && (
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-2">
            <img
              src={imgUrl}
              alt={service.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
              loading="lazy"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + arrow */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-[14.5px] font-semibold text-ink leading-snug">
              {service.title}
            </h3>
            <span
              className="
                text-ink-4 group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5
                transition-all duration-150 shrink-0 mt-0.5
              "
              aria-hidden="true"
            >
              <ArrowUpRight size={15} />
            </span>
          </div>

          {/* Description */}
          {service.description && (
            <p
              className={`
                text-[13px] text-ink-2 leading-relaxed
                ${compact ? 'line-clamp-2' : 'line-clamp-3'}
                mb-2
              `}
            >
              {service.description}
            </p>
          )}

          {/* Price + meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`
                text-[13.5px] font-bold
                ${isContactPrice ? 'text-ink-3' : 'text-brand'}
              `}
            >
              {priceStr}
            </span>

            {service.location && (
              <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
                <MapPin size={10} aria-hidden="true" />
                {service.location}
              </span>
            )}

            {service.availability && service.availability !== 'AVAILABLE' && (
              <span
                className={`
                  text-[11px] font-medium px-2 py-0.5 rounded-full
                  ${service.availability === 'BY_APPOINTMENT'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-600'
                  }
                `}
              >
                {AVAILABILITY_LABELS[service.availability] || service.availability}
              </span>
            )}
          </div>

          {/* Tags */}
          {!compact && service.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {service.tags.slice(0, 5).map(tag => (
                <span
                  key={tag}
                  className="text-[11px] bg-surface-2 text-ink-3 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
