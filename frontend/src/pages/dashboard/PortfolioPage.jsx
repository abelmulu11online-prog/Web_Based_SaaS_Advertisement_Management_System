import { useState } from 'react'
import { Plus, Pencil, Trash2, FolderOpen, ExternalLink } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { FormField, Input, Textarea } from '../../components/ui/FormField.jsx'
import {
  useMyPortfolio, useCreatePortfolioItem, useUpdatePortfolioItem, useDeletePortfolioItem,
} from '../../features/profiles/hooks/useProfile.js'

const emptyForm = {
  title: '', description: '', category: '', client: '',
  project_url: '', completion_date: '', tags: '',
  is_featured: false, is_published: false,
}

function PortfolioForm({ initial = emptyForm, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial)

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      client: form.client || null,
      project_url: form.project_url || null,
      completion_date: form.completion_date || null,
      category: form.category || null,
      description: form.description || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Project Title" required>
        <Input value={form.title} onChange={set('title')} placeholder="e.g. E-Commerce Website" required />
      </FormField>

      <FormField label="Description">
        <Textarea value={form.description} onChange={set('description')} rows={3}
          placeholder="Describe this project..." />
      </FormField>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Category">
          <Input value={form.category} onChange={set('category')} placeholder="e.g. Web Development" />
        </FormField>
        <FormField label="Client">
          <Input value={form.client} onChange={set('client')} placeholder="e.g. ABC Company (optional)" />
        </FormField>
        <FormField label="Project URL">
          <Input value={form.project_url} onChange={set('project_url')} placeholder="https://project.com" type="url" />
        </FormField>
        <FormField label="Completion Date">
          <Input value={form.completion_date} onChange={set('completion_date')} type="date" />
        </FormField>
      </div>

      <FormField label="Tags" hint="Comma-separated">
        <Input value={form.tags} onChange={set('tags')} placeholder="react, web, ecommerce" />
      </FormField>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_published} onChange={set('is_published')}
            className="w-4 h-4 rounded accent-brand" />
          Published
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')}
            className="w-4 h-4 rounded accent-brand" />
          Featured
        </label>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" variant="primary" loading={loading}>Save item</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function PortfolioPage() {
  const { data, isLoading, error } = useMyPortfolio()
  const createMutation = useCreatePortfolioItem()
  const updateMutation = useUpdatePortfolioItem()
  const deleteMutation = useDeletePortfolioItem()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const items = data?.items || []

  const handleCreate = async (payload) => {
    try {
      await createMutation.mutateAsync(payload)
      setShowForm(false)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create portfolio item')
    }
  }

  const handleUpdate = async (id, payload) => {
    try {
      await updateMutation.mutateAsync({ id, data: payload })
      setEditingId(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update portfolio item')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete portfolio item')
    }
  }

  if (isLoading) return (
    <DashboardLayout title="Portfolio">
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    </DashboardLayout>
  )

  if (error) return (
    <DashboardLayout title="Portfolio">
      <p className="text-sm text-danger">Failed to load portfolio.</p>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Portfolio">
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-3">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add item
            </Button>
          )}
        </div>

        {showForm && (
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-[14px] font-semibold text-ink mb-4">New portfolio item</h3>
            <PortfolioForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {items.length === 0 && !showForm ? (
          <div className="bg-surface border border-border rounded-lg p-10 text-center">
            <FolderOpen size={32} className="mx-auto text-ink-3 mb-3" />
            <p className="text-[14px] font-semibold text-ink mb-1">No portfolio items yet</p>
            <p className="text-[13px] text-ink-3 mb-4">Showcase your work, projects, and completed assignments.</p>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add your first item
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  <div className="bg-surface border border-brand rounded-lg p-5">
                    <h3 className="text-[14px] font-semibold text-ink mb-4">Edit portfolio item</h3>
                    <PortfolioForm
                      initial={{
                        title: item.title || '',
                        description: item.description || '',
                        category: item.category || '',
                        client: item.client || '',
                        project_url: item.project_url || '',
                        completion_date: item.completion_date ? item.completion_date.split('T')[0] : '',
                        tags: (item.tags || []).join(', '),
                        is_featured: item.is_featured || false,
                        is_published: item.is_published || false,
                      }}
                      onSave={(payload) => handleUpdate(item.id, payload)}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-surface-2 flex items-center justify-center shrink-0">
                      {item.primary_image ? (
                        <img src={item.primary_image.image_url} alt={item.title} className="w-full h-full object-cover rounded" />
                      ) : (
                        <FolderOpen size={16} className="text-ink-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-ink truncate">{item.title}</span>
                        {item.category && <Badge variant="default" size="xs">{item.category}</Badge>}
                        {!item.is_published && <Badge variant="default" size="xs">Draft</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {item.client && <p className="text-[12.5px] text-ink-3">Client: {item.client}</p>}
                        {item.completion_date && (
                          <p className="text-[12.5px] text-ink-3">
                            {new Date(item.completion_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {item.project_url && (
                          <a href={item.project_url} target="_blank" rel="noreferrer"
                            className="text-[12.5px] text-brand flex items-center gap-0.5 hover:underline">
                            <ExternalLink size={11} />View
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingId(item.id)}
                        className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 rounded transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(item.id)}
                        className="p-1.5 text-ink-3 hover:text-danger hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {deleteConfirm === item.id && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-3 -mt-px">
                    <p className="text-[13px] text-danger font-medium">Delete &ldquo;{item.title}&rdquo;?</p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="xs" onClick={() => handleDelete(item.id)}
                        loading={deleteMutation.isPending}>Delete</Button>
                      <Button variant="ghost" size="xs" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
