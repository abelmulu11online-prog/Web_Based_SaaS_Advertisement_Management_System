import { MapPin } from 'lucide-react'

export function LocationDisplay({ latitude, longitude, address }) {
  const hasCoords = latitude != null && longitude != null
  if (!address && !hasCoords) return null

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* Map placeholder */}
      {hasCoords && (
        <div className="h-36 bg-surface-2 border-b border-border flex flex-col items-center justify-center gap-2">
          <MapPin size={24} className="text-ink-3" />
          <p className="text-[12px] text-ink-3">Map coming soon</p>
          <code className="text-[11px] bg-surface px-2 py-0.5 rounded border border-border text-ink-2">
            {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
          </code>
        </div>
      )}
      {address && (
        <div className="flex items-start gap-2.5 px-4 py-3">
          <MapPin size={14} className="text-brand mt-0.5 shrink-0" />
          <p className="text-[13.5px] text-ink leading-snug">{address}</p>
        </div>
      )}
    </div>
  )
}
