import { useState } from 'react'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { FormField, Input, Textarea, Select } from '../../components/ui/FormField.jsx'
import { NoProfileGuard } from '../../features/profiles/components/NoProfileGuard.jsx'
import {
  useMyServices, useCreateService, useUpdateService, useDeleteService,
} from '../../features/profiles/hooks/useProfile.js'

const PRICING_TYPE_OPTIONS = [
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'STARTING_FROM', label: 'Starting From' },
  { value: 'HOURLY', label: 'Hourly Rate' },
  { value: 'NEGOTIABLE', label: 'Negotiable' },
  { value: 'CONTACT_FOR_PRICE', label: 'Contact for Price' },
]

const AVAILABILITY_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
  { value: 'BY_APPOINTMENT', label: 'By Appointment' },
]

const AVAILABILITY_BADGE = {
  AVAILABLE: 'success',
  UNAVAILABLE: 'danger',
  BY_APPOINTMENT: 'warning',
}

const emptyForm = {
  title: '', description: '', price_from: '', currency: 'ETB',
  pricing_type: 'CONTACT_FOR_PRICE', location: '',
  availability: 'AVAILABLE', tags: '',
  is_featured: false, is_published: false,
}

function ServiceForm({ initial = emptyForm, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial)

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      price_from: form.price_from ? parseFloat(form.price_from) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      location: form.location || null,
      description: form.description || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Service Title" required>
        <Input value={form.title} onChange={set('title')} placeholder="e.g. Web Development" required />
      </FormField>

      <FormField label="Description">
        <Textarea value={form.description} onChange={set('description')} rows={3}
          placeholder="Describe what this service includes..." />
      </FormField>

      <div className="grid sm:grid-cols-3 gap-4">
        <FormField label="Starting Price">
          <Input value={form.price_from} onChange={set('price_from')} type="number" min="0" step="0.01" placeholder="0.00" />
        </FormField>
        <FormField label="Currency">
          <Select value={form.currency} onChange={set('currency')}>
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </Select>
        </FormField>
        <FormField label="Pricing Type">
          <Select value={form.pricing_type} onChange={set('pricing_type')}>
            {PRICING_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Service Location" hint="e.g. Gondar, Remote, On-site">
          <Input value={form.location} onChange={set('location')} placeholder="Gondar / Remote" />
        </FormField>
        <FormField label="Availability">
          <Select value={form.availability} onChange={set('availability')}>
            {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
      </div>

      <FormField label="Tags" hint="Comma-separated, e.g. web, react, design">
        <Input value={form.tags} onChange={set('tags')} placeholder="web, react, design" />
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
        <Button type="submit" variant="primary" loading={loading}>Save service</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function ServicesPage() {
  const { data, isLoading, error } = useMyServices()
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const services = data?.services || []

  const handleCreate = async (payload) => {
    try {
      await createMutation.mutateAsync(payload)
      setShowForm(false)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create service')
    }
  }

  const handleUpdate = async (id, payload) => {
    try {
      await updateMutation.mutateAsync({ id, data: payload })
      setEditingId(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update service')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete service')
    }
  }

  if (isLoading) return (
    <DashboardLayout title="Services">
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    </DashboardLayout>
  )

  if (error) return (
    <DashboardLayout title="Services">
      <NoProfileGuard><></></NoProfileGuard>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Services">
      <NoProfileGuard>
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-3">{services.length} service{services.length !== 1 ? 's' : ''}</p>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add service
            </Button>
          )}
        </div>

        {showForm && (
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-[14px] font-semibold text-ink mb-4">New service</h3>
            <ServiceForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {services.length === 0 && !showForm ? (
          <div className="bg-surface border border-border rounded-lg p-10 text-center">
            <Wrench size={32} className="mx-auto text-ink-3 mb-3" />
            <p className="text-[14px] font-semibold text-ink mb-1">No services yet</p>
            <p className="text-[13px] text-ink-3 mb-4">Add the services you offer to showcase on your profile.</p>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add your first service
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.id}>
                {editingId === service.id ? (
                  <div className="bg-surface border border-brand rounded-lg p-5">
                    <h3 className="text-[14px] font-semibold text-ink mb-4">Edit service</h3>
                    <ServiceForm
                      initial={{
                        title: service.title || '',
                        description: service.description || '',
                        price_from: service.price_from || '',
                        currency: service.currency || 'ETB',
                        pricing_type: service.pricing_type || 'CONTACT_FOR_PRICE',
                        location: service.location || '',
                        availability: service.availability || 'AVAILABLE',
                        tags: (service.tags || []).join(', '),
                        is_featured: service.is_featured || false,
                        is_published: service.is_published || false,
                      }}
                      onSave={(payload) => handleUpdate(service.id, payload)}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-brand-light flex items-center justify-center shrink-0">
                      <Wrench size={16} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-ink truncate">{service.title}</span>
                        <Badge variant={AVAILABILITY_BADGE[service.availability] || 'default'} size="xs">
                          {service.availability?.replace(/_/g, ' ')}
                        </Badge>
                        {!service.is_published && <Badge variant="default" size="xs">Draft</Badge>}
                      </div>
                      {service.price_from && (
                        <p className="text-[12.5px] text-ink-3 mt-0.5">
                          {service.pricing_type === 'STARTING_FROM' ? 'From ' : ''}
                          {service.price_from.toLocaleString()} {service.currency}
                          {service.location && ` · ${service.location}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingId(service.id)}
                        className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 rounded transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(service.id)}
                        className="p-1.5 text-ink-3 hover:text-danger hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {deleteConfirm === service.id && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-3 -mt-px">
                    <p className="text-[13px] text-danger font-medium">Delete &ldquo;{service.title}&rdquo;?</p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="xs" onClick={() => handleDelete(service.id)}
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
