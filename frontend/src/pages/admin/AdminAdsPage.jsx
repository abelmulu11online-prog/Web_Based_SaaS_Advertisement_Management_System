/**
 * AdminAdsPage.jsx — Paginated advertisement moderation.
 * Supports search, status filter, category filter, status updates, and deletion.
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trash2, ChevronDown, MapPin, Image } from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import {
  AdminTable, SearchBar, FilterSelect, Pagination,
} from '../../features/admin/components/AdminTable.jsx'
import {
  useAdminAds, useAdminCategories,
  useSetAdStatus, useAdminDeleteAd,
} from '../../features/admin/hooks/useAdmin.js'

const STATUS_OPTS = [
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'PAUSED',    label: 'Paused' },
  { value: 'EXPIRED',   label: 'Expired' },
  { value: 'ARCHIVED',  label: 'Archived' },
]

const STATUS_BADGE = {
  PUBLISHED: <Badge variant="success" dot>Published</Badge>,
  DRAFT:     <Badge variant="default" dot>Draft</Badge>,
  PAUSED:    <Badge variant="warning" dot>Paused</Badge>,
  EXPIRED:   <Badge variant="danger"  dot>Expired</Badge>,
  ARCHIVED:  <Badge variant="default" dot>Archived</Badge>,
}

const NEXT_STATUSES = {
  PUBLISHED: ['PAUSED', 'ARCHIVED'],
  DRAFT:     ['PUBLISHED', 'ARCHIVED'],
  PAUSED:    ['PUBLISHED', 'ARCHIVED'],
  EXPIRED:   ['ARCHIVED'],
  ARCHIVED:  ['PUBLISHED'],
}

function StatusMenu({ ad, onSet, loading }) {
  const [open, setOpen] = useState(false)
  const options = NEXT_STATUSES[ad.status] || []

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading || options.length === 0}
        className="flex items-center gap-1 text-[12px] font-medium text-brand hover:underline disabled:opacity-40"
      >
        Change <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
            {options.map((s) => (
              <button
                key={s}
                onClick={() => { onSet(ad.id, s); setOpen(false) }}
                className="block w-full text-left px-3 py-1.5 text-[12.5px] text-ink hover:bg-surface-2"
              >
                → {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminAdsPage() {
  const [searchParams] = useSearchParams()
  const [search,  setSearch]  = useState(searchParams.get('search') || '')
  const [status,  setStatus]  = useState(searchParams.get('status') || '')
  const [catId,   setCatId]   = useState('')
  const [page,    setPage]    = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, status, catId])

  const params = {
    page,
    page_size: 20,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
    ...(catId  && { category_id: catId }),
  }

  const { data, isLoading, error } = useAdminAds(params)
  const { data: catsData }         = useAdminCategories()
  const setStatus2 = useSetAdStatus()
  const deleteAd   = useAdminDeleteAd()

  const ads        = data?.advertisements || []
  const pagination = data?.pagination     || null
  const categories = (catsData || []).filter(c => !c.parent_id)

  const catOpts = categories.map(c => ({ value: c.id, label: c.name }))
  const anyMutating = setStatus2.isPending || deleteAd.isPending

  const columns = [
    {
      key: 'title',
      label: 'Advertisement',
      render: (a) => (
        <div>
          <p className="font-medium text-ink text-[13px] line-clamp-1">{a.title}</p>
          <p className="text-[11px] text-ink-3">{a.user_email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (a) => STATUS_BADGE[a.status] || <Badge variant="default">{a.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
    },
    {
      key: 'category_name',
      label: 'Category',
      render: (a) => <span className="text-[12px] text-ink-2">{a.category_name || '—'}</span>,
      className: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
    },
    {
      key: 'meta',
      label: 'Details',
      render: (a) => (
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          {Number(a.image_count) > 0 && (
            <span className="flex items-center gap-0.5"><Image size={11} /> {a.image_count}</span>
          )}
          {a.address && (
            <span className="flex items-center gap-0.5 truncate max-w-[120px]">
              <MapPin size={11} /> {a.address}
            </span>
          )}
          {a.price != null && (
            <span>ETB {Number(a.price).toLocaleString()}</span>
          )}
        </div>
      ),
      className: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (a) => (
        <span className="text-[12px] text-ink-3">
          {new Date(a.created_at).toLocaleDateString()}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass: 'hidden xl:table-cell',
    },
    {
      key: 'actions',
      label: '',
      render: (a) => (
        <div className="flex items-center gap-3 justify-end">
          <StatusMenu
            ad={a}
            onSet={(id, s) => setStatus2.mutate({ adId: id, status: s })}
            loading={anyMutating}
          />
          <button
            onClick={() => setDeleteConfirm(a)}
            disabled={anyMutating}
            className="text-ink-3 hover:text-danger disabled:opacity-40 transition-colors"
            aria-label="Delete advertisement"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
      cellClass: 'text-right',
    },
  ]

  return (
    <AdminLayout title="Advertisements">
      <div className="flex flex-col gap-6">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search title or advertiser email…"
            className="w-full sm:w-72"
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={STATUS_OPTS}
            placeholder="All statuses"
          />
          <FilterSelect
            value={catId}
            onChange={setCatId}
            options={catOpts}
            placeholder="All categories"
          />
          {(search || status || catId) && (
            <button
              onClick={() => { setSearch(''); setStatus(''); setCatId('') }}
              className="text-[12px] text-ink-3 hover:text-danger"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Mutation error */}
        {(setStatus2.error || deleteAd.error) && (
          <div className="bg-danger-bg border border-red-200 rounded-lg px-4 py-2.5 text-[13px] text-danger">
            {(setStatus2.error || deleteAd.error)?.response?.data?.message || 'Action failed.'}
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-[15px] font-semibold text-ink mb-2">Delete advertisement?</h3>
              <p className="text-[13px] text-ink-2 mb-1">
                <strong className="text-ink">{deleteConfirm.title}</strong>
              </p>
              <p className="text-[12px] text-ink-3 mb-5">
                This permanently removes the ad and its images. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="h-8 px-4 text-[13px] text-ink-2 border border-border rounded hover:bg-surface-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteAd.mutate(deleteConfirm.id)
                    setDeleteConfirm(null)
                  }}
                  className="h-8 px-4 text-[13px] text-white bg-danger border border-danger rounded hover:opacity-90"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <AdminTable
          columns={columns}
          rows={ads}
          loading={isLoading}
          error={error}
          emptyMessage="No advertisements found matching your filters."
        />

        <Pagination pagination={pagination} onPage={setPage} />
      </div>
    </AdminLayout>
  )
}
