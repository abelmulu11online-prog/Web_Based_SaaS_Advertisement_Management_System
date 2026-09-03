import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { DashboardLayout } from '../components/layout/DashboardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input, Textarea, Select } from '../components/ui/FormField.jsx'
import { ImageUploader } from '../features/advertisements/components/ImageUploader.jsx'
import { LocationPicker } from '../features/locations/components/LocationPicker.jsx'
import { useCreateAdvertisement, useCategoriesFlat } from '../features/advertisements/hooks/useAdvertisements.js'
import * as adsService from '../services/advertisements.service.js'
import { PRICE_TYPES } from '../constants/index.js'

const STEPS = ['Category', 'Details', 'Photos', 'Location', 'Contact', 'Review']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all ${
                done   ? 'bg-brand border-brand text-white' :
                active ? 'border-brand text-brand bg-surface' :
                         'border-border text-ink-3 bg-surface'
              }`}>
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap hidden sm:block font-medium ${
                active ? 'text-brand' : done ? 'text-ink-2' : 'text-ink-3'
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 transition-colors ${done ? 'bg-brand' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const EMPTY_FORM = {
  category_id: '',
  title: '',
  description: '',
  price: '',
  price_type: 'FIXED',
  address: '',
  latitude: '',
  longitude: '',
  contact_phone: '',
  contact_email: '',
}

export default function CreateAdPage() {
  const navigate    = useNavigate()
  const [step, setStep]           = useState(0)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [errors, setErrors]       = useState({})
  const [imageFiles, setImageFiles] = useState([])   // File[] — selected but not yet uploaded
  const [submitting, setSubmitting] = useState(false)

  const { data: catData, isLoading: catsLoading } = useCategoriesFlat()
  const categories = Array.isArray(catData) ? catData : []
  const createAd   = useCreateAdvertisement()

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  function validate() {
    const e = {}
    if (step === 0 && !form.category_id)             e.category_id  = 'Select a category.'
    if (step === 1 && !form.title?.trim())            e.title        = 'Title is required.'
    if (step === 1 && form.title?.length < 3)         e.title        = 'At least 3 characters.'
    if (step === 1 && !form.description?.trim())      e.description  = 'Description is required.'
    if (step === 1 && form.description?.length < 10) e.description  = 'At least 10 characters.'
    return e
  }

  function next() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setStep(s => Math.min(STEPS.length - 1, s + 1))
  }

  async function handleCreate() {
    setSubmitting(true)
    setErrors({})
    try {
      // 1. Create ad (DRAFT)
      // Only include fields that have real values — empty strings must be omitted
      // because the Zod schema expects numbers (not strings) for price/lat/lng
      const body = {
        title:       form.title,
        description: form.description,
        price_type:  form.price_type,
      }

      if (form.category_id) body.category_id = form.category_id

      const priceVal = parseFloat(form.price)
      if (form.price && !isNaN(priceVal) &&
          form.price_type !== 'FREE' && form.price_type !== 'CONTACT_FOR_PRICE') {
        body.price = priceVal
      }

      if (form.address?.trim()) body.address = form.address.trim()
      if (form.contact_phone?.trim()) body.contact_phone = form.contact_phone.trim()
      if (form.contact_email?.trim()) body.contact_email = form.contact_email.trim()

      const latVal = parseFloat(form.latitude)
      const lngVal = parseFloat(form.longitude)
      if (form.latitude && !isNaN(latVal)) body.latitude = latVal
      if (form.longitude && !isNaN(lngVal)) body.longitude = lngVal

      const ad = await createAd.mutateAsync(body)

      // 2. Upload images (if any selected)
      if (imageFiles.length > 0) {
        await adsService.uploadAdvertisementImages(ad.id, imageFiles)
      }

      navigate('/dashboard/advertisements', { replace: true })
    } catch (err) {
      // Show the detailed Zod issues if available
      const data = err?.response?.data
      let msg = data?.message || 'Failed to create listing. Please try again.'
      if (data?.error?.issues?.length) {
        msg = data.error.issues.map(i => `${i.path || 'field'}: ${i.message}`).join(' · ')
      }
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const showPrice = form.price_type === 'FIXED' || form.price_type === 'NEGOTIABLE'

  return (
    <DashboardLayout title="Post New Ad">
      <div className="max-w-xl mx-auto">
        <StepIndicator current={step} />

        {/* ── Step 0: Category ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-ink">Choose a category</h2>
            {catsLoading ? (
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg border border-border bg-surface-2 animate-pulse" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="py-10 text-center border border-border rounded-lg bg-surface">
                <p className="text-[13px] text-ink-3">No categories available. Please try again later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setField('category_id', cat.id)}
                    className={`text-left px-4 py-3 rounded-lg border text-[13.5px] font-medium transition-all ${
                      form.category_id === cat.id
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-border hover:border-border-2 text-ink-2 hover:text-ink'
                    }`}
                  >
                    {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            {errors.category_id && <p className="text-[12px] text-danger">{errors.category_id}</p>}
          </div>
        )}

        {/* ── Step 1: Details ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-ink">Basic information</h2>
            <FormField label="Title" required error={errors.title} hint="Be specific — good titles get more views.">
              <Input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="e.g. MacBook Pro 2022 — excellent condition"
                error={errors.title}
                autoFocus
              />
            </FormField>
            <FormField label="Description" required error={errors.description} hint="Min 10 characters. Describe condition, specs, what's included.">
              <Textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={5}
                placeholder="Describe what you're offering in detail…"
                error={errors.description}
              />
              <span className="text-[11px] text-ink-3 text-right">{form.description.length}/5000</span>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Price type">
                <Select value={form.price_type} onChange={e => setField('price_type', e.target.value)}>
                  {PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </FormField>
              {showPrice && (
                <FormField label="Price (ETB)">
                  <Input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={e => setField('price', e.target.value)}
                    placeholder="0"
                  />
                </FormField>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Photos ───────────────────────────────────────── */}
        {step === 2 && (
          <ImageUploader
            files={imageFiles}
            onChange={setImageFiles}
            maxImages={5}
          />
        )}

        {/* ── Step 3: Location ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-ink">Location</h2>
            <p className="text-[13px] text-ink-2">
              Pin your location on the map so customers know where you are.
              Click the map, search for an address, or use GPS.
            </p>
            <LocationPicker
              latitude={form.latitude !== '' ? parseFloat(form.latitude) : null}
              longitude={form.longitude !== '' ? parseFloat(form.longitude) : null}
              address={form.address}
              onChange={({ latitude, longitude, address }) => {
                setField('latitude', latitude != null ? latitude : '')
                setField('longitude', longitude != null ? longitude : '')
                setField('address', address || '')
              }}
              height="280px"
            />
            {/* Manual address override */}
            <FormField label="Address / Area" hint="Auto-filled from map — edit if needed.">
              <Input
                value={form.address}
                onChange={e => setField('address', e.target.value)}
                placeholder="City, neighbourhood, or full address"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 4: Contact ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-ink">Contact information</h2>
            <p className="text-[13px] text-ink-2">How should interested buyers reach you?</p>
            <FormField label="Phone number">
              <Input
                type="tel"
                value={form.contact_phone}
                onChange={e => setField('contact_phone', e.target.value)}
                placeholder="+251 9XX XXX XXX"
              />
            </FormField>
            <FormField label="Email address">
              <Input
                type="email"
                value={form.contact_email}
                onChange={e => setField('contact_email', e.target.value)}
                placeholder="contact@example.com"
              />
            </FormField>
          </div>
        )}

        {/* ── Step 5: Review ───────────────────────────────────────── */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-ink">Review your listing</h2>
            <div className="bg-surface border border-border rounded-xl divide-y divide-border">
              {[
                ['Title',    form.title || '—'],
                ['Category', categories.find(c => c.id === form.category_id)?.name || '—'],
                ['Price',    form.price_type === 'FIXED' ? `ETB ${form.price || 0}` : PRICE_TYPES.find(t => t.value === form.price_type)?.label || '—'],
                ['Location', form.address || '—'],
                ['Phone',    form.contact_phone || '—'],
                ['Email',    form.contact_email || '—'],
                ['Photos',   imageFiles.length > 0 ? `${imageFiles.length} photo${imageFiles.length !== 1 ? 's' : ''} selected` : 'No photos'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[12px] text-ink-3">{label}</span>
                  <span className="text-[13px] text-ink font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Photo thumbnails preview */}
            {imageFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imageFiles.map((f, i) => (
                  <img
                    key={i}
                    src={URL.createObjectURL(f)}
                    alt=""
                    className={`w-14 h-14 object-cover rounded-lg shrink-0 ${i === 0 ? 'ring-2 ring-brand' : ''}`}
                  />
                ))}
              </div>
            )}

            <div className="bg-brand-light border border-brand-border rounded-lg px-4 py-3 text-[12px] text-brand">
              Your listing will be created as a <strong>draft</strong>. You can publish it from My Listings.
            </div>
            {errors.submit && (
              <div className="bg-danger-bg border border-red-200 rounded px-3.5 py-2.5 text-[13px] text-danger">
                {errors.submit}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            icon={<ChevronLeft size={14} />}
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={next}
              iconRight={<ChevronRight size={14} />}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={handleCreate}
            >
              Create listing
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
