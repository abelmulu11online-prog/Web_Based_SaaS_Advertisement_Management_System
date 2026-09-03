/**
 * AdminSubscriptionsPage.jsx — Paginated subscription records.
 * Data from /api/admin/subscriptions (PostgreSQL).
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import {
  AdminTable, SearchBar, FilterSelect, Pagination,
} from '../../features/admin/components/AdminTable.jsx'
import { useAdminSubscriptions } from '../../features/admin/hooks/useAdmin.js'

const STATUS_OPTS = [
  { value: 'ACTIVE',  label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
]

const STATUS_BADGE = {
  ACTIVE:  <Badge variant="success" dot>Active</Badge>,
  EXPIRED: <Badge variant="default" dot>Expired</Badge>,
  FREE:    <Badge variant="default" dot>Free</Badge>,
}

const PLAN_BADGE = {
  FREE:     <Badge variant="default">Free</Badge>,
  BASIC:    <Badge variant="info">Basic</Badge>,
  PRO:      <Badge variant="brand">Pro</Badge>,
  BUSINESS: <Badge variant="dark">Business</Badge>,
}

function daysLeft(end) {
  if (!end) return null
  const ms = new Date(end) - Date.now()
  const d  = Math.ceil(ms / 86400000)
  if (d < 0)  return <span className="text-danger text-[11px]">Expired</span>
  if (d === 0) return <span className="text-warning text-[11px]">Expires today</span>
  return <span className="text-[11px] text-ink-3">{d}d left</span>
}

export default function AdminSubscriptionsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [page,   setPage]   = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, status])

  const params = {
    page,
    page_size: 20,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
  }

  const { data, isLoading, error } = useAdminSubscriptions(params)
  const subs       = data?.subscriptions || []
  const pagination = data?.pagination    || null

  const columns = [
    {
      key: 'email',
      label: 'User',
      render: (s) => (
        <div>
          <p className="font-medium text-ink text-[13px]">{s.email || '—'}</p>
          {s.phone && <p className="text-[11px] text-ink-3">{s.phone}</p>}
        </div>
      ),
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: (s) => PLAN_BADGE[s.plan_name] || <Badge variant="default">{s.plan_display_name}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => STATUS_BADGE[s.status] || <Badge variant="default">{s.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
    },
    {
      key: 'current_period_start',
      label: 'Started',
      render: (s) => (
        <span className="text-[12px] text-ink-3">
          {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString() : '—'}
        </span>
      ),
      className: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
    },
    {
      key: 'current_period_end',
      label: 'Expires',
      render: (s) => (
        <div>
          <p className="text-[12px] text-ink-3">
            {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
          </p>
          {s.status === 'ACTIVE' && daysLeft(s.current_period_end)}
        </div>
      ),
      className: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
    },
    {
      key: 'price_etb',
      label: 'Price',
      render: (s) => (
        <span className="text-[12px] text-ink-2">
          {s.price_etb > 0 ? `ETB ${Number(s.price_etb).toLocaleString()}` : 'Free'}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass: 'hidden xl:table-cell',
    },
  ]

  return (
    <AdminLayout title="Subscriptions">
      <div className="flex flex-col gap-6">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by email…"
            className="w-full sm:w-64"
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={STATUS_OPTS}
            placeholder="All statuses"
          />
          {(search || status) && (
            <button
              onClick={() => { setSearch(''); setStatus('') }}
              className="text-[12px] text-ink-3 hover:text-danger"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <AdminTable
          columns={columns}
          rows={subs}
          loading={isLoading}
          error={error}
          emptyMessage="No subscriptions found."
        />

        <Pagination pagination={pagination} onPage={setPage} />
      </div>
    </AdminLayout>
  )
}
