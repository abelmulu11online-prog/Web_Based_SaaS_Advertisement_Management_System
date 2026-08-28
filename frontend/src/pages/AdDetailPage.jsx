/**
 * AdDetailPage — full advertisement detail view.
 * Route: /ads/:id
 */
import { useParams, Link } from 'react-router-dom'
import { useAdvertisement } from '../features/advertisements/hooks/useAdvertisements.js'
import { ImageGallery } from '../features/advertisements/components/ImageGallery.jsx'
import { LocationDisplay } from '../features/advertisements/components/LocationDisplay.jsx'
import { Navbar } from '../components/layout/Navbar.jsx'
import { ROUTES } from '../constants/index.js'

const PRICE_TYPE_LABELS = {
  FIXED: 'Fixed price',
  NEGOTIABLE: 'Negotiable',
  CONTACT_FOR_PRICE: 'Contact for price',
  FREE: 'Free',
}

function formatDate(dateString) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function AdDetailPage() {
  const { id } = useParams()
  const { data: ad, isLoading, isError } = useAdvertisement(id)

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text)' }}>
          Loading advertisement…
        </div>
      </div>
    )
  }

  if (isError || !ad) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
          <h2>Advertisement not found</h2>
          <p style={{ color: 'var(--text)' }}>
            This advertisement may have been removed or is no longer available.
          </p>
          <Link
            to={ROUTES.ADVERTISEMENTS}
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            ← Back to listings
          </Link>
        </div>
      </div>
    )
  }

  const priceText =
    ad.price_type === 'FREE'
      ? 'Free'
      : ad.price_type === 'CONTACT_FOR_PRICE'
        ? 'Contact for price'
        : ad.price !== null && ad.price !== undefined
          ? `${Number(ad.price).toLocaleString()}${ad.price_type === 'NEGOTIABLE' ? ' (Negotiable)' : ''}`
          : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px', textAlign: 'left' }}>
          <Link to={ROUTES.ADVERTISEMENTS} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Advertisements
          </Link>
          {ad.category_name && (
            <>
              <span style={{ margin: '0 8px' }}>›</span>
              <span>{ad.category_name}</span>
            </>
          )}
          <span style={{ margin: '0 8px' }}>›</span>
          <span>{ad.title}</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Image gallery */}
            <ImageGallery images={ad.images || []} />

            {/* Description */}
            <section style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>About this listing</h2>
              <p
                style={{
                  color: 'var(--text)',
                  lineHeight: '1.7',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ad.description}
              </p>
            </section>

            {/* Location */}
            {(ad.address || ad.latitude) && (
              <section style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '18px', margin: '0 0 12px' }}>Location</h2>
                <LocationDisplay
                  latitude={ad.latitude}
                  longitude={ad.longitude}
                  address={ad.address}
                />
              </section>
            )}
          </div>

          {/* Right column — sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '80px' }}>
            {/* Main info card */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left',
              }}
            >
              {/* Category */}
              {ad.category_name && (
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                  }}
                >
                  {ad.category_icon && `${ad.category_icon} `}{ad.category_name}
                </div>
              )}

              <h1 style={{ fontSize: '20px', margin: '0 0 12px', lineHeight: 1.3 }}>
                {ad.title}
              </h1>

              {/* Price */}
              {priceText && (
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--text-h)',
                    marginBottom: '4px',
                  }}
                >
                  {priceText}
                </div>
              )}
              {ad.price_type && (
                <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '16px' }}>
                  {PRICE_TYPE_LABELS[ad.price_type]}
                </div>
              )}

              {/* Published date */}
              {ad.published_at && (
                <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px' }}>
                  Published {formatDate(ad.published_at)}
                </div>
              )}
            </div>

            {/* Contact card */}
            {(ad.advertiser?.phone || ad.advertiser?.email || ad.contact_phone || ad.contact_email) && (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'left',
                  background: 'var(--accent-bg)',
                  borderColor: 'var(--accent-border)',
                }}
              >
                <h3 style={{ margin: '0 0 12px', fontSize: '15px' }}>Contact Advertiser</h3>
                <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text)' }}>
                  Contact the advertiser directly to inquire about this listing. No purchases happen on this platform.
                </p>

                {(ad.contact_phone || ad.advertiser?.phone) && (
                  <a
                    href={`tel:${ad.contact_phone || ad.advertiser?.phone}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      color: 'var(--text-h)',
                      fontSize: '14px',
                      fontWeight: 500,
                      marginBottom: '8px',
                    }}
                  >
                    <span>📞</span>
                    {ad.contact_phone || ad.advertiser?.phone}
                  </a>
                )}

                {(ad.contact_email || ad.advertiser?.email) && (
                  <a
                    href={`mailto:${ad.contact_email || ad.advertiser?.email}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      color: 'var(--accent)',
                      fontSize: '14px',
                    }}
                  >
                    <span>✉️</span>
                    {ad.contact_email || ad.advertiser?.email}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
