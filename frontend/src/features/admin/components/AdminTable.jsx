/**
 * AdminTable.jsx — Shared admin UI primitives.
 *
 * Exports:
 *   StatCard       — KPI metric with optional trend indicator
 *   SearchBar      — controlled search input
 *   FilterSelect   — dropdown filter
 *   Pagination     — numbered page controls
 *   AdminTable     — full data table with loading / empty / error states
 *   SectionHeader  — section title + optional action
 *   BarChart       — horizontal CSS bar chart
 *   Sparkline      — SVG polyline sparkline
 *   PageHeader     — consistent page title + subtitle + action
 *   EmptyState     — styled empty/no-results block
 *   ConfirmDialog  — accessible delete / destructive confirmation modal
 */
import { Skeleton } from '../../../components/ui/Skeleton.jsx'
import { Button }   from '../../../components/ui/Button.jsx'
import {
  ChevronLeft, ChevronRight, Search, TrendingUp, TrendingDown,
  Minus, AlertCircle, X, Users,
} from 'lucide-react'

/* ════════════════════════════════════════════════════════════════════════════
   StatCard
   Displays a single KPI metric with label, value, optional sub-text,
   and an optional trend indicator (positive / negative / neutral).
════════════════════════════════════════════════════════════════════════════ */
export function StatCard({
  label,
  value,
  sub,
  icon,
  iconBg,          // e.g. 'bg-brand-light'
  iconColor,       // e.g. 'text-brand'
  trend,           // number like +12 or -5 (percentage)
  loading,
  className = '',
}) {
  const trendPos = trend > 0
  const trendFlat = trend === 0 || trend == null

  return (
    <div className={`bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 ${className}`}>
      {/* Header row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11.5px] font-medium text-ink-3 leading-tight">
          {label}
        </span>
        {icon && (
          <div
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center shrink-0
              ${iconBg || 'bg-surface-2'}
            `}
          >
            <span className={iconColor || 'text-ink-3'}>{icon}</span>
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <Skeleton className="h-7 w-24 rounded" />
      ) : (
        <div className="text-[26px] font-bold text-ink tracking-tight leading-none">
          {value ?? '—'}
        </div>
      )}

      {/* Sub + trend row */}
      {!loading && (sub || trend != null) && (
        <div className="flex items-center gap-2 flex-wrap">
          {trend != null && (
            <span
              className={`
                inline-flex items-center gap-0.5
                text-[11.5px] font-semibold
                ${trendFlat ? 'text-ink-3' : trendPos ? 'text-success' : 'text-danger'}
              `}
            >
              {trendFlat
                ? <Minus size={11} />
                : trendPos
                ? <TrendingUp  size={11} />
                : <TrendingDown size={11} />
              }
              {!trendFlat && `${trendPos ? '+' : ''}${trend}%`}
            </span>
          )}
          {sub && (
            <span className="text-[11.5px] text-ink-3">{sub}</span>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SearchBar
════════════════════════════════════════════════════════════════════════════ */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full h-9 pl-9 pr-3
          bg-canvas border border-border rounded-lg
          text-[13.5px] text-ink placeholder:text-ink-3
          outline-none focus:border-brand focus:ring-2 focus:ring-brand/10
          transition-all duration-150
        "
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   FilterSelect
════════════════════════════════════════════════════════════════════════════ */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'All',
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="
          h-9 pl-3 pr-8
          bg-canvas border border-border rounded-lg
          text-[13.5px] text-ink
          outline-none focus:border-brand focus:ring-2 focus:ring-brand/10
          appearance-none cursor-pointer
          transition-all duration-150
        "
        aria-label={placeholder}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronRight
        size={12}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none rotate-90"
        aria-hidden="true"
      />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Pagination — numbered with prev/next
════════════════════════════════════════════════════════════════════════════ */
export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.total_pages <= 1) return null

  const { page, total_pages, total, page_size } = pagination
  const from = (page - 1) * page_size + 1
  const to   = Math.min(page * page_size, total)

  // Build visible page range: always show first, last, current ±1, with gaps
  const pages = []
  const add = n => { if (n >= 1 && n <= total_pages && !pages.includes(n)) pages.push(n) }
  add(1); add(page - 1); add(page); add(page + 1); add(total_pages)
  pages.sort((a, b) => a - b)

  const items = []
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push(null)
    items.push(pages[i])
  }

  const btnBase = `
    h-8 min-w-[32px] px-2 rounded-lg border text-[12.5px] font-medium
    transition-all duration-150
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
    disabled:opacity-40 disabled:cursor-not-allowed
  `

  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-border mt-4">
      <p className="text-[12px] text-ink-3 hidden sm:block">
        {from.toLocaleString()}–{to.toLocaleString()} of {Number(total).toLocaleString()}
      </p>

      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={`${btnBase} border-border text-ink-2 hover:border-brand-border hover:text-ink bg-surface`}
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
        </button>

        {items.map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-ink-4 text-[12px]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`${btnBase} ${
                p === page
                  ? 'bg-brand text-white border-brand'
                  : 'border-border text-ink-2 hover:border-brand-border hover:text-ink bg-surface'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= total_pages}
          className={`${btnBase} border-border text-ink-2 hover:border-brand-border hover:text-ink bg-surface`}
          aria-label="Next page"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   AdminTable
════════════════════════════════════════════════════════════════════════════ */
export function AdminTable({
  columns,
  rows,
  loading,
  error,
  emptyMessage = 'No records found.',
  emptyIcon,
  rowKey = 'id',
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-danger-bg border border-red-200 rounded-xl">
        <AlertCircle size={22} className="text-danger" />
        <p className="text-[13px] text-danger font-medium">
          {error?.response?.data?.message || error?.message || 'Failed to load data.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`
                    text-left text-[11px] font-semibold text-ink-3
                    uppercase tracking-[0.08em]
                    px-5 py-3 whitespace-nowrap bg-canvas
                    ${col.className ?? ''}
                  `}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className={`px-5 py-3.5 ${col.cellClass ?? ''}`}>
                      <Skeleton className="h-4 rounded" style={{ width: col.skeletonWidth ?? '70%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {emptyIcon || <Users size={20} className="text-ink-4" />}
                    <p className="text-[13px] text-ink-3">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr
                  key={row[rowKey]}
                  className="hover:bg-surface-2/60 transition-colors duration-100 group"
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 text-[13px] text-ink ${col.cellClass ?? ''}`}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SectionHeader
════════════════════════════════════════════════════════════════════════════ */
export function SectionHeader({ title, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-4 mb-5 ${className}`}>
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      {action}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   PageHeader — consistent page-level title block
════════════════════════════════════════════════════════════════════════════ */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7">
      <div>
        <h1 className="text-[20px] font-bold text-ink tracking-tight leading-snug">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13.5px] text-ink-2 mt-1 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   EmptyState — for zero-result or no-data situations
════════════════════════════════════════════════════════════════════════════ */
export function EmptyState({ icon: Icon = Users, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4">
        <Icon size={20} className="text-ink-4" aria-hidden="true" />
      </div>
      {title && (
        <p className="text-[14px] font-semibold text-ink mb-1">{title}</p>
      )}
      {message && (
        <p className="text-[13px] text-ink-3 max-w-xs leading-relaxed mb-4">{message}</p>
      )}
      {action}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   ConfirmDialog — accessible destructive action confirmation
════════════════════════════════════════════════════════════════════════════ */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading,
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6">
        <h3 id="confirm-title" className="text-[15px] font-bold text-ink mb-2">
          {title}
        </h3>
        <p className="text-[13px] text-ink-2 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="
              h-9 px-4 rounded-lg border border-border
              text-[13px] font-medium text-ink-2
              hover:bg-surface-2 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
            "
          >
            Cancel
          </button>
          <Button
            variant="danger"
            size="md"
            loading={loading}
            onClick={onConfirm}
            className="rounded-lg"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   BarChart — horizontal CSS bars, labelled with values
════════════════════════════════════════════════════════════════════════════ */
export function BarChart({
  data,
  keyField,
  valueField,
  formatValue,
  colorClass = 'bg-brand',
  className = '',
}) {
  if (!data || data.length === 0) return (
    <p className="text-[12px] text-ink-3 py-6 text-center">No data available.</p>
  )

  const max = Math.max(...data.map(d => Number(d[valueField]) || 0), 1)
  const fmt = formatValue ?? (n => Number(n).toLocaleString())

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {data.map((d, i) => {
        const pct = ((Number(d[valueField]) || 0) / max) * 100
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12.5px] text-ink-2 shrink-0 truncate" style={{ width: 120 }}>
              {d[keyField]}
            </span>
            <div className="flex-1 bg-surface-2 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold text-ink shrink-0 tabular-nums" style={{ minWidth: 40, textAlign: 'right' }}>
              {fmt(d[valueField])}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Sparkline — SVG polyline chart for trends
════════════════════════════════════════════════════════════════════════════ */
export function Sparkline({ data, valueField, className = '', color = 'var(--color-brand)' }) {
  if (!data || data.length < 2) return (
    <p className="text-[12px] text-ink-3 text-center py-2">Not enough data.</p>
  )

  const vals  = data.map(d => Number(d[valueField]) || 0)
  const max   = Math.max(...vals, 1)
  const min   = Math.min(...vals)
  const W     = 300
  const H     = 56
  const padX  = 2
  const padY  = 4

  const pts = vals.map((v, i) => {
    const x = padX + (i / (vals.length - 1)) * (W - padX * 2)
    const y = H - padY - ((v - min) / (max - min || 1)) * (H - padY * 2)
    return [x, y]
  })

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')

  // Area fill path
  const areaPath = [
    `M ${pts[0][0]},${H}`,
    ...pts.map(([x, y]) => `L ${x},${y}`),
    `L ${pts[pts.length - 1][0]},${H}`,
    'Z',
  ].join(' ')

  const id = `spark-${Math.random().toString(36).slice(2)}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full ${className}`}
      style={{ height: 56 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${id})`} />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last point dot */}
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2.5"
        fill={color}
      />
    </svg>
  )
}
