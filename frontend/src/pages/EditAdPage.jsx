import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input, Textarea, Select } from '../components/ui/FormField.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { ImageUploader } from '../features/advertisements/components/ImageUploader.jsx'
import { LocationPicker } from '../features/locations/components/LocationPicker.jsx'
import {
  useMyAdvertisement, useCategories, useCategoriesFlat, useUpdateAdvertisement,
  usePublishAdvertisement, usePauseAdvertisement, useArchiveAdvertisement,
  useDeleteAdvertisement, useDeleteAdvertisementImage,
} from '../features/advertisements/hooks/useAdvertisements.js'
import * as adsService from '../services/advertisements.service.js'

const PRICE_TYPES = [
  { value: 'FIXED',           label: 'Fixed price' },
  { value: 'NEGOTIABLE',      label: 'Negotiable' },
  { value: 'FREE',            label: 'Free' },
  { value: 'CONTACT_FOR_PRICE', label: 'Contact for price' },
]

const STATUS_BADGE = {
  PUBLISHED: <Badge variant="success" dot>Published</Badge>,
  DRAFT:     <Badge variant="default" dot>Draft</Badge>,
  PAUSED:    <Badge variant="warning" dot>Paused</Badge>,
  EXPIRED:   <Badge variant="danger"  dot>Expired</Badge>,
  ARCHIVED:  <Badge variant="default" dot>Archived</Badge>,
}

