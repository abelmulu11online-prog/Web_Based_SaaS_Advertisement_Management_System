/**
 * AdminRevenuePage.jsx — Revenue overview and payment records.
 */
import { useState, useEffect } from 'react'
import { TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import {
  StatCard, AdminTable, FilterSelect,
  Pagination, PageHeader, BarChart,
} from '../../features/admin/components/AdminTable.jsx'
import { useAdminRevenue, useAdminPayments } from '../../features/admin/hooks/useAdmin.js'

const STATUS_OPTS = [
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending'    },
  { value: 'FAILED',  label: 'Failed'     },
]

const STATUS_BADGE = {
  SUCCESS: <Badge variant="success" dot size="xs">Success</Badge>,
  PENDING: <Badge variant="warning" dot size="xs">Pending</Badge>,
  FAILED:  <Badge variant="danger"  dot size="xs">Failed</Badge>,
}

export default function AdminRevenuePage() {
  const { data: rev, isLoading: revLoading, error: revError } = useAdminRevenue()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [statusFilter])

  const params = {
    page, page_size: 20,
    ...(statusFilter && { status: statusFilter }),
  }

  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useAdminPayments(params)
  const payments   = paymentsData?.payments   || []
  const pagination = paymentsData?.pagination || null

  const fmtC = n => n != null ? `ETB ${Number(n).toLocaleString()}` : '—'
  const fmt  = n => n != null ? Number(n).toLocaleString()          : '—'

  /* Revenue-by-plan bar data */
  const planBarData = (rev?.revenue_by_plan || []).map(r => ({
    plan:    r.plan || r.plan_display_name || r.plan_name,
    revenue: Number(r.revenue_etb) || 0,
  }))

  const paymentColumns = [
    {
      key: 'email',
      label: 'Customer',
      render: p => (
        <div>
          <p className="text-[13.5px] font-medium text-ink">{p.email || '—'}</p>
          {p.phone && <p className="text-[11.5px] text-ink-3">{p.phone}</p>}
        </div>
      ),
    },
    {
      key: 'plan_display_name',
      label: 'Plan',
      render: p => <span className="text-[13px] text-ink-2">{p.plan_display_name || '—'}</span>,
      className: 'hidden sm:table-cell',
      cellClass:  'hidden sm:table-cell',
    },
    {
      key: 'amount_etb',
      label: 'Amount',
      render: p => (
        <span className="text-[13.5px] font-semibold text-ink tabular-nums">
          ETB {Number(p.amount_etb).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: p => STATUS_BADGE[p.status] || <Badge variant="default" size="xs">{p.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass:  'hidden sm:table-cell',
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: p => (
        <span className="text-[12.5px] text-ink-3 capitalize">{p.payment_method || '—'}</span>
      ),
      className: 'hidden md:table-cell',
      cellClass:  'hidden md:table-cell',
    },
    {
      key: 'tx_ref',
      label: 'Reference',
      render: p => (
        <span className="text-[11.5px] text-ink-3 font-mono truncate block max-w-[110px]">
          {p.tx_ref}
        </span>
      ),
      className: 'hidden lg:table-cell',
      cellClass:  'hidden lg:table-cell',
    },
    {
      key: 'created_at',
      label: 'Date',
      render: p => (
        <span className="text-[12px] text-ink-3 tabular-nums">
          {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass:  'hidden xl:table-cell',
    },
  ]

  return (
    <AdminLayout title="Revenue">
      <PageHeader
        title="Revenue"
        subtitle="Payment records, revenue trends, and subscription breakdown."
      />

      <div className="flex flex-col gap-8">

        {/* ── Primary KPIs ──────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-4">Overview</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total revenue"
              value={fmtC(rev?.total_revenue_etb)}
              icon={<TrendingUp size={15} />}
              iconBg="bg-success-bg"
              iconColor="text-success"
              loading={revLoading}
            />
            <StatCard
              label="This month"
              value={fmtC(rev?.current_month_etb)}
              sub="current calendar month"
              icon={<TrendingUp size={15} />}
              iconBg="bg-brand-light"
              iconColor="text-brand"
              loading={revLoading}
            />
            <StatCard
              label="Last month"
              value={fmtC(rev?.last_month_etb)}
              icon={<TrendingUp size={15} />}
              iconBg="bg-surface-2"
              iconColor="text-ink-3"
              loading={revLoading}
            />
            <StatCard
              label="Transactions this month"
              value={fmt(rev?.payments_this_month)}
              icon={<CheckCircle2 size={15} />}
              iconBg="bg-success-bg"
              iconColor="text-success"
              loading={revLoading}
            />
          </div>
        </section>

        {/* ── Payment health ────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-4">Payment health</p>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Successful"
              value={fmt(rev?.successful_payments)}
              icon={<CheckCircle2 size={15} />}
              iconBg="bg-success-bg"
              iconColor="text-success"
              loading={revLoading}
            />
            <StatCard
              label="Pending"
              value={fmt(rev?.pending_payments)}
              icon={<Clock size={15} />}
              iconBg="bg-warning-bg"
              iconColor="text-warning"
              loading={revLoading}
            />
            <StatCard
              label="Failed"
              value={fmt(rev?.failed_payments)}
              icon={<AlertCircle size={15} />}
              iconBg="bg-danger-bg"
              iconColor="text-danger"
              loading={revLoading}
            />
          </div>
        </section>

        {/* ── Revenue by plan ───────────────────────────────────────── */}
        {!revLoading && planBarData.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-4">Revenue by plan</p>
            <div className="bg-surface border border-border rounded-xl p-6">
              <BarChart
                data={planBarData}
                keyField="plan"
                valueField="revenue"
                formatValue={n => `ETB ${Number(n).toLocaleString()}`}
              />
            </div>
          </section>
        )}

        {revError && (
          <div className="bg-danger-bg border border-red-200 rounded-xl px-4 py-4 text-[13px] text-danger">
            {revError?.response?.data?.message || 'Failed to load revenue data.'}
          </div>
        )}

        {/* ── Payment records ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <p className="text-[14px] font-semibold text-ink">Payment records</p>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTS}
              placeholder="All statuses"
            />
          </div>

          <AdminTable
            columns={paymentColumns}
            rows={payments}
            loading={paymentsLoading}
            error={paymentsError}
            emptyMessage="No payment records found."
          />

          <Pagination pagination={pagination} onPage={setPage} />
        </section>
      </div>
    </AdminLayout>
  )
}
