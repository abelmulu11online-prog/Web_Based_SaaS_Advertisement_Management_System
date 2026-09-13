import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Wrench, ImagePlus, X as XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { FormField, Input, Textarea, Select } from '../../components/ui/FormField.jsx'
import { NoProfileGuard } from '../../features/profiles/components/NoProfileGuard.jsx'
import {
  useMyServices, useCreateService, useUpdateService, useDeleteService, useMyProfile,
} from '../../features/profiles/hooks/useProfile.js'
import * as profilesApi from '../../services/profiles.service.js'

const PRICING_TYPE_VALUES  = ['FIXED','STARTING_FROM','HOURLY','NEGOTIABLE','CONTACT_FOR_PRICE']
const AVAILABILITY_VALUES  = ['AVAILABLE','UNAVAILABLE','BY_APPOINTMENT']

const AVAILABILITY_BADGE = {
  AVAILABLE:      'success',
  UNAVAILABLE:    'danger',
  BY_APPOINTMENT: 'warning',
}

function ServiceForm({ initial, onSave, onCancel, loading }) {
  const { t } = useTranslation()

  const emptyForm = {
    title: '', description: '', price_from: '', currency: 'ETB',
    pricing_type: 'CONTACT_FOR_PRICE', location: '',
    availability: 'AVAILABLE', tags: '',
    is_featured: false, is_published: false,
  }

  const [form, setForm] = useState(initial ?? emptyForm)

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      price_from:  form.price_from ? parseFloat(form.price_from) : null,
      tags:        form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      location:    form.location    || null,
      description: form.description || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label={t('profile.services.serviceTitleLabel')} required>
        <Input value={form.title} onChange={set('title')} placeholder={t('profile.services.serviceTitlePlaceholder')} required />
      </FormField>

      <FormField label={t('profile.services.descLabel')}>
        <Textarea value={form.description} onChange={set('description')} rows={3}
          placeholder={t('profile.services.descriptionPlaceholder')} />
      </FormField>

      <div className="grid sm:grid-cols-3 gap-4">
        <FormField label={t('profile.services.startingPrice')}>
          <Input value={form.price_from} onChange={set('price_from')} type="number" min="0" step="0.01" placeholder="0.00" />
        </FormField>
        <FormField label={t('profile.services.currency')}>
          <Select value={form.currency} onChange={set('currency')}>
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </Select>
        </FormField>
        <FormField label={t('profile.services.pricingTypeLabel')}>
          <Select value={form.pricing_type} onChange={set('pricing_type')}>
            {PRICING_TYPE_VALUES.map(v => (
              <option key={v} value={v}>{t(`profile.services.pricingType.${v}`)}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label={t('profile.services.serviceLocation')} hint={t('profile.services.serviceLocationHint')}>
          <Input value={form.location} onChange={set('location')} placeholder={t('profile.services.serviceLocationPlaceholder')} />
        </FormField>
        <FormField label={t('profile.services.availabilityLabel')}>
          <Select value={form.availability} onChange={set('availability')}>
            {AVAILABILITY_VALUES.map(v => (
              <option key={v} value={v}>{t(`profile.services.availability.${v}`)}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label={t('profile.services.tagsLabel')} hint={t('profile.services.tagsHint')}>
        <Input value={form.tags} onChange={set('tags')} placeholder={t('profile.services.tagsPlaceholder')} />
      </FormField>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_published} onChange={set('is_published')}
            className="w-4 h-4 rounded accent-brand" />
          {t('profile.services.published')}
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')}
            className="w-4 h-4 rounded accent-brand" />
          {t('profile.services.featured')}
        </label>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" variant="primary" loading={loading}>{t('profile.services.saveService')}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  )
}

function ServiceImageUpload({ serviceId, images = [], onUploaded, onDeleted }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      await profilesApi.uploadServiceImages(serviceId, files)
      onUploaded?.()
    } catch (err) {
      alert(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="mt-3">
      <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">Photos</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map(img => (
          <div key={img.id} className="relative group">
            <img
              src={img.image_url}
              alt=""
              className="w-20 h-20 object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={() => onDeleted?.(img.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XIcon size={10} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-ink-3 hover:border-brand hover:text-brand transition-colors"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ImagePlus size={18} />
              <span className="text-[10px] mt-1">Add photo</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}

export default function ServicesPage() {
  const { data, isLoading, error } = useMyServices()
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()
  const { data: myProfile } = useMyProfile()
  const qc = useQueryClient()

  // Build a default location string from the user's profile
  const defaultLocation = [myProfile?.area, myProfile?.city].filter(Boolean).join(', ') || ''

  // Default form with location pre-filled from profile
  const defaultForm = {
    title: '', description: '', price_from: '', currency: 'ETB',
    pricing_type: 'CONTACT_FOR_PRICE',
    location: defaultLocation,
    availability: 'AVAILABLE', tags: '',
    is_featured: false, is_published: false,
  }

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeImageServiceId, setActiveImageServiceId] = useState(null)

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
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-[14px] font-semibold text-ink mb-4">New service</h3>
            <ServiceForm
              initial={defaultForm}
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
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    {service.primary_image && (
                      <div className="h-32 bg-surface-2 overflow-hidden">
                        <img
                          src={service.primary_image.image_url}
                          alt={service.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
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
                        <button
                          type="button"
                          onClick={() => setActiveImageServiceId(activeImageServiceId === service.id ? null : service.id)}
                          className="p-1.5 text-ink-3 hover:text-brand hover:bg-brand-light rounded transition-colors"
                          title="Add photos"
                        >
                          <ImagePlus size={14} />
                        </button>
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
                  </div>
                )}

                {activeImageServiceId === service.id && (
                  <div className="bg-surface-2 border border-brand border-t-0 rounded-b-xl px-4 pb-4">
                    <ServiceImageUpload
                      serviceId={service.id}
                      images={service.primary_image ? [service.primary_image] : []}
                      onUploaded={() => {
                        qc.invalidateQueries({ queryKey: ['profile', 'services'] })
                      }}
                      onDeleted={async (imageId) => {
                        try {
                          await profilesApi.deleteServiceImage(service.id, imageId)
                          qc.invalidateQueries({ queryKey: ['profile', 'services'] })
                        } catch (e) {
                          alert('Failed to delete image')
                        }
                      }}
                    />
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
