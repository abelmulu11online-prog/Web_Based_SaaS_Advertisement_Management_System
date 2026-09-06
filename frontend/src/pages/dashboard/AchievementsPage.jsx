import { useState } from 'react'
import { Plus, Pencil, Trash2, Award, ExternalLink } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { FormField, Input, Textarea } from '../../components/ui/FormField.jsx'
import { NoProfileGuard } from '../../features/profiles/components/NoProfileGuard.jsx'
import {
  useMyAchievements, useCreateAchievement, useUpdateAchievement, useDeleteAchievement,
} from '../../features/profiles/hooks/useProfile.js'

const emptyForm = {
  title: '', description: '', date: '', organization: '',
  certificate_url: '', external_link: '', is_published: false,
}

function AchievementForm({ initial = emptyForm, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial)

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      description: form.description || null,
      date: form.date || null,
      organization: form.organization || null,
      certificate_url: form.certificate_url || null,
      external_link: form.external_link || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Achievement Title" required>
        <Input value={form.title} onChange={set('title')} placeholder="e.g. AWS Certified Solutions Architect" required />
      </FormField>

      <FormField label="Description">
        <Textarea value={form.description} onChange={set('description')} rows={3}
          placeholder="Describe this achievement..." />
      </FormField>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Date">
          <Input value={form.date} onChange={set('date')} type="date" />
        </FormField>
        <FormField label="Issuing Organization">
          <Input value={form.organization} onChange={set('organization')} placeholder="e.g. Amazon Web Services" />
        </FormField>
        <FormField label="Certificate URL">
          <Input value={form.certificate_url} onChange={set('certificate_url')} placeholder="https://..." type="url" />
        </FormField>
        <FormField label="External Link">
          <Input value={form.external_link} onChange={set('external_link')} placeholder="https://..." type="url" />
        </FormField>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
        <input type="checkbox" checked={form.is_published} onChange={set('is_published')}
          className="w-4 h-4 rounded accent-brand" />
        Published
      </label>

      <div className="flex gap-3 pt-1">
        <Button type="submit" variant="primary" loading={loading}>Save achievement</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function AchievementsPage() {
  const { data: achievements, isLoading, error } = useMyAchievements()
  const createMutation = useCreateAchievement()
  const updateMutation = useUpdateAchievement()
  const deleteMutation = useDeleteAchievement()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const items = achievements || []

  const handleCreate = async (payload) => {
    try {
      await createMutation.mutateAsync(payload)
      setShowForm(false)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create achievement')
    }
  }

  const handleUpdate = async (id, payload) => {
    try {
      await updateMutation.mutateAsync({ id, data: payload })
      setEditingId(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update achievement')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete achievement')
    }
  }

  if (isLoading) return (
    <DashboardLayout title="Achievements">
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    </DashboardLayout>
  )

  if (error) return (
    <DashboardLayout title="Achievements">
      <NoProfileGuard><></></NoProfileGuard>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Achievements">
      <NoProfileGuard>
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-3">{items.length} achievement{items.length !== 1 ? 's' : ''}</p>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add achievement
            </Button>
          )}
        </div>

        {showForm && (
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-[14px] font-semibold text-ink mb-4">New achievement</h3>
            <AchievementForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {items.length === 0 && !showForm ? (
          <div className="bg-surface border border-border rounded-lg p-10 text-center">
            <Award size={32} className="mx-auto text-ink-3 mb-3" />
            <p className="text-[14px] font-semibold text-ink mb-1">No achievements yet</p>
            <p className="text-[13px] text-ink-3 mb-4">Showcase your certifications, awards, and accomplishments.</p>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add your first achievement
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  <div className="bg-surface border border-brand rounded-lg p-5">
                    <h3 className="text-[14px] font-semibold text-ink mb-4">Edit achievement</h3>
                    <AchievementForm
                      initial={{
                        title: item.title || '',
                        description: item.description || '',
                        date: item.date ? item.date.split('T')[0] : '',
                        organization: item.organization || '',
                        certificate_url: item.certificate_url || '',
                        external_link: item.external_link || '',
                        is_published: item.is_published || false,
                      }}
                      onSave={(payload) => handleUpdate(item.id, payload)}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Award size={18} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[13.5px] font-semibold text-ink">{item.title}</span>
                        {!item.is_published && <Badge variant="default" size="xs">Draft</Badge>}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {item.organization && <p className="text-[12.5px] text-ink-3">{item.organization}</p>}
                        {item.date && (
                          <p className="text-[12.5px] text-ink-3">
                            {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {item.certificate_url && (
                          <a href={item.certificate_url} target="_blank" rel="noreferrer"
                            className="text-[12.5px] text-brand flex items-center gap-0.5 hover:underline">
                            <ExternalLink size={11} />Certificate
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
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
      </NoProfileGuard>
    </DashboardLayout>
  )
}
