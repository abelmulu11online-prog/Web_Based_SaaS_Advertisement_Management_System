import { Wrench } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge.jsx'

const PRICING_LABELS = {
  FIXED: '', STARTING_FROM: 'From ', HOURLY: '/hr',
  NEGOTIABLE: ' (negotiable)', CONTACT_FOR_PRICE: '',
}

function formatPrice(price, pricingType, currency = 'ETB') {
  if (pricingType === 'CONTACT_FOR_PRICE' || !price) return 'Contact for price'
  const prefix = pricingType === 'STARTING_FROM' ? 'From ' : ''
  const suffix = pricingType === 'HOURLY' ? '/hr' : pricingType === 'NEGOTIABLE' ? ' (negotiable)' : ''
  return `${prefix}${parseFloat(price).toLocaleString()} ${currency}${suffix}`
}

export function ServiceCard({ service }) {
  const imgUrl = service.primary_image?.image_url

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-2 transition-colors">
      {imgUrl && (
        <div className="h-32 bg-surface-2 overflow-hidden">
          <img src={imgUrl} alt={service.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {!imgUrl && <Wrench size={16} className="text-ink-3 shrink-0 mt-0.5" />}
            <p className="text-[13.5px] font-semibold text-ink line-clamp-2">{service.title}</p>
          </div>
          {service.is_featured && <Badge variant="brand" size="xs">Featured</Badge>}
        </div>
        {service.description && (
          <p className="text-[12.5px] text-ink-2 line-clamp-2 mb-2">{service.description}</p>
        )}
        <p className="text-[13px] font-bold text-brand">
          {formatPrice(service.price_from, service.pricing_type, service.currency)}
        </p>
        {service.location && (
          <p className="text-[11px] text-ink-3 mt-1">{service.location}</p>
        )}
      </div>
    </div>
  )
}
