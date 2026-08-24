/**
 * AdCard — compact advertisement card for list/grid views.
 */
import { Link } from 'react-router-dom'

const PRICE_TYPE_LABELS = {
  FIXED: '',
  NEGOTIABLE: '(Negotiable)',
  CONTACT_FOR_PRICE: 'Price on request',
  FREE: 'Free',
}

export function AdCard({ ad }) {
  const image = ad.primary_image
  const priceLabel =
    ad.price_type === 'FREE'
      ? 'Free'
      : ad.price_type === 'CONTACT_FOR_PRICE'
        ? 'Contact for price'
        : ad.price !== null && ad.price !== undefined
          ? `${Number(ad.price).toLocaleString()}${PRICE_TYPE_LABELS[ad.price_type] ? ' ' + PRICE_TYPE_LABELS[ad.price_type] : ''}`
          : null

  return (
    <Link
      to={`/ads/${ad.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <article
        style={{
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--bg)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'none'
        }}
      >
        {/* Image */}
        <div
          style={{
            width: '100%',
            height: '180px',
            background: 'var(--code-bg)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {image ? (
            <img
              src={image.image_url}
              alt={image.alt_text || ad.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '40px', opacity: 0.4 }}>📷</span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '14px' }}>
          {ad.category_name && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}
            >
              {ad.category_icon && `${ad.category_icon} `}{ad.category_name}
            </div>
          )}

          <h3
            style={{
              margin: '0 0 6px',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-h)',
              lineHeight: '1.3',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ad.title}
          </h3>

          <p
            style={{
              margin: '0 0 10px',
              fontSize: '13px',
              color: 'var(--text)',
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ad.description}
          </p>

          {/* Price */}
          {priceLabel && (
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-h)', marginBottom: '8px' }}>
              {priceLabel}
            </div>
          )}

          {/* Location */}
          {ad.address && (
            <div style={{ fontSize: '12px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📍</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ad.address}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
