/**
 * AdminAdsPage.jsx — Advertisement moderation.
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trash2, ChevronDown, MapPin, Image, MoreHorizontal } from 'lucide-react'
import { AdminLayout }   from '../../components/layout/AdminLayout.jsx'
import { Badge }         from '../../components/ui/Badge.jsx'
import {
  AdminTable, SearchBar, FilterSelect,
  Pagination, PageHeader, ConfirmDialog, StatCard,
} from '../../features/admin/components/AdminTable.jsx'
import {
  useAdminAds, useAdminCategories,
  useSetAdStatus, useAdminDeleteAd,
} from '../../features/admin/hooks/useAdmin.js'

/* ── Status config ─────────────────────────────────────────────────────── */
const STATUS_OPTS = [
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT',     label: 'Draft'     },
  { value: 'PAUSED',    label: 'Paused'    },
  { value: 'EXPIRED',   label: 'Expired'   },
  { value: 'ARCHIVED',  label: 'Archived'  },
]

const STATUS_BADGE = {
  PUBLISHED: <Badge variant="success" dot size="xs">Published</Badge>,
  DRAFT:     <Badge variant="default" dot size="xs">Draft</Badge>,
  PAUSED:    <Badge variant="warning" dot size="xs">Paused</Badge>,
  EXPIRED:   <Badge variant="danger"  dot size="xs">Expired</Badge>,
  ARCHIVED:  <Badge variant="default" dot size="xs">Archived</Badge>,
}

const NEXT_STATUSES = {
  PUBLISHED: ['PAUSED', 'ARCHIVED'],
  DRAFT:     ['PUBLISHED', 'ARCHIVED'],
  PAUSED:    ['PUBLISHED', 'ARCHIVED'],
  EXPIRED:   ['ARCHIVED'],
  ARCHIVED:  ['PUBLISHED'],
}

