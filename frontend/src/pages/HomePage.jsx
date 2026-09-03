import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, ArrowRight, Star, Shield, Zap } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Button } from '../components/ui/Button.jsx'
import { ListingGrid } from '../features/advertisements/components/ListingGrid.jsx'
import { useAdvertisements, useCategories } from '../features/advertisements/hooks/useAdvertisements.js'

const FEATURED_CITIES = [
  'Addis Ababa', 'Gondar', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Dire Dawa', 'Jimma', 'Adama',
]

const TRUST_ITEMS = [
  {
    icon: <Shield size={20} className="text-brand" />,
    title: 'Verified advertisers',
    desc: 'Profiles are reviewed to keep the platform trustworthy.',
  },
  {
    icon: <Zap size={20} className="text-brand" />,
    title: 'Fast publishing',
    desc: 'Your listing goes live in minutes after creation.',
  },
  {
    icon: <Star size={20} className="text-brand" />,
    title: 'Affordable plans',
    desc: 'Start for free. Upgrade when you need more reach.',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState('')

  const { data: adsData, isLoading } = useAdvertisements({ page_size: 8 })
  const ads = adsData?.advertisements || adsData || []

  // Load real categories from the database (tree — roots are enough for the nav bar)
  const { data: categoriesData } = useCategories()
  // Top-level categories only (parent_id === null) for the homepage category bar
  const topCategories = useMemo(() => {
    const tree = Array.isArray(categoriesData) ? categoriesData : []
    return tree.slice(0, 8) // show at most 8 in the nav bar
  }, [categoriesData])

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (location) params.set('location', location)
    if (activeCategoryId) params.set('category_id', activeCategoryId)
    navigate(`/ads?${params.toString()}`)
  }

  function handleCategoryClick(cat) {
    const newId = activeCategoryId === cat.id ? '' : cat.id
    setActiveCategoryId(newId)
    if (newId) {
      navigate(`/ads?category_id=${newId}`)
    } else {
      navigate('/ads')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-surface border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-ink tracking-tight leading-tight mb-4">
              Find what you need in<br className="hidden sm:block" />{' '}
              <span className="text-brand">Ethiopia's local marketplace</span>
            </h1>
            <p className="text-base sm:text-lg text-ink-2 mb-10 max-w-xl mx-auto leading-relaxed">
              Browse products, services, jobs, and businesses near you. Connect directly — no middleman.
            </p>

            {/* Search form */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-canvas border border-border-2 rounded text-sm text-ink placeholder:text-ink-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all duration-150"
                />
              </div>
              <div className="relative sm:w-48">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 bg-canvas border border-border-2 rounded text-sm text-ink placeholder:text-ink-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all duration-150"
                />
              </div>
              <Button type="submit" variant="primary" size="lg" icon={<Search size={15} />}>
                Search
              </Button>
            </form>

            {/* Popular cities */}
            <div className="flex items-center gap-2 flex-wrap justify-center mt-6">
              <span className="text-xs text-ink-3">Popular:</span>
              {FEATURED_CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => { setLocation(city); navigate(`/ads?location=${encodeURIComponent(city)}`) }}
                  className="text-xs text-ink-2 hover:text-brand underline underline-offset-2 transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Category nav ─────────────────────────────────────────────── */}
        <section className="border-b border-border bg-surface">
          <div className="max-w-7xl mx-auto px-4 py-1">
            <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
              {/* "All" button */}
              <button
                onClick={() => { setActiveCategoryId(''); navigate('/ads') }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-[13px] font-medium whitespace-nowrap transition-all duration-150 ${
                  activeCategoryId === ''
                    ? 'bg-brand text-white'
                    : 'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                All
              </button>
              {topCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-[13px] font-medium whitespace-nowrap transition-all duration-150 ${
                    activeCategoryId === cat.id
                      ? 'bg-brand text-white'
                      : 'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Recent listings ──────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-ink">Recent listings</h2>
              <p className="text-sm text-ink-2 mt-0.5">Browse the latest from across Ethiopia</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconRight={<ArrowRight size={14} />}
              onClick={() => navigate('/ads')}
            >
              View all
            </Button>
          </div>
          <ListingGrid ads={Array.isArray(ads) ? ads : []} loading={isLoading} cols={4} />
        </section>

        {/* ── Browse by category cards ──────────────────────────────────── */}
        {topCategories.length > 0 && (
          <section className="border-t border-border bg-surface">
            <div className="max-w-7xl mx-auto px-4 py-12">
              <h2 className="text-xl font-bold text-ink mb-1">Browse by category</h2>
              <p className="text-sm text-ink-2 mb-7">Find exactly what you're looking for</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {topCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => navigate(`/ads?category_id=${cat.id}`)}
                    className="flex flex-col items-center gap-3 p-5 bg-canvas border border-border rounded-xl hover:border-border-2 hover:shadow-sm transition-all duration-150 text-center group"
                  >
                    <div className="text-2xl group-hover:scale-110 transition-transform duration-150">
                      {cat.icon || '📋'}
                    </div>
                    <span className="text-[13px] font-medium text-ink">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Trust section ─────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TRUST_ITEMS.map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-start p-5 bg-surface border border-border rounded-xl">
                <div className="p-2.5 bg-brand-light rounded-lg shrink-0">{icon}</div>
                <div>
                  <h3 className="text-[14px] font-semibold text-ink mb-1">{title}</h3>
                  <p className="text-[13px] text-ink-2 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA banner ────────────────────────────────────────────────── */}
        <section className="bg-brand">
          <div className="max-w-3xl mx-auto px-4 py-14 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
              Ready to reach more customers?
            </h2>
            <p className="text-white/80 text-base mb-8">
              Join thousands of advertisers across Ethiopia. Start for free.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/register')}
              >
                Create free account
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-white border-white/30 hover:bg-white/10"
                onClick={() => navigate('/pricing')}
              >
                View pricing
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
