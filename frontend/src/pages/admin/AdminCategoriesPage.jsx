/**
 * AdminCategoriesPage.jsx — Category management.
 * Create, edit, toggle active. Single source of truth — same data
 * used by the public Create Advertisement page.
 */
import { useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import { Button }       from '../../components/ui/Button.jsx'
import { Skeleton }     from '../../components/ui/Skeleton.jsx'
import {
  useAdminCategories, useCreateCategory,
  useUpdateCategory, useToggleCategory,
} from '../../features/admin/hooks/useAdmin.js'

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

const EMPTY_FORM = { name: '', slug: '', description: '', icon: '', parent_id: '' }

function CategoryForm({ initial = EMPTY_FORM, parents = [], onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState(initial)

  function set(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val }
      // Auto-generate slug from name if user hasn't manually changed it
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
      icon:        form.icon.trim() || undefined,
      parent_id:   form.parent_id || undefined,
    })
  }

  const field = 'block w-full h-8 px-3 text-[13px] bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-brand text-ink placeholder:text-ink-3'
  const label = 'block text-[12px] font-medium text-ink-2 mb-1'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-danger-bg border border-red-200 rounded px-3 py-2 text-[12.5px] text-danger">
          {error?.response?.data?.message || 'Save failed.'}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Name <span className="text-danger">*</span></label>
          <input className={field} value={form.name} onChange={e => set('name', e.target.value)} required maxLength={100} placeholder="e.g. Electronics" />
        </div>
        <div>
          <label className={label}>Slug <span className="text-danger">*</span></label>
          <input className={field} value={form.slug} onChange={e => set('slug', e.target.value)} required maxLength={100} placeholder="e.g. electronics" pattern="^[a-z0-9-]+$" />
          <p className="text-[11px] text-ink-3 mt-1">Lowercase letters, numbers, hyphens only.</p>
        </div>
        <div>
          <label className={label}>Icon / Emoji</label>
          <input className={field} value={form.icon} onChange={e => set('icon', e.target.value)} maxLength={50} placeholder="e.g. 📱 or icon-id" />
        </div>
        <div>
          <label className={label}>Parent category</label>
          <select
            className={field + ' appearance-none'}
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
          <label className={label}>Description</label>
          <textarea
            className={field + ' h-16 py-2 resize-none'}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            maxLength={500}
            placeholder="Optional description shown in category listings"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="h-8 px-4 text-[13px] text-ink-2 border border-border rounded hover:bg-surface-2">
          Cancel
        </button>
        <Button type="submit" size="sm" loading={loading} disabled={!form.name || !form.slug}>
          Save category
        </Button>
      </div>
    </form>
  )
}

