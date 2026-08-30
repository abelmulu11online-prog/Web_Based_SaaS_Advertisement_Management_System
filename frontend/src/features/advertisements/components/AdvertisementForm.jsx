/**
 * AdvertisementForm — reusable form for creating and editing advertisements.
 * Used by CreateAdPage (via the multi-step wrapper) and EditAdPage directly.
 */
import { FormField, Input, Textarea, Select } from '../../../components/ui/FormField.jsx'
import { Button } from '../../../components/ui/Button.jsx'
import { useCategories } from '../hooks/useAdvertisements.js'
import { PRICE_TYPES } from '../../../constants/index.js'

function validate(data) {
  const e = {}
  if (!data.title?.trim() || data.title.length < 3)   e.title = 'Title must be at least 3 characters.'
  if (data.title?.length > 200)                        e.title = 'Max 200 characters.'
  if (!data.description?.trim() || data.description.length < 10) e.description = 'Description must be at least 10 characters.'
  if (data.description?.length > 5000)                 e.description = 'Max 5000 characters.'
  if (data.price && isNaN(Number(data.price)))         e.price = 'Price must be a number.'
  if (data.price && Number(data.price) < 0)            e.price = 'Price cannot be negative.'
  if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
    e.contact_email = 'Invalid email.'
  }
  return e
}

export function AdvertisementForm({ form, onChange, onSubmit, isLoading, errors = {}, submitLabel = 'Save' }) {
  const { data: catData } = useCategories()
  const categories = Array.isArray(catData) ? catData : (catData?.categories || [])

  function set(k, v) { onChange({ ...form, [k]: v }) }

  const showPrice = form.price_type === 'FIXED' || form.price_type === 'NEGOTIABLE'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>

      {/* Basic info */}
      <section className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest">Basic information</h3>

        <FormField label="Title" required error={errors.title} hint="Be specific — good titles get more views.">
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. iPhone 14 Pro — excellent condition" error={errors.title} maxLength={200} />
        </FormField>

        <FormField label="Category">
          <Select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>

        <FormField label="Description" required error={errors.description}>
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Describe what you're offering, condition, specifications…" error={errors.description} maxLength={5000} />
          <span className="text-[11px] text-ink-3 text-right">{(form.description || '').length}/5000</span>
        </FormField>
      </section>

      {/* Pricing */}
      <section className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest">Pricing</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Price type">
            <Select value={form.price_type} onChange={e => set('price_type', e.target.value)}>
              {PRICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </FormField>
          {showPrice && (
            <FormField label="Price (ETB)" error={errors.price}>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" error={errors.price} />
            </FormField>
          )}
        </div>
      </section>

      {/* Location */}
      <section className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest">Location</h3>
        <FormField label="Address / Area" hint="e.g. Bole, Addis Ababa">
          <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="City or neighbourhood" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Latitude" hint="Optional GPS">
            <Input type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="9.0054" />
          </FormField>
          <FormField label="Longitude" hint="Optional GPS">
            <Input type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="38.7636" />
          </FormField>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-[13px] font-semibold text-ink-3 uppercase tracking-widest">Contact information</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Phone" error={errors.contact_phone}>
            <Input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+251 9XX XXX XXX" />
          </FormField>
          <FormField label="Email" error={errors.contact_email}>
            <Input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="contact@example.com" error={errors.contact_email} />
          </FormField>
        </div>
      </section>

      {errors.submit && (
        <div className="bg-danger-bg border border-red-200 rounded px-3.5 py-2.5 text-[13px] text-danger">
          {errors.submit}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={isLoading}>{submitLabel}</Button>
      </div>
    </form>
  )
}
