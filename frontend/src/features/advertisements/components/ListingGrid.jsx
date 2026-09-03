import { ListingCard } from './ListingCard.jsx'
import { SkeletonCard } from '../../../components/ui/Skeleton.jsx'

export function ListingGrid({ ads, loading, cols = 4 }) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[cols] || 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'

  if (loading) {
    return (
      <div className={`grid ${gridCols} gap-4`}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!ads?.length) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold text-ink mb-2">No listings found</h3>
        <p className="text-sm text-ink-2">Try adjusting your filters or search term.</p>
      </div>
    )
  }

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {ads.map(ad => <ListingCard key={ad.id} ad={ad} />)}
    </div>
  )
}
