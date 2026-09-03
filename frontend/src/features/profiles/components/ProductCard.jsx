import { Badge } from '../../../components/ui/Badge.jsx'
import { ShoppingBag } from 'lucide-react'

const CONDITION_LABELS = { NEW: 'New', USED: 'Used', REFURBISHED: 'Refurbished' }
const AVAILABILITY_VARIANT = {
  IN_STOCK: 'success', OUT_OF_STOCK: 'danger', PRE_ORDER: 'warning', DISCONTINUED: 'default',
}
const AVAILABILITY_LABELS = {
  IN_STOCK: 'In Stock', OUT_OF_STOCK: 'Out of Stock', PRE_ORDER: 'Pre-Order', DISCONTINUED: 'Discontinued',
}

function formatPrice(price, priceType, currency = 'ETB') {
  if (priceType === 'FREE') return 'Free'
  if (priceType === 'CONTACT_FOR_PRICE' || !price) return 'Contact for price'
  if (priceType === 'NEGOTIABLE') return `${parseFloat(price).toLocaleString()} ${currency} (negotiable)`
  return `${parseFloat(price).toLocaleString()} ${currency}`
}

export function ProductCard({ product }) {
  const imgUrl = product.primary_image?.image_url

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-2 transition-colors">
      {/* Image */}
      <div className="aspect-square bg-surface-2 relative">
        {imgUrl ? (
          <img src={imgUrl} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-3">
            <ShoppingBag size={28} />
          </div>
        )}
        {product.is_featured && (
          <span className="absolute top-2 left-2">
            <Badge variant="brand" size="xs">Featured</Badge>
          </span>
        )}
        {product.availability && product.availability !== 'IN_STOCK' && (
          <span className="absolute top-2 right-2">
            <Badge variant={AVAILABILITY_VARIANT[product.availability]} size="xs">
              {AVAILABILITY_LABELS[product.availability]}
            </Badge>
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[13px] font-semibold text-ink line-clamp-2 mb-1">{product.title}</p>
        {product.brand && <p className="text-[11px] text-ink-3 mb-1">{product.brand}</p>}
        <p className="text-[13px] font-bold text-brand">
          {formatPrice(product.price, product.price_type, product.currency)}
        </p>
        {product.condition && (
          <p className="text-[11px] text-ink-3 mt-0.5">{CONDITION_LABELS[product.condition]}</p>
        )}
      </div>
    </div>
  )
}
