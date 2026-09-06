/**
 * AdminSubscriptionsPage.jsx — Subscription records.
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import {
  AdminTable, SearchBar, FilterSelect,
  Pagination, PageHeader, StatCard,
} from '../../features/admin/components/AdminTable.jsx'
import { useAdminSubscriptions } from '../../features/admin/hooks/useAdmin.js'
import { CreditCard } from 'lucide-react'

const STATUS_OPTS = [
  { value: 'ACTIVE',  label: 'Active'  },
  { value: 'EXPIRED', label: 'Expired' },
]

const STATUS_BADGE = {
  ACTIVE:  <Badge variant="success" dot size="xs">Active</Badge>,
  EXPIRED: <Badge variant="default" dot size="xs">Expired</Badge>,
  FREE:    <Badge variant="default" dot size="xs">Free</Badge>,
}

const PLAN_BADGE = {
  FREE:     <Badge variant="default" size="xs">Free</Badge>,
  BASIC:    <Badge variant="info"    size="xs">Basic</Badge>,
  PRO:      <Badge variant="brand"   size="xs">Pro</Badge>,
  BUSINESS: <Badge variant="dark"    size="xs">Business</Badge>,
}

/* ── Days remaining indicator ──────────────────────────────────────────── */
function DaysLeft({ end, status }) {
  if (!end || status !== 'ACTIVE') return null
  const ms = new Date(end) - Date.now()
  const d  = Math.ceil(ms / 86400000)
  if (d < 0)   return <span className="text-[11px] text-danger font-medium">Expired</span>
  if (d === 0) return <span className="text-[11px] text-warning font-medium">Expires today</span>
  if (d <= 7)  return <span className="text-[11px] text-warning font-medium">{d}d left</span>
  return <span className="text-[11px] text-ink-3">{d}d left</span>
}

/* ── Expiry bar ────────────────────────────────────────────────────────── */
function ExpiryBar({ start, end, status }) {
  if (!start || !end || status !== 'ACTIVE') return null
  const total   = new Date(end) - new Date(start)
  const elapsed = Date.now() - new Date(start)
  const pct     = Math.max(0, Math.min(100, (elapsed / total) * 100))
  const isLow   = pct > 80

  return (
    <div className="mt-1.5 w-full max-w-[80px] h-1 bg-surface-2 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${isLow ? 'bg-warning' : 'bg-brand'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function AdminSubscriptionsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [page,   setPage]   = useState(1)
  const [debSearch, setDebSearch] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debSearch, status])

  const params = {
    page, page_size: 20,
    ...(debSearch && { search: debSearch }),
    ...(status    && { status }),
  }

  const { data, isLoading, error } = useAdminSubscriptions(params)
  const subs       = data?.subscriptions || []
  const pagination = data?.pagination    || null

  const columns = [
    {
      key: 'email',
      label: 'User',
      render: s => (
        <div>
          <p className="text-[13.5px] font-medium text-ink">{s.email || '—'}</p>
          {s.phone && <p className="text-[11.5px] text-ink-3">{s.phone}</p>}
        </div>
      ),
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: s => PLAN_BADGE[s.plan_name] || <Badge variant="default" size="xs">{s.plan_display_name}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass:  'hidden sm:table-cell',
    },
    {
      key: 'status',
      label: 'Status',
      render: s => STATUS_BADGE[s.status] || <Badge variant="default" size="xs">{s.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass:  'hidden sm:table-cell',
    },
    {
      key: 'current_period_start',
      label: 'Started',
      render: s => (
        <span className="text-[12px] text-ink-3 tabular-nums">
          {s.current_period_start
            ? new Date(s.current_period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'}
        </span>
      ),
      className: 'hidden md:table-cell',
      cellClass:  'hidden md:table-cell',
    },
    {
      key: 'current_period_end',
      label: 'Expires',
      render: s => (
        <div>
          <p className="text-[12px] text-ink-3 tabular-nums">
            {s.current_period_end
              ? new Date(s.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </p>
          <DaysLeft end={s.current_period_end} status={s.status} />
          <ExpiryBar start={s.current_period_start} end={s.current_period_end} status={s.status} />
        </div>
      ),
      className: 'hidden lg:table-cell',
      cellClass:  'hidden lg:table-cell',
    },
    {
      key: 'price_etb',
      label: 'Price',
      render: s => (
        <span className="text-[13px] font-medium text-ink tabular-nums">
          {s.price_etb > 0 ? `ETB ${Number(s.price_etb).toLocaleString()}` : <span className="text-ink-3 font-normal">Free</span>}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass:  'hidden xl:table-cell',
    },
  ]

  return (
    <AdminLayout title="Subscriptions">
      <PageHeader
        title="Subscriptions"
        subtitle="All active and expired subscription records."
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        <StatCard label="Total"        value={(data?.pagination?.total ?? subs.length).toLocaleString()} icon={<CreditCard size={15} />} iconBg="bg-indigo-50" iconColor="text-indigo-600" loading={isLoading} />
        <StatCard label="Active"       value={status === 'ACTIVE'  ? subs.length.toLocaleString() : '—'} iconBg="bg-success-bg" iconColor="text-success" />
        <StatCard label="Status filter" value={status || 'All'}                                           iconBg="bg-brand-light" iconColor="text-brand" />
        <StatCard label="Page size"    value="20 / page"                                                  iconBg="bg-surface-2" iconColor="text-ink-3" />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by email…"
            className="w-full sm:flex-1 sm:max-w-xs"
          />
          <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} placeholder="All statuses" />
          {(search || status) && (
            <button
              onClick={() => { setSearch(''); setStatus('') }}
              className="text-[12.5px] text-ink-3 hover:text-danger transition-colors"
            >
              Clear
            </button>
          )}
        </div>

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