export default function EditAdPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm]               = useState(null)
  const [errors, setErrors]           = useState({})
  const [saved, setSaved]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newFiles, setNewFiles]       = useState([])    // File[] pending upload
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')

  const { data: ad, isLoading }  = useMyAdvertisement(id)
  const { data: categoriesData } = useCategoriesFlat()
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  const updateAd      = useUpdateAdvertisement(id)
  const publishAd     = usePublishAdvertisement()
  const pauseAd       = usePauseAdvertisement()
  const archiveAd     = useArchiveAdvertisement()
  const deleteAd      = useDeleteAdvertisement()
  const deleteImg     = useDeleteAdvertisementImage(id)

  useEffect(() => {
    if (ad && !form) {
      setForm({
        title:         ad.title || '',
        description:   ad.description || '',
        category_id:   ad.category_id || '',
        price:         ad.price?.toString() || '',
        price_type:    ad.price_type || 'FIXED',
        address:       ad.address || '',
        latitude:      ad.latitude != null ? ad.latitude : null,
        longitude:     ad.longitude != null ? ad.longitude : null,
        contact_phone: ad.contact_phone || '',
        contact_email: ad.contact_email || '',
      })
    }
  }, [ad])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    const e2 = {}
    if (!form.title?.trim())       e2.title       = 'Title is required.'
    if (!form.description?.trim()) e2.description = 'Description is required.'
    if (Object.keys(e2).length) { setErrors(e2); return }

    try {
      // Only send fields with real values — Zod expects numbers not empty strings
      const data = {
        title:       form.title,
        description: form.description,
        price_type:  form.price_type,
      }

      if (form.category_id) data.category_id = form.category_id

      const priceVal = parseFloat(form.price)
      if (form.price && !isNaN(priceVal) &&
          form.price_type !== 'FREE' && form.price_type !== 'CONTACT_FOR_PRICE') {
        data.price = priceVal
      }

      if (form.address?.trim())       data.address       = form.address.trim()
      if (form.contact_phone?.trim()) data.contact_phone = form.contact_phone.trim()
      if (form.contact_email?.trim()) data.contact_email = form.contact_email.trim()

      // Location coordinates
      if (form.latitude != null)  data.latitude  = form.latitude
      if (form.longitude != null) data.longitude = form.longitude

      await updateAd.mutateAsync(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      const apiData = err?.response?.data
      let msg = apiData?.message || 'Save failed.'
      if (apiData?.error?.issues?.length) {
        msg = apiData.error.issues.map(i => `${i.path || 'field'}: ${i.message}`).join(' · ')
      }
      setErrors({ submit: msg })
    }
  }

  async function handleUploadNew() {
    if (!newFiles.length) return
    setUploading(true)
    setUploadError('')
    try {
      await adsService.uploadAdvertisementImages(id, newFiles)
      setNewFiles([])
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    await deleteAd.mutateAsync(id)
    navigate('/dashboard', { replace: true })
  }

  const existingImages = ad?.images || []
  const maxImages      = 5
  const canUpload      = newFiles.length > 0

  if (!isLoading && !ad) return (
    <DashboardLayout title="Edit Listing">
      <div className="text-center py-16">
        <p className="text-ink-2 mb-4">Listing not found.</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Edit Listing">
      <div className="max-w-xl mx-auto flex flex-col gap-6">

        {/* Status bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {isLoading
              ? <Skeleton className="h-4 w-48" />
              : <h2 className="text-[14px] font-semibold text-ink line-clamp-1">{ad?.title}</h2>
            }
            {!isLoading && STATUS_BADGE[ad?.status]}
          </div>

          {!isLoading && (
            <div className="flex items-center gap-2 flex-wrap">
              {(ad?.status === 'DRAFT' || ad?.status === 'PAUSED') && (
                <Button variant="primary" size="xs" loading={publishAd.isPending} onClick={() => publishAd.mutate(id)}>
                  Publish
                </Button>
              )}
              {ad?.status === 'PUBLISHED' && (
                <Button variant="secondary" size="xs" loading={pauseAd.isPending} onClick={() => pauseAd.mutate(id)}>
                  Pause
                </Button>
              )}
              {ad?.status !== 'ARCHIVED' && (
                <Button variant="ghost" size="xs" loading={archiveAd.isPending} onClick={() => archiveAd.mutate(id)}>
                  Archive
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Photo section ────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest">Photos</h3>

          {isLoading ? (
            <div className="grid grid-cols-5 gap-2">
              {[1,2,3].map(i => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : (
            <>
              <ImageUploader
                files={newFiles}
                onChange={setNewFiles}
                maxImages={maxImages}
                existingImages={existingImages}
                onDeleteExisting={(imgId) => deleteImg.mutate(imgId)}
                error={uploadError}
              />

              {canUpload && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={uploading}
                  onClick={handleUploadNew}
                >
                  Upload {newFiles.length} photo{newFiles.length !== 1 ? 's' : ''}
                </Button>
              )}
            </>
          )}
        </div>

        {/* ── Details form ─────────────────────────────────────────── */}
        {isLoading || !form ? (
          <div className="flex flex-col gap-4">
            {[80, 120, 200, 80].map((h, i) => (
              <Skeleton key={i} className="rounded-lg" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            <FormField label="Title" required error={errors.title}>
              <Input value={form.title} onChange={e => setField('title', e.target.value)} error={errors.title} />
            </FormField>

            <FormField label="Description" required error={errors.description}>
              <Textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={5} error={errors.description} />
            </FormField>

            <FormField label="Category">
              <Select value={form.category_id} onChange={e => setField('category_id', e.target.value)}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Price type">
                <Select value={form.price_type} onChange={e => setField('price_type', e.target.value)}>
                  {PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </FormField>
              {form.price_type !== 'FREE' && form.price_type !== 'CONTACT_FOR_PRICE' && (
                <FormField label="Price (ETB)">
                  <Input type="number" min="0" value={form.price} onChange={e => setField('price', e.target.value)} />
                </FormField>
              )}
            </div>

            <FormField label="Address / Area">
              <Input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="e.g. Bole, Addis Ababa" />
            </FormField>

            {/* Location map picker */}
            <div>
              <p className="text-[12px] font-medium text-ink mb-2">Location on map</p>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                address={form.address}
                onChange={({ latitude, longitude, address }) => {
                  setForm(f => ({ ...f, latitude, longitude, address: address || f.address }))
                  setSaved(false)
                }}
                height="240px"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone">
                <Input type="tel" value={form.contact_phone} onChange={e => setField('contact_phone', e.target.value)} />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={form.contact_email} onChange={e => setField('contact_email', e.target.value)} />
              </FormField>
            </div>

            {errors.submit && <p className="text-[13px] text-danger">{errors.submit}</p>}

            <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                Delete listing
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={updateAd.isPending}>
                {saved ? '✓ Saved' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-ink mb-2">Delete this listing?</h3>
            <p className="text-[13px] text-ink-2 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={deleteAd.isPending} onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
