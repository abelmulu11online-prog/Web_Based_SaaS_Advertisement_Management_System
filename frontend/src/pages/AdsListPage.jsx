/**
 * AdsListPage — public advertisement browsing and search page.
 * Route: /ads
 */
import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdvertisements, useCategories } from '../features/advertisements/hooks/useAdvertisements.js'
import { AdCard } from '../features/advertisements/components/AdCard.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input, Select } from '../components/ui/FormField.jsx'
import { Navbar } from '../components/layout/Navbar.jsx'

export default function AdsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  // Build query params from current state
  const queryParams = {
    ...(search ? { search } : {}),
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(minPrice ? { min_price: Number(minPrice) } : {}),
    ...(maxPrice ? { max_price: Number(maxPrice) } : {}),
    page,
    page_size: 20,
  }

  const { data, isLoading, isError } = useAdvertisements(queryParams)
  const { data: categories } = useCategories()

  const ads = data?.advertisements || []
  const pagination = data?.pagination || {}

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    const params = {}
    if (search) params.search = search
    if (categoryId) params.category_id = categoryId
    if (minPrice) params.min_price = minPrice
    if (maxPrice) params.max_price = maxPrice
    setSearchParams(params)
  }

  function handleClear() {
    setSearch('')
    setCategoryId('')
    setMinPrice('')
    setMaxPrice('')
    setPage(1)
    setSearchParams({})
  }

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'left' }}>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Browse Advertisements
          </h1>
          <p style={{ color: 'var(--text)', margin: 0 }}>
            Discover products, services, skills, jobs, and more from local advertisers.
          </p>
        </div>

        {/* Search & Filters */}
        <form
          onSubmit={handleSearch}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '32px',
            padding: '20px',
            background: 'var(--code-bg)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <Input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ gridColumn: 'span 2' }}
          />

          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {Array.isArray(categories) && categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
              </option>
            ))}
          </Select>

          <Input
            type="number"
            placeholder="Min price"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />

          <Input
            type="number"
            placeholder="Max price"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              Search
            </Button>
            <Button type="button" variant="secondary" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </form>

        {/* Results */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text)' }}>
            Loading advertisements…
          </div>
        )}

        {isError && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px',
              color: '#dc2626',
              background: '#fee2e2',
              borderRadius: '12px',
            }}
          >
            Failed to load advertisements. Please try again.
          </div>
        )}

        {!isLoading && !isError && ads.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: 'var(--text)',
              background: 'var(--code-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ margin: '0 0 8px' }}>No advertisements found</h3>
            <p style={{ margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        )}

        {!isLoading && ads.length > 0 && (
          <>
            <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text)', textAlign: 'left' }}>
              {pagination.total} result{pagination.total !== 1 ? 's' : ''}
              {search && ` for "${search}"`}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '32px',
              }}
            >
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.has_prev}
                  onClick={() => handlePageChange(page - 1)}
                >
                  ← Previous
                </Button>

                <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                  Page {pagination.page} of {pagination.total_pages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.has_next}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