export default function AdminCategoriesPage() {
  const { data: cats, isLoading, error } = useAdminCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const toggle = useToggleCategory()

  const [showCreate, setShowCreate] = useState(false)
  const [editId,     setEditId]     = useState(null)

  const topLevel = (cats || []).filter(c => !c.parent_id)
  const children = (cats || []).filter(c =>  c.parent_id)

  function getChildren(parentId) {
    return children.filter(c => c.parent_id === parentId)
  }

  function handleCreate(data) {
    create.mutate(data, {
      onSuccess: () => setShowCreate(false),
    })
  }

  function handleUpdate(catId, data) {
    update.mutate({ catId, data }, {
      onSuccess: () => setEditId(null),
    })
  }

  if (error) {
    return (
      <AdminLayout title="Categories">
        <div className="bg-danger-bg border border-red-200 rounded-xl px-4 py-8 text-center">
          <p className="text-danger text-[13px]">
            {error?.response?.data?.message || 'Failed to load categories.'}
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Categories">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-2">
            {isLoading ? '…' : `${(cats || []).length} categories total`}
          </p>
          <Button
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => { setShowCreate(true); setEditId(null) }}
          >
            New category
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-surface border border-brand rounded-xl p-5">
            <h3 className="text-[14px] font-semibold text-ink mb-4">New category</h3>
            <CategoryForm
              parents={topLevel}
              onSubmit={handleCreate}
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
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        )}

        {/* Category list */}
        {!isLoading && topLevel.length === 0 && !showCreate && (
          <div className="text-center py-12 text-[13px] text-ink-3 border border-dashed border-border rounded-xl">
            No categories yet. Click "New category" to add one.
          </div>
        )}

        {!isLoading && topLevel.map(cat => (
          <div key={cat.id} className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Parent row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-2">
              <span className="text-lg w-6">{cat.icon || '📁'}</span>
              <div className="flex-1 min-w-0">
                {editId === cat.id ? (
                  <CategoryForm
                    initial={{
                      name: cat.name,
                      slug: cat.slug,
                      description: cat.description || '',
                      icon: cat.icon || '',
                      parent_id: cat.parent_id || '',
                    }}
                    parents={topLevel.filter(p => p.id !== cat.id)}
                    onSubmit={(data) => handleUpdate(cat.id, data)}
                    onCancel={() => setEditId(null)}
                    loading={update.isPending}
                    error={update.error}
                  />
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-ink">{cat.name}</span>
                    <span className="text-[11px] text-ink-3">/{cat.slug}</span>
                    {cat.is_active
                      ? <Badge variant="success" size="xs">Active</Badge>
                      : <Badge variant="default" size="xs">Inactive</Badge>}
                    {cat.ad_count > 0 && (
                      <span className="text-[11px] text-ink-3">{cat.ad_count} ads</span>
                    )}
                  </div>
                )}
              </div>
              {editId !== cat.id && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditId(cat.id); setShowCreate(false) }}
                    className="text-ink-3 hover:text-brand transition-colors"
                    aria-label="Edit category"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => toggle.mutate(cat.id)}
                    disabled={toggle.isPending}
                    className="text-ink-3 hover:text-brand transition-colors disabled:opacity-40"
                    title={cat.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {toggle.isPending
                      ? <Loader2 size={13} className="animate-spin" />
                      : cat.is_active
                        ? <ToggleRight size={16} className="text-success" />
                        : <ToggleLeft  size={16} className="text-ink-3" />}
                  </button>
                </div>
              )}
            </div>

            {/* Children */}
            {getChildren(cat.id).map(child => (
              <div key={child.id} className="flex items-center gap-3 px-4 py-2.5 pl-10 border-b border-border last:border-0">
                <span className="text-base w-5">{child.icon || '•'}</span>
                <div className="flex-1 min-w-0">
                  {editId === child.id ? (
                    <CategoryForm
                      initial={{
                        name: child.name,
                        slug: child.slug,
                        description: child.description || '',
                        icon: child.icon || '',
                        parent_id: child.parent_id || '',
                      }}
                      parents={topLevel}
                      onSubmit={(data) => handleUpdate(child.id, data)}
                      onCancel={() => setEditId(null)}
                      loading={update.isPending}
                      error={update.error}
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-ink">{child.name}</span>
                      <span className="text-[11px] text-ink-3">/{child.slug}</span>
                      {!child.is_active && <Badge variant="default" size="xs">Inactive</Badge>}
                      {child.ad_count > 0 && (
                        <span className="text-[11px] text-ink-3">{child.ad_count} ads</span>
                      )}
                    </div>
                  )}
                </div>
                {editId !== child.id && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditId(child.id); setShowCreate(false) }}
                      className="text-ink-3 hover:text-brand transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => toggle.mutate(child.id)}
                      disabled={toggle.isPending}
                      className="text-ink-3 hover:text-brand transition-colors disabled:opacity-40"
                    >
                      {child.is_active
                        ? <ToggleRight size={16} className="text-success" />
                        : <ToggleLeft  size={16} className="text-ink-3" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Toggle error */}
        {toggle.error && (
          <div className="bg-danger-bg border border-red-200 rounded-lg px-4 py-2 text-[12.5px] text-danger">
            {toggle.error?.response?.data?.message || 'Toggle failed.'}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