/* ── Action menu (status change + delete) ─────────────────────────────── */
function AdActionMenu({ ad, onSetStatus, onDelete, loading }) {
  const [open, setOpen] = useState(false)
  const options = NEXT_STATUSES[ad.status] || []

  return (
    <div className="relative flex items-center gap-1 justify-end">
      {/* Delete — always visible as icon */}
      <button
        onClick={() => onDelete(ad)}
        disabled={loading}
        className="
          h-8 w-8 flex items-center justify-center rounded-lg
          text-ink-3 hover:text-danger hover:bg-danger-bg
          disabled:opacity-40 transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger
        "
        aria-label="Delete advertisement"
      >
        <Trash2 size={13} />
      </button>

      {/* Status menu */}
      {options.length > 0 && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            disabled={loading}
            className="
              h-8 w-8 flex items-center justify-center rounded-lg
              border border-transparent
              text-ink-3 hover:text-ink hover:border-border hover:bg-surface-2
              disabled:opacity-40 transition-all duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
            "
            aria-label="Change status"
          >
            <MoreHorizontal size={15} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-1 z-20 bg-surface border border-border rounded-xl shadow-lg py-1 min-w-[140px] top-full animate-fade-in">
                <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide px-3.5 py-1.5">
                  Set status
                </p>
                {options.map(s => (
                  <button
                    key={s}
                    onClick={() => { onSetStatus(ad.id, s); setOpen(false) }}
                    className="block w-full text-left px-3.5 py-2 text-[12.5px] text-ink hover:bg-surface-2 transition-colors"
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function AdminAdsPage() {
  const [searchParams] = useSearchParams()
  const [search,  setSearch]  = useState(searchParams.get('search') || '')
  const [status,  setStatus]  = useState(searchParams.get('status') || '')
  const [catId,   setCatId]   = useState('')
  const [page,    setPage]    = useState(1)
  const [debSearch, setDebSearch] = useState(search)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debSearch, status, catId])

  const params = {
    page, page_size: 20,
    ...(debSearch && { search:      debSearch }),
    ...(status    && { status }),
    ...(catId     && { category_id: catId }),
  }

  const { data, isLoading, error } = useAdminAds(params)
  const { data: catsData }         = useAdminCategories()
  const setStatus2 = useSetAdStatus()
  const deleteAd   = useAdminDeleteAd()

  const ads        = data?.advertisements || []
  const pagination = data?.pagination     || null
  const categories = (catsData || []).filter(c => !c.parent_id)
  const catOpts    = categories.map(c => ({ value: c.id, label: c.name }))
  const anyMutating = setStatus2.isPending || deleteAd.isPending

  const columns = [
    {
      key: 'title',
      label: 'Advertisement',
      render: a => (
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-ink line-clamp-1">{a.title}</p>
          <p className="text-[11.5px] text-ink-3 mt-0.5">{a.user_email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: a => STATUS_BADGE[a.status] || <Badge variant="default" size="xs">{a.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass:  'hidden sm:table-cell',
    },
    {
      key: 'category_name',
      label: 'Category',
      render: a => <span className="text-[12.5px] text-ink-2">{a.category_name || '—'}</span>,
      className: 'hidden md:table-cell',
      cellClass:  'hidden md:table-cell',
    },
    {
      key: 'meta',
      label: 'Details',
      render: a => (
        <div className="flex items-center gap-2 text-[11.5px] text-ink-3 flex-wrap">
          {Number(a.image_count) > 0 && (
            <span className="flex items-center gap-1">
              <Image size={11} />{a.image_count}
            </span>
          )}
          {a.address && (
            <span className="flex items-center gap-1 truncate max-w-[100px]">
              <MapPin size={11} />{a.address}
            </span>
          )}
          {a.price != null && (
            <span className="font-medium text-ink">ETB {Number(a.price).toLocaleString()}</span>
          )}
        </div>
      ),
      className: 'hidden lg:table-cell',
      cellClass:  'hidden lg:table-cell',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: a => (
        <span className="text-[12px] text-ink-3 tabular-nums">
          {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass:  'hidden xl:table-cell',
    },
    {
      key: 'actions',
      label: '',
      render: a => (
        <AdActionMenu
          ad={a}
          onSetStatus={(id, s) => setStatus2.mutate({ adId: id, status: s })}
          onDelete={setDeleteTarget}
          loading={anyMutating}
        />
      ),
      cellClass: 'text-right',
      className: 'text-right',
    },
  ]

  return (
    <AdminLayout title="Advertisements">
      <PageHeader
        title="Advertisements"
        subtitle="Review, moderate, and manage all platform listings."
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        <StatCard label="Total" value={(data?.pagination?.total ?? ads.length).toLocaleString()} iconBg="bg-surface-2" iconColor="text-ink-3" />
        <StatCard label="Published" value={status === 'PUBLISHED' ? ads.length.toLocaleString() : '—'} iconBg="bg-success-bg" iconColor="text-success" />
        <StatCard label="Status filter" value={status || 'All'} iconBg="bg-brand-light" iconColor="text-brand" />
        <StatCard label="Category" value={catId ? categories.find(c => c.id === catId)?.name || '—' : 'All'} iconBg="bg-amber-50" iconColor="text-amber-600" />
      </div>

      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search title or advertiser…"
            className="w-full sm:flex-1 sm:max-w-xs"
          />
          <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} placeholder="All statuses" />
          <FilterSelect value={catId}  onChange={setCatId}  options={catOpts}    placeholder="All categories" />
          {(search || status || catId) && (
            <button
              onClick={() => { setSearch(''); setStatus(''); setCatId('') }}
              className="text-[12.5px] text-ink-3 hover:text-danger transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {(setStatus2.error || deleteAd.error) && (
          <div className="bg-danger-bg border border-red-200 rounded-lg px-4 py-2.5 text-[13px] text-danger">
            {(setStatus2.error || deleteAd.error)?.response?.data?.message || 'Action failed.'}
          </div>
        )}

        <AdminTable
          columns={columns}
          rows={ads}
          loading={isLoading}
          error={error}
          emptyMessage="No advertisements match your current filters."
        />

        <Pagination pagination={pagination} onPage={setPage} />
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete advertisement?"
        message={`"${deleteTarget?.title}" will be permanently removed along with all its images. This cannot be undone.`}
        confirmLabel="Delete permanently"
        loading={deleteAd.isPending}
        onConfirm={() => { deleteAd.mutate(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  )
}
