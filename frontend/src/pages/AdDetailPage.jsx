import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapPin, Phone, Mail, Share2, Heart, ChevronLeft, ChevronRight, Clock, Tag, User, ExternalLink, ArrowLeft } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { SkeletonText } from '../components/ui/Skeleton.jsx'
import { ListingGrid } from '../features/advertisements/components/ListingGrid.jsx'
import { LocationDisplay } from '../features/advertisements/components/LocationDisplay.jsx'
import { useAdvertisement, useAdvertisements } from '../features/advertisements/hooks/useAdvertisements.js'

function formatPrice(price, priceType) {
  if (priceType === 'FREE') return 'Free'
  if (priceType === 'CONTACT_FOR_PRICE') return 'Contact for price'
  if (priceType === 'NEGOTIABLE' && price) return `ETB ${Number(price).toLocaleString()} · Negotiable`
  if (price) return `ETB ${Number(price).toLocaleString()}`
  return 'Price on request'
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d} days ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AdDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [imgIdx, setImgIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  const { data: ad, isLoading, isError } = useAdvertisement(id)
  const { data: similarData } = useAdvertisements({ page_size: 4 })
  const similar = (similarData?.advertisements || []).filter(a => a.id !== id).slice(0, 4)

  const images = ad?.images || []
  const sortedImages = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (isError) return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />
      <div className="flex-1 flex items-center justify-center flex-col gap-4 p-8 text-center">
        <p className="text-5xl">�</p>
        <h2 className="text-xl font-bold text-ink">Listing not found</h2>
        <p className="text-ink-2 text-sm">This listing may have been removed or expired.</p>
        <Button variant="secondary" onClick={() => navigate('/ads')} icon={<ArrowLeft size={14} />}>Back to listings</Button>
      </div>
      <Footer />
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-5 w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[13px] text-ink-3 mb-5" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-ink transition-colors hover:no-underline">Home</Link>
          <span>/</span>
          <Link to="/ads" className="hover:text-ink transition-colors hover:no-underline">Listings</Link>
          {ad?.category_name && (
            <>
              <span>/</span>
              <Link to={`/ads?category=${ad.category_name}`} className="hover:text-ink transition-colors hover:no-underline">{ad.category_name}</Link>
            </>
          )}
          {isLoading && <><span>/</span><div className="skeleton h-3 w-24 rounded" /></>}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Left column */}
          <div className="flex flex-col gap-6">

            {/* Image gallery */}
            <div>
              {isLoading ? (
                <div className="skeleton rounded-xl aspect-[4/3]" />
              ) : sortedImages.length > 0 ? (
                <div>
                  <div className="relative rounded-xl overflow-hidden bg-surface-2" style={{ aspectRatio: '4/3' }}>
                    <img
                      src={sortedImages[imgIdx]?.image_url}
                      alt={`${ad?.title} — image ${imgIdx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {sortedImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                          disabled={imgIdx === 0}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow disabled:opacity-30 hover:bg-white transition-all"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => setImgIdx(i => Math.min(sortedImages.length - 1, i + 1))}
                          disabled={imgIdx === sortedImages.length - 1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow disabled:opacity-30 hover:bg-white transition-all"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                          {imgIdx + 1}/{sortedImages.length}
                        </span>
                      </>
                    )}
                  </div>
                  {sortedImages.length > 1 && (
                    <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1">
                      {sortedImages.map((img, i) => (
                        <button
                          key={img.id}
                          onClick={() => setImgIdx(i)}
                          className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        >
                          <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-surface-2 border border-border flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-border-2)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-surface border border-border rounded-xl p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ink mb-4">Description</h2>
              {isLoading ? <SkeletonText lines={5} /> : (
                <p className="text-[14px] text-ink-2 leading-relaxed whitespace-pre-wrap">{ad?.description}</p>
              )}
            </div>

            {/* Details */}
            {!isLoading && ad && (
              <div className="bg-surface border border-border rounded-xl p-5 sm:p-6">
                <h2 className="text-base font-semibold text-ink mb-4">Details</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    ['Category', ad.category_name],
                    ['Price type', ad.price_type?.replace(/_/g, ' ')],
                    ['Status', ad.status],
                    ['Posted', timeAgo(ad.published_at || ad.created_at)],
                    ['ID', ad.id?.slice(0, 8) + '…'],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] text-ink-3 uppercase tracking-widest font-medium mb-0.5">{label}</dt>
                      <dd className="text-[13.5px] text-ink font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Location map */}
            {!isLoading && ad && (ad.latitude != null || ad.address) && (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <h2 className="text-base font-semibold text-ink">Location</h2>
                </div>
                <LocationDisplay
                  latitude={ad.latitude}
                  longitude={ad.longitude}
                  address={ad.address}
                  title={ad.title}
                  height="220px"
                />
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Price card */}
            <div className="bg-surface border border-border rounded-xl p-5">
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  <div className="skeleton h-6 w-3/5 rounded" />
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-4/5 rounded" />
                </div>
              ) : (
                <>
                  {ad?.category_name && <Badge variant="default" className="mb-3">{ad.category_name}</Badge>}
                  <h1 className="text-xl font-bold text-ink leading-snug mb-3">{ad?.title}</h1>

                  <div className="text-2xl font-bold text-ink tracking-tight mb-4">
                    {formatPrice(ad?.price, ad?.price_type)}
                  </div>

                  {ad?.address && (
                    <div className="flex items-center gap-1.5 text-[13px] text-ink-2 mb-4">
                      <MapPin size={13} className="text-ink-3 shrink-0" />
                      {ad.address}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-ink-3 mb-5">
                    <Clock size={11} />
                    Posted {timeAgo(ad?.published_at || ad?.created_at)}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {ad?.contact_phone && (
                      <a
                        href={`tel:${ad.contact_phone}`}
                        className="flex items-center justify-center gap-2 w-full h-10 bg-brand text-white rounded text-[14px] font-medium transition-colors hover:bg-brand-hover hover:no-underline"
                      >
                        <Phone size={14} />
                        Call advertiser
                      </a>
                    )}
                    {ad?.contact_email && (
                      <a
                        href={`mailto:${ad.contact_email}`}
                        className="flex items-center justify-center gap-2 w-full h-10 bg-canvas border border-border-2 text-ink rounded text-[14px] font-medium transition-colors hover:bg-surface-2 hover:no-underline"
                      >
                        <Mail size={14} />
                        Send email
                      </a>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleShare}
                        className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-border rounded text-[13px] text-ink-2 hover:bg-surface-2 transition-colors"
                      >
                        <Share2 size={13} />
                        {copied ? 'Copied!' : 'Share'}
                      </button>
                      <button className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-border rounded text-[13px] text-ink-2 hover:bg-surface-2 hover:text-red-500 transition-colors">
                        <Heart size={13} />
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Advertiser card */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-widest mb-3">Advertiser</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center">
                  <User size={16} className="text-ink-3" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">
                    {isLoading ? '—' : 'Member advertiser'}
                  </p>
                  <p className="text-[12px] text-ink-3">GebetaMarket member</p>
                </div>
              </div>
            </div>

            {/* Safety tip */}
            <div className="bg-warning-bg border border-yellow-200 rounded-xl p-4">
              <p className="text-[12px] text-warning leading-relaxed">
                <strong>Stay safe:</strong> Meet in a public place, verify before paying, and never send money in advance.
              </p>
            </div>
          </div>
        </div>

        {/* Similar listings */}
        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-ink mb-5">You might also like</h2>
            <ListingGrid ads={similar} loading={false} cols={4} />
          </section>
        )}
      </div>

      <Footer />
    </div>
  )
}
