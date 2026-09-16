/**
 * AdminPlansPage.jsx — Subscription plan management.
 * Premium plan cards with feature checklists. Edit via modal.
 * All existing API calls (GET /admin/plans, PATCH /admin/plans/:id) preserved.
 */
import { useState } from 'react'
import {
  Shield, Zap, Star, Crown,
  Check, X as XIcon, Pencil,
  Loader2,
} from 'lucide-react'
import { AdminLayout } from '../../components/layout/AdminLayout.jsx'
import { Button }      from '../../components/ui/Button.jsx'
import { FormField, Input } from '../../components/ui/FormField.jsx'
import { Badge }       from '../../components/ui/Badge.jsx'
import { Skeleton }    from '../../components/ui/Skeleton.jsx'
import { PageHeader }  from '../../features/admin/components/AdminTable.jsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient.js'

/* ── Plan visual config ────────────────────────────────────────────────── */
const PLAN_CONFIG = {
  FREE: {
    icon: Shield,
    iconClass:  'text-gray-500',
    iconBg:     'bg-gray-50',
    accentBg:   'bg-canvas',
    borderClass: 'border-border',
    badge: null,
  },
  BASIC: {
    icon: Zap,
    iconClass:  'text-blue-600',
    iconBg:     'bg-blue-50',
    accentBg:   'bg-canvas',
    borderClass: 'border-border',
    badge: null,
  },
  PRO: {
    icon: Star,
    iconClass:  'text-brand',
    iconBg:     'bg-brand-light',
    accentBg:   'bg-canvas',
    borderClass: 'border-brand-border',
    badge: <Badge variant="brand" size="xs">Popular</Badge>,
  },
  BUSINESS: {
    icon: Crown,
    iconClass:  'text-amber-600',
    iconBg:     'bg-amber-50',
    accentBg:   'bg-canvas',
    borderClass: 'border-amber-200',
    badge: <Badge variant="dark" size="xs">Premium</Badge>,
  },
}

function fmtLimit(val) {
  if (val === null || val === undefined) return '—'
  if (Number(val) >= 9999) return 'Unlimited'
  return Number(val).toLocaleString()
}

/* ── Feature row ───────────────────────────────────────────────────────── */
function FeatureRow({ label, value, isBoolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
      <span className="text-[13px] text-ink-2">{label}</span>
      {isBoolean ? (
        <span>
          {value
            ? <Check size={14} className="text-success" aria-label="Included" />
            : <XIcon size={14} className="text-ink-4" aria-label="Not included" />
          }
        </span>
      ) : (
        <span className="text-[13px] font-semibold text-ink tabular-nums">{fmtLimit(value)}</span>
      )}
    </div>
  )
}

/* ── Plan card ─────────────────────────────────────────────────────────── */
function PlanCard({ plan, onEdit }) {
  const cfg  = PLAN_CONFIG[plan.name] || PLAN_CONFIG.FREE
  const Icon = cfg.icon
  const isFree = plan.price_etb == 0 || !plan.price_etb

  return (
    <div
      className={`
        relative bg-surface border ${cfg.borderClass} rounded-2xl overflow-hidden
        flex flex-col
      `}
    >
      {/* Header */}
      <div className="p-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={cfg.iconClass} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-ink">{plan.display_name}</h3>
                {cfg.badge}
              </div>
              <p className="text-[13px] text-ink-2 mt-0.5">
                {isFree
                  ? <span className="font-semibold text-ink">Free</span>
                  : <><span className="text-[18px] font-bold text-ink">ETB {Number(plan.price_etb).toLocaleString()}</span><span className="text-ink-3">/mo</span></>
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!plan.is_active && <Badge variant="danger" size="xs">Inactive</Badge>}
            {plan.is_featured && <Badge variant="brand" size="xs">Featured</Badge>}
            <button
              onClick={() => onEdit(plan)}
              className="
                h-8 w-8 flex items-center justify-center rounded-lg
                text-ink-3 hover:text-brand hover:bg-brand-light
                border border-transparent hover:border-brand-border
                transition-all duration-150
              "
              aria-label={`Edit ${plan.display_name} plan`}
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-5 py-1 flex-1">
        <FeatureRow label="Services"         value={plan.max_profile_services} />
        <FeatureRow label="Portfolio items"  value={plan.max_portfolio_items} />
        <FeatureRow label="Posts"            value={plan.max_posts} />
        <FeatureRow label="Gallery photos"   value={plan.max_gallery_images} />
        <FeatureRow label="Social links"     value={plan.max_social_links} />
        <FeatureRow label="Featured in search" value={plan.is_featured} isBoolean />
      </div>
    </div>
  )
}

