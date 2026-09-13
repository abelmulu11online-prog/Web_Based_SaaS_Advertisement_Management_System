/**
 * AdminCategoriesPage.jsx — Category management.
 * Accordion tree: parent → children. Inline edit forms. Toggle active.
 * All existing mutations (create, update, toggle) fully preserved.
 */
import { useState } from 'react'
import {
  Plus, Pencil, ToggleLeft, ToggleRight,
  Loader2, ChevronDown, ChevronRight, Tag,
} from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import { Button }       from '../../components/ui/Button.jsx'
import { Skeleton }     from '../../components/ui/Skeleton.jsx'
import { PageHeader, EmptyState } from '../../features/admin/components/AdminTable.jsx'
import {
  useAdminCategories, useCreateCategory,
  useUpdateCategory,  useToggleCategory,
} from '../../features/admin/hooks/useAdmin.js'

/* ── Slug helper ───────────────────────────────────────────────────────── */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

const EMPTY_FORM = { name: '', slug: '', description: '', icon: '', parent_id: '' }

/* ── Category form ─────────────────────────────────────────────────────── */
function CategoryForm({ initial = EMPTY_FORM, parents = [], onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })

  function set(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'name' && (f.slug === slugify(f.name) || f.slug === '')) {
        next.slug = slugify(val)
      }
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      name:        form.name.trim(),
      slug:        form.slug.trim(),
      description: form.description.trim() || undefined,
      icon:        form.icon.trim()        || undefined,
      parent_id:   form.parent_id          || undefined,
    })
  }

  const inputCls = `
    block w-full h-9 px-3 text-[13px]
    bg-canvas border border-border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand
    text-ink placeholder:text-ink-3 transition-all duration-150
  `
  const labelCls = 'block text-[12px] font-medium text-ink-2 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-danger-bg border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-danger">
          {error?.response?.data?.message || 'Save failed.'}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Name <span className="text-danger">*</span></label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required maxLength={100} placeholder="e.g. Electronics" />
        </div>
        <div>
          <label className={labelCls}>Slug <span className="text-danger">*</span></label>
          <input className={inputCls} value={form.slug} onChange={e => set('slug', e.target.value)} required maxLength={100} placeholder="e.g. electronics" pattern="^[a-z0-9-]+$" />
          <p className="text-[11px] text-ink-3 mt-1">Lowercase, numbers, hyphens only.</p>
        </div>
        <div>
          <label className={labelCls}>Icon / Emoji</label>
          <input className={inputCls} value={form.icon} onChange={e => set('icon', e.target.value)} maxLength={50} placeholder="e.g. 📱 or icon-id" />
        </div>
        <div>
          <label className={labelCls}>Parent category</label>
          <select
            className={inputCls + ' appearance-none cursor-pointer'}
            value={form.parent_id || ''}
            onChange={e => set('parent_id', e.target.value)}
          >
            <option value="">None (top-level)</option>
            {parents.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea
            className={inputCls + ' h-16 py-2 resize-none'}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            maxLength={500}
            placeholder="Optional description"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-4 text-[13px] text-ink-2 border border-border rounded-lg hover:bg-surface-2 transition-colors"
        >
          Cancel
        </button>
        <Button type="submit" size="sm" loading={loading} disabled={!form.name || !form.slug}>
          Save category
        </Button>
      </div>
    </form>
  )
}

