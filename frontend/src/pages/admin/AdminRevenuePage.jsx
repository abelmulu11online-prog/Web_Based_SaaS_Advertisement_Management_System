/**
 * AdminRevenuePage.jsx — Revenue overview and payment records.
 * All figures from real PostgreSQL payment_records table.
 */
import { useState, useEffect } from 'react'
import { TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import {
  StatCard, AdminTable, FilterSelect, Pagination, BarChart,
} from '../../features/admin/components/AdminTable.jsx'
import { useAdminRevenue, useAdminPayments } from '../../features/admin/hooks/useAdmin.js'

const STATUS_OPTS = [
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED',  label: 'Failed' },
]

const STATUS_BADGE = {
  SUCCESS: <Badge variant="success" dot>Success</Badge>,
  PENDING: <Badge variant="warning" dot>Pending</Badge>,
  FAILED:  <Badge variant="danger"  dot>Failed</Badge>,
}

export default function AdminRevenuePage() {
  const { data: rev, isLoading: revLoading, error: revError } = useAdminRevenue()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [statusFilter])

  const params = {
    page,
    page_size: 20,
    ...(statusFilter && { status: statusFilter }),
  }

  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useAdminPayments(params)
  const payments   = paymentsData?.payments   || []
  const pagination = paymentsData?.pagination || null

  const fmtC = (n) => n != null ? `ETB ${Number(n).toLocaleString()}` : '—'
  const fmt  = (n) => n != null ? Number(n).toLocaleString() : '—'

  const paymentColumns = [
    {
      key: 'email',
      label: 'User',
      render: (p) => (
        <div>
          <p className="font-medium text-ink text-[13px]">{p.email || '—'}</p>
          {p.phone && <p className="text-[11px] text-ink-3">{p.phone}</p>}
        </div>
      ),
    },
    {
      key: 'plan_display_name',
      label: 'Plan',
      render: (p) => <span className="text-[12px] text-ink-2">{p.plan_display_name}</span>,
      className: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
    },
    {
      key: 'amount_etb',
      label: 'Amount',
      render: (p) => (
        <span className="font-medium text-[13px] text-ink">
          ETB {Number(p.amount_etb).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => STATUS_BADGE[p.status] || <Badge variant="default">{p.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (p) => <span className="text-[12px] text-ink-3 capitalize">{p.payment_method || '—'}</span>,
      className: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
    },
    {
      key: 'tx_ref',
      label: 'Reference',
      render: (p) => (
        <span className="text-[11px] text-ink-3 font-mono truncate max-w-[120px] block">
          {p.tx_ref}
        </span>
      ),
      className: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (p) => (
        <span className="text-[12px] text-ink-3">
          {new Date(p.created_at).toLocaleDateString()}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass: 'hidden xl:table-cell',
    },
  ]

  return (
    <AdminLayout title="Revenue">
      <div className="flex flex-col gap-8">

        {/* Summary cards */}
        <section>
          <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total revenue"
              value={fmtC(rev?.total_revenue_etb)}
              icon={<TrendingUp size={15} />}
              color="text-success"
              loading={revLoading}
            />
            <StatCard
              label="This month"
              value={fmtC(rev?.current_month_etb)}
              sub="current calendar month"
              icon={<TrendingUp size={15} />}
              color="text-brand"
              loading={revLoading}
            />
            <StatCard
              label="Last month"
              value={fmtC(rev?.last_month_etb)}
              icon={<TrendingUp size={15} />}
              color="text-ink-3"
              loading={revLoading}
            />
            <StatCard
              label="Payments / month"
              value={fmt(rev?.payments_this_month)}
              sub="this calendar month"
              icon={<CheckCircle2 size={15} />}
              color="text-success"
              loading={revLoading}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            <StatCard
              label="Successful payments"
              value={fmt(rev?.successful_payments)}
              icon={<CheckCircle2 size={15} />}
              color="text-success"
              loading={revLoading}
            />
            <StatCard
              label="Pending payments"
              value={fmt(rev?.pending_payments)}
              icon={<Clock size={15} />}
              color="text-warning"
              loading={revLoading}
            />
            <StatCard
              label="Failed payments"
              value={fmt(rev?.failed_payments)}
              icon={<AlertCircle size={15} />}
              color="text-danger"
              loading={revLoading}
            />
          </div>
        </section>

        {/* Revenue by plan */}
        {!revLoading && rev?.revenue_by_plan?.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-4">Revenue by plan</h2>
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-[11px] font-semibold text-ink-3 uppercase tracking-widest py-2 pr-4">Plan</th>
                      <th className="text-right text-[11px] font-semibold text-ink-3 uppercase tracking-widest py-2 pr-4">Payments</th>
                      <th className="text-right text-[11px] font-semibold text-ink-3 uppercase tracking-widest py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rev.revenue_by_plan.map((r) => (
                      <tr key={r.plan_name}>
                        <td className="py-2.5 pr-4 text-[13px] font-medium text-ink">{r.plan}</td>
                        <td className="py-2.5 pr-4 text-right text-[13px] text-ink-2">{Number(r.payment_count).toLocaleString()}</td>
                        <td className="py-2.5 text-right text-[13px] font-semibold text-ink">
                          ETB {Number(r.revenue_etb).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {revError && (
          <div className="bg-danger-bg border border-red-200 rounded-xl px-4 py-4 text-[13px] text-danger">
            {revError?.response?.data?.message || 'Failed to load revenue data.'}
          </div>
        )}

        {/* Payment records */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest">Payment records</h2>
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