/* ── Edit modal ────────────────────────────────────────────────────────── */
const EDITABLE_FIELDS = [
  { key: 'price_etb',            label: 'Price (ETB/month)' },
  { key: 'max_profile_services', label: 'Max services'      },
  { key: 'max_portfolio_items',  label: 'Max portfolio items' },
  { key: 'max_posts',            label: 'Max posts'         },
  { key: 'max_gallery_images',   label: 'Max gallery photos' },
  { key: 'max_social_links',     label: 'Max social links'  },
]

function PlanEditor({ plan, onClose, onSaved }) {
  const qc = useQueryClient()
  const cfg  = PLAN_CONFIG[plan.name] || PLAN_CONFIG.FREE
  const Icon = cfg.icon

  const [form, setForm] = useState({
    price_etb:            plan.price_etb,
    max_profile_services: plan.max_profile_services,
    max_portfolio_items:  plan.max_portfolio_items,
    max_posts:            plan.max_posts,
    max_gallery_images:   plan.max_gallery_images ?? 3,
    max_social_links:     plan.max_social_links   ?? 3,
    is_featured:          plan.is_featured,
    is_active:            plan.is_active,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiClient.patch(`/admin/plans/${plan.id}`, {
        price_etb:            Number(form.price_etb),
        max_profile_services: Number(form.max_profile_services),
        max_portfolio_items:  Number(form.max_portfolio_items),
        max_posts:            Number(form.max_posts),
        max_gallery_images:   Number(form.max_gallery_images),
        max_social_links:     Number(form.max_social_links),
        is_featured:          form.is_featured,
        is_active:            form.is_active,
      })
      qc.invalidateQueries({ queryKey: ['admin', 'plans'] })
      qc.invalidateQueries({ queryKey: ['subscriptions', 'plans'] })
      onSaved?.()
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save plan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-editor-title"
    >
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center`}>
              <Icon size={15} className={cfg.iconClass} />
            </div>
            <h2 id="plan-editor-title" className="text-[15px] font-bold text-ink">
              Edit {plan.display_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink transition-colors"
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Hint */}
          <p className="text-[12.5px] text-ink-3 leading-relaxed">
            Changes take effect immediately for new subscribers. Existing subscribers keep their current plan until renewal.
            Use <strong>9999</strong> for unlimited.
          </p>

          {error && (
            <div className="bg-danger-bg border border-red-200 rounded-lg px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {EDITABLE_FIELDS.map(f => (
              <FormField key={f.key} label={f.label}>
                <Input
                  type="number"
                  min={0}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </FormField>
            ))}
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-ink select-none">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))}
                className="w-4 h-4 rounded accent-brand"
              />
              Featured in search
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-ink select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 rounded accent-brand"
              />
              Plan is active
            </label>
          </div>

          <div className="flex gap-2.5 pt-1">
            <Button type="submit" variant="primary" fullWidth loading={saving}>
              Save changes
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function AdminPlansPage() {
  const [editingPlan, setEditingPlan] = useState(null)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/plans')
      return res.data.data
    },
  })

  return (
    <AdminLayout title="Plans">
      <PageHeader
        title="Subscription Plans"
        subtitle="Manage plan limits, pricing, and availability."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 rounded mb-1.5" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex justify-between py-2 border-b border-border">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-3 w-10 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(plans || []).map(plan => (
            <PlanCard key={plan.id} plan={plan} onEdit={setEditingPlan} />
          ))}
        </div>
      )}

      {editingPlan && (
        <PlanEditor
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={() => setEditingPlan(null)}
        />
      )}
    </AdminLayout>
  )
}