/* ── Toggle button ─────────────────────────────────────────────────────── */
function ToggleBtn({ cat, onToggle, loading }) {
  return (
    <button
      onClick={() => onToggle(cat.id)}
      disabled={loading}
      title={cat.is_active ? 'Deactivate' : 'Activate'}
      className="text-ink-3 hover:text-brand disabled:opacity-40 transition-colors"
      aria-label={cat.is_active ? 'Deactivate category' : 'Activate category'}
    >
      {loading
        ? <Loader2 size={15} className="animate-spin" />
        : cat.is_active
          ? <ToggleRight size={18} className="text-success" />
          : <ToggleLeft  size={18} className="text-ink-3" />
      }
    </button>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
  const { data: cats, isLoading, error } = useAdminCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const toggle = useToggleCategory()

  const [showCreate,  setShowCreate]  = useState(false)
  const [editId,      setEditId]      = useState(null)
  const [expandedIds, setExpandedIds] = useState(new Set())

  const topLevel = (cats || []).filter(c => !c.parent_id)
  const children = (cats || []).filter(c =>  c.parent_id)

  const getChildren  = id => children.filter(c => c.parent_id === id)
  const isExpanded   = id => expandedIds.has(id)
  const toggleExpand = id => setExpandedIds(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  if (error) {
    return (
      <AdminLayout title="Categories">
        <div className="bg-danger-bg border border-red-200 rounded-xl px-4 py-8 text-center">
          <p className="text-danger text-[13px]">{error?.response?.data?.message || 'Failed to load categories.'}</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Categories">
      <PageHeader
        title="Categories"
        subtitle="Manage the taxonomy used across the platform."
        action={
          <Button
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => { setShowCreate(true); setEditId(null) }}
          >
            New category
          </Button>
        }
      />

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface border border-brand-border rounded-2xl p-5 mb-6">
          <h3 className="text-[14px] font-semibold text-ink mb-4">New category</h3>
          <CategoryForm
            parents={topLevel}
            onSubmit={data => create.mutate(data, { onSuccess: () => setShowCreate(false) })}
            onCancel={() => setShowCreate(false)}
            loading={create.isPending}
            error={create.error}
          />
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && topLevel.length === 0 && !showCreate && (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          message='Click "New category" to add the first one.'
        />
      )}

      {/* Category list */}
      {!isLoading && topLevel.length > 0 && (
        <div className="flex flex-col gap-2">
          {topLevel.map(cat => {
            const kids        = getChildren(cat.id)
            const hasChildren = kids.length > 0
            const expanded    = isExpanded(cat.id)

            return (
              <div
                key={cat.id}
                className="bg-surface border border-border rounded-xl overflow-hidden"
              >
                {/* Parent row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Expand toggle */}
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="text-ink-3 hover:text-ink transition-colors shrink-0"
                      aria-label={expanded ? 'Collapse' : 'Expand'}
                    >
                      {expanded
                        ? <ChevronDown  size={14} />
                        : <ChevronRight size={14} />
                      }
                    </button>
                  ) : (
                    <span className="w-[14px] shrink-0" />
                  )}

                  {/* Icon */}
                  <span className="text-[18px] w-6 shrink-0 leading-none">{cat.icon || '📁'}</span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {editId === cat.id ? (
                      <CategoryForm
                        initial={{ name: cat.name, slug: cat.slug, description: cat.description || '', icon: cat.icon || '', parent_id: '' }}
                        parents={topLevel.filter(p => p.id !== cat.id)}
                        onSubmit={data => update.mutate({ catId: cat.id, data }, { onSuccess: () => setEditId(null) })}
                        onCancel={() => setEditId(null)}
                        loading={update.isPending}
                        error={update.error}
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-ink">{cat.name}</span>
                        <span className="text-[11.5px] text-ink-3">/{cat.slug}</span>
                        {cat.is_active
                          ? <Badge variant="success" size="xs" dot>Active</Badge>
                          : <Badge variant="default" size="xs">Inactive</Badge>
                        }
                        {hasChildren && (
                          <span className="text-[11px] text-ink-3">{kids.length} subcategories</span>
                        )}
                        {cat.ad_count > 0 && (
                          <span className="text-[11px] text-ink-3">{Number(cat.ad_count).toLocaleString()} ads</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {editId !== cat.id && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditId(cat.id); setShowCreate(false) }}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-brand hover:bg-brand-light transition-all"
                        aria-label="Edit category"
                      >
                        <Pencil size={13} />
                      </button>
                      <ToggleBtn cat={cat} onToggle={id => toggle.mutate(id)} loading={toggle.isPending} />
                    </div>
                  )}
                </div>

                {/* Children — animated accordion */}
                {hasChildren && expanded && (
                  <div className="border-t border-border bg-canvas">
                    {kids.map((child, idx) => (
                      <div
                        key={child.id}
                        className={`flex items-center gap-3 px-4 py-2.5 pl-12 ${idx < kids.length - 1 ? 'border-b border-border' : ''}`}
                      >
                        <span className="text-[15px] w-5 shrink-0">{child.icon || '·'}</span>
                        <div className="flex-1 min-w-0">
                          {editId === child.id ? (
                            <CategoryForm
                              initial={{ name: child.name, slug: child.slug, description: child.description || '', icon: child.icon || '', parent_id: child.parent_id || '' }}
                              parents={topLevel}
                              onSubmit={data => update.mutate({ catId: child.id, data }, { onSuccess: () => setEditId(null) })}
                              onCancel={() => setEditId(null)}
                              loading={update.isPending}
                              error={update.error}
                            />
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13.5px] font-medium text-ink">{child.name}</span>
                              <span className="text-[11.5px] text-ink-3">/{child.slug}</span>
                              {!child.is_active && <Badge variant="default" size="xs">Inactive</Badge>}
                              {child.ad_count > 0 && (
                                <span className="text-[11px] text-ink-3">{Number(child.ad_count).toLocaleString()} ads</span>
                              )}
                            </div>
                          )}
                        </div>
                        {editId !== child.id && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => { setEditId(child.id); setShowCreate(false) }}
                              className="h-7 w-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-brand hover:bg-brand-light transition-all"
                              aria-label="Edit subcategory"
                            >
                              <Pencil size={13} />
                            </button>
                            <ToggleBtn cat={child} onToggle={id => toggle.mutate(id)} loading={toggle.isPending} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {toggle.error && (
        <div className="mt-4 bg-danger-bg border border-red-200 rounded-lg px-4 py-2 text-[12.5px] text-danger">
          {toggle.error?.response?.data?.message || 'Toggle failed.'}
        </div>
      )}
    </AdminLayout>
  )
}
