/**
 * ServiceCard.jsx — Editorial service entry.
 * i18n: English / አማርኛ via react-i18next
 */
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ServiceCard({ service, compact = false, index = null }) {
  const { t } = useTranslation()

  function formatPrice(price, pricingType, currency = 'ETB') {
    if (pricingType === 'CONTACT_FOR_PRICE' || !price) {
      return t('profile.services.contactForPrice')
    }
    const prefix = pricingType === 'STARTING_FROM' ? t('profile.services.from')        : ''
    const suffix  = pricingType === 'HOURLY'        ? t('profile.services.perHour')     :
                    pricingType === 'NEGOTIABLE'     ? t('profile.services.negotiable')  : ''
    return `${prefix}${parseFloat(price).toLocaleString()} ${currency}${suffix}`
  }

  const imgUrl       = service.primary_image?.image_url
  const priceStr     = formatPrice(service.price_from, service.pricing_type, service.currency)
  const isContactPrice = service.pricing_type === 'CONTACT_FOR_PRICE' || !service.price_from

  // Availability label (only shown when not AVAILABLE)
  const availLabel = service.availability && service.availability !== 'AVAILABLE'
    ? t(`profile.services.availability.${service.availability}`, { defaultValue: service.availability })
    : null

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

        {/* Index number */}
        {index !== null && (
          <span
            className="text-[13px] font-bold text-ink-4 tabular-nums w-6 shrink-0 mt-0.5 select-none"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}

        {/* Image */}
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
              className="text-ink-4 group-hover:text-brand group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <ArrowUpRight size={15} />
            </span>
          </div>

          {/* Description */}
          {service.description && (
            <p className={`text-[13px] text-ink-2 leading-relaxed ${compact ? 'line-clamp-2' : 'line-clamp-3'} mb-2`}>
              {service.description}
            </p>
          )}

          {/* Price + meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[13.5px] font-bold ${isContactPrice ? 'text-ink-3' : 'text-brand'}`}>
              {priceStr}
            </span>

            {service.location && (
              <span className="flex items-center gap-1 text-[11.5px] text-ink-3">
                <MapPin size={10} aria-hidden="true" />
                {service.location}
              </span>
            )}

            {availLabel && (
              <span
                className={`
                  text-[11px] font-medium px-2 py-0.5 rounded-full
                  ${service.availability === 'BY_APPOINTMENT'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-600'
                  }
                `}
              >
                {availLabel}
              </span>
            )}
          </div>

          {/* Tags */}
          {!compact && service.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {service.tags.slice(0, 5).map(tag => (
                <span key={tag} className="text-[11px] bg-surface-2 text-ink-3 px-2 py-0.5 rounded-full">
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
