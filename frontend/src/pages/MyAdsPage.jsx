import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Pencil, Eye, PauseCircle, Archive, Trash2 } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import {
  useMyAdvertisements,
  usePublishAdvertisement,
  usePauseAdvertisement,
  useArchiveAdvertisement,
  useDeleteAdvertisement,
} from '../features/advertisements/hooks/useAdvertisements.js'

const STATUS_BADGE = {
  PUBLISHED: <Badge variant="success" dot>Published</Badge>,
  DRAFT:     <Badge variant="default" dot>Draft</Badge>,
  PAUSED:    <Badge variant="warning" dot>Paused</Badge>,
  EXPIRED:   <Badge variant="danger"  dot>Expired</Badge>,
  ARCHIVED:  <Badge variant="default" dot>Archived</Badge>,
}

const STATUS_FILTERS = ['All', 'PUBLISHED', 'DRAFT', 'PAUSED', 'ARCHIVED']

export default function MyAdsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('All')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const params = statusFilter !== 'All' ? { status: statusFilter, page_size: 50 } : { page_size: 50 }
  const { data: adsData, isLoading } = useMyAdvertisements(params)
  const ads = adsData?.advertisements || (Array.isArray(adsData) ? adsData : [])

  const publish  = usePublishAdvertisement()
  const pause    = usePauseAdvertisement()
  const archive  = useArchiveAdvertisement()
  const deleteAd = useDeleteAdvertisement()

  async function handleDelete(id) {
    await deleteAd.mutateAsync(id)
    setConfirmDeleteId(null)
  }

  return (
    <DashboardLayout title="My Listings">
      <div className="flex flex-col gap-5">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded text-[13px] font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s ? 'bg-brand text-white' : 'text-ink-2 hover:bg-surface-2'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate('/dashboard/advertisements/new')}>
            Post new ad
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-ink-2 text-sm mb-4">
              {statusFilter === 'All' ? "You haven't posted any listings yet." : `No ${statusFilter.toLowerCase()} listings.`}
            </p>
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate('/dashboard/advertisements/new')}>
              Post an ad
            </Button>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {['Title', 'Status', 'Category', 'Price', 'Actions'].map(h => (
                    <th key={h} className={`text-left text-[11px] font-semibold text-ink-3 uppercase tracking-widest px-4 py-2.5 ${h === 'Category' || h === 'Price' ? 'hidden md:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ads.map(ad => (
                  <tr key={ad.id} className="hover:bg-surface-2 transition-colors group">
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-[13.5px] font-medium text-ink line-clamp-1">{ad.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      {STATUS_BADGE[ad.status] || <Badge variant="default">{ad.status}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-2 hidden md:table-cell">
                      {ad.category_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-ink hidden md:table-cell">
                      {ad.price ? `ETB ${Number(ad.price).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {ad.status === 'PUBLISHED' && (
                          <Link to={`/ads/${ad.id}`} className="text-ink-3 hover:text-brand p-1 rounded transition-colors" title="View public listing">
                            <Eye size={14} />
                          </Link>
                        )}
                        <Link to={`/dashboard/advertisements/${ad.id}/edit`} className="text-ink-3 hover:text-brand p-1 rounded transition-colors" title="Edit">
                          <Pencil size={14} />
                        </Link>
                        {(ad.status === 'DRAFT' || ad.status === 'PAUSED') && (
                          <button onClick={() => publish.mutate(ad.id)} className="text-ink-3 hover:text-success p-1 rounded transition-colors" title="Publish">
                            <Eye size={14} />
                          </button>
                        )}
                        {ad.status === 'PUBLISHED' && (
                          <button onClick={() => pause.mutate(ad.id)} className="text-ink-3 hover:text-warning p-1 rounded transition-colors" title="Pause">
                            <PauseCircle size={14} />
                          </button>
                        )}
                        {ad.status !== 'ARCHIVED' && (
                          <button onClick={() => archive.mutate(ad.id)} className="text-ink-3 hover:text-ink-2 p-1 rounded transition-colors" title="Archive">
                            <Archive size={14} />
                          </button>
                        )}
                        {(ad.status === 'DRAFT' || ad.status === 'ARCHIVED') && (
                          <button onClick={() => setConfirmDeleteId(ad.id)} className="text-ink-3 hover:text-danger p-1 rounded transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-ink mb-2">Delete listing?</h3>
            <p className="text-[13px] text-ink-2 mb-5">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={deleteAd.isPending} onClick={() => handleDelete(confirmDeleteId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
