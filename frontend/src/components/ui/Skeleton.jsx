/**
 * Skeleton.jsx — Loading placeholder components.
 * Variants match the actual card structures to avoid layout shift.
 */

/** Base shimmer block — takes any className for size/shape */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

/** SkeletonText — stacked lines, last one shorter */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard — matches the ProfileCard grid layout.
 * Cover image → avatar overlap → name → headline → footer rule.
 */
export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Cover */}
      <Skeleton className="h-32 rounded-none" />

      <div className="px-4 pt-3 pb-4">
        {/* Avatar row (mirrors -mt-9 overlap) */}
        <div className="flex items-end justify-between mb-3 -mt-9">
          <Skeleton className="w-[52px] h-[52px] rounded-xl border-2 border-surface shrink-0" />
          <Skeleton className="h-3.5 w-16 rounded mb-1" />
        </div>

        {/* Name */}
        <Skeleton className="h-4 w-3/4 rounded mb-1.5" />
        {/* Headline — 2 lines */}
        <Skeleton className="h-3 w-full rounded mb-1" />
        <Skeleton className="h-3 w-4/5 rounded mb-3" />

        {/* Footer rule row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border gap-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  )
}

/**
 * SkeletonListCard — matches the ProfileListCard horizontal layout.
 * [avatar strip] [name + meta] [rating + city]
 */
export function SkeletonListCard() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex items-stretch">
      {/* Left avatar strip */}
      <Skeleton className="w-16 sm:w-20 shrink-0 rounded-none" style={{ minHeight: '72px' }} />

      {/* Center identity */}
      <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-2">
        <Skeleton className="h-4 w-2/5 rounded" />
        <Skeleton className="h-3 w-3/5 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>

      {/* Right meta */}
      <div className="shrink-0 flex flex-col items-end justify-center gap-2 px-4 py-3 border-l border-border">
        <Skeleton className="h-3.5 w-12 rounded" />
        <Skeleton className="h-3 w-14 rounded" />
      </div>
    </div>
  )
}
