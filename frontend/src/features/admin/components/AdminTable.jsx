/**
 * AdminTable.jsx — Reusable table with loading / empty / error states,
 * search, filter, and pagination.
 */
import { Skeleton } from '../../../components/ui/Skeleton.jsx'
import { Button } from '../../../components/ui/Button.jsx'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

// ── Stat Card ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, icon, color = 'text-brand', loading }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest">{label}</span>
        {icon && <span className={color}>{icon}</span>}
      </div>
      {loading
        ? <Skeleton className="h-7 w-20" />
        : <div className="text-2xl font-bold text-ink tracking-tight">{value ?? '—'}</div>
      }
      {sub && !loading && <p className="text-[12px] text-ink-3 mt-1">{sub}</p>}
    </div>
  )
}

// ── Search bar ────────────────────────────────────────────────────────────────

export function SearchBar({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 h-8 text-[13px] bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-brand text-ink placeholder:text-ink-3"
      />
    </div>
  )
}

// ── Filter select ─────────────────────────────────────────────────────────────

export function FilterSelect({ value, onChange, options, placeholder = 'All', className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 px-2.5 pr-7 text-[13px] bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-brand text-ink appearance-none ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ── Pagination controls ───────────────────────────────────────────────────────

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.total_pages <= 1) return null
  const { page, total_pages, total, page_size } = pagination
  const from = (page - 1) * page_size + 1
  const to   = Math.min(page * page_size, total)

  return (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border mt-4">
      <p className="text-[12px] text-ink-3">
        {from}–{to} of {Number(total).toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-7 w-7 flex items-center justify-center rounded border border-border text-ink-2 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[12px] text-ink-2 px-2">
          {page} / {total_pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= total_pages}
          className="h-7 w-7 flex items-center justify-center rounded border border-border text-ink-2 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Main table wrapper ────────────────────────────────────────────────────────

export function AdminTable({
  columns,
  rows,
  loading,
  error,
  emptyMessage = 'No records found.',
  rowKey = 'id',
}) {
  if (error) {
    return (
      <div className="bg-danger-bg border border-red-200 rounded-xl px-4 py-8 text-center">
        <p className="text-danger text-[13px] font-medium">
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
            <tr className="border-b border-border bg-surface-2">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-[11px] font-semibold text-ink-3 uppercase tracking-widest px-4 py-2.5 whitespace-nowrap ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 rounded" style={{ width: col.skeletonWidth ?? '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[13px] text-ink-3">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row[rowKey]} className="hover:bg-surface-2 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-[13px] text-ink ${col.cellClass ?? ''}`}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
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

// ── Section header ────────────────────────────────────────────────────────────

export function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest">{title}</h2>
      {action}
    </div>
  )
}

// ── Simple bar chart (CSS only, no library) ────────────────────────────────────

export function BarChart({ data, keyField, valueField, label, className = '' }) {
  if (!data || data.length === 0) return (
    <p className="text-[12px] text-ink-3 py-4 text-center">No data available.</p>
  )

  const max = Math.max(...data.map((d) => Number(d[valueField]) || 0), 1)

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-widest mb-1">{label}</p>}
      {data.map((d, i) => {
        const pct = ((Number(d[valueField]) || 0) / max) * 100
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[12px] text-ink-2 w-28 shrink-0 truncate">{d[keyField]}</span>
            <div className="flex-1 bg-surface-2 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12px] font-medium text-ink w-10 text-right shrink-0">
              {Number(d[valueField]).toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Sparkline (simple day-by-day line, CSS/SVG) ────────────────────────────────

export function Sparkline({ data, valueField, className = '' }) {
  if (!data || data.length < 2) return (
    <p className="text-[12px] text-ink-3 text-center py-2">Not enough data.</p>
  )

  const vals = data.map((d) => Number(d[valueField]) || 0)
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals)
  const W = 300
  const H = 60
  const pad = 4

  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2)
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${className}`} style={{ height: 60 }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-brand"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
