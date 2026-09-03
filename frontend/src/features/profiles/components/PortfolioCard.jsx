import { ExternalLink, FolderOpen } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge.jsx'

export function PortfolioCard({ item }) {
  const imgUrl = item.primary_image?.image_url

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden hover:border-border-2 transition-colors">
      {imgUrl ? (
        <div className="aspect-video bg-surface-2 overflow-hidden">
          <img src={imgUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video bg-surface-2 flex items-center justify-center text-ink-3">
          <FolderOpen size={28} />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[13px] font-semibold text-ink line-clamp-2">{item.title}</p>
          {item.is_featured && <Badge variant="brand" size="xs">Featured</Badge>}
        </div>
        {item.description && (
          <p className="text-[12px] text-ink-2 line-clamp-2 mb-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <div>
            {item.client && <p className="text-[11px] text-ink-3">{item.client}</p>}
            {item.completion_date && (
              <p className="text-[11px] text-ink-3">{new Date(item.completion_date).getFullYear()}</p>
            )}
          </div>
          {item.project_url && (
            <a href={item.project_url} target="_blank" rel="noopener noreferrer"
              className="text-brand hover:no-underline">
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
