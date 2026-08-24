/**
 * AdvertisementForm — multi-section form for creating and editing advertisements.
 * Used by both CreateAdPage and EditAdPage.
 */
import { useState } from 'react'
import { FormField, Input, Textarea, Select } from '../../../components/ui/FormField.jsx'
import { Button } from '../../../components/ui/Button.jsx'
import { useCategories } from '../hooks/useAdvertisements.js'

const PRICE_TYPES = [
  { value: 'FIXED', label: 'Fixed price' },
  { value: 'NEGOTIABLE', label: 'Negotiable' },
  { value: 'CONTACT_FOR_PRICE', label: 'Contact for price' },
  { value: 'FREE', label: 'Free' },
]

function validate(data) {
  const errors = {}
  if (!data.title || data.title.length < 3) errors.title = 'Title must be at least 3 characters'
  if (data.title && data.title.length > 200) errors.title = 'Title must not exceed 200 characters'
  if (!data.description || data.description.length < 10) errors.description = 'Description must be at least 10 characters'
  if (data.description && data.description.length > 5000) errors.description = 'Description must not exceed 5000 characters'
  if (data.price !== '' && data.price !== undefined && data.price !== null) {
    const p = Number(data.price)
    if (isNaN(p) || p < 0) errors.price = 'Price must be 0 or greater'
  }
  if (data.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email)) {
    errors.contact_email = 'Invalid email format'
  }
  if (data.latitude !== '' && data.latitude !== undefined && data.latitude !== null) {
    const lat = Number(data.latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude must be between -90 and 90'
  }
  if (data.longitude !== '' && data.longitude !== undefined && data.longitude !== null) {
    const lng = Number(data.longitude)
    if (isNaN(lng) || lng < -180 || lng > 180) errors.longitude = 'Longitude must be between -180 and 180'
  }
  return errors
}

export function AdvertisementForm({ initialValues = {}, onSubmit, isLoading, submitLabel = 'Save' }) {
  const { data: categories } = useCategories()

  const [form, setForm] = useState({
    title: initialValues.title || '',
    description: initialValues.description || '',
    category_id: initialValues.category_id || '',
    price: initialValues.price !== null && initialValues.price !== undefined ? String(initialValues.price) : '',
    price_type: initialValues.price_type || 'FIXED',
    contact_phone: initialValues.contact_phone || '',
    contact_email: initialValues.contact_email || '',
    latitude: initialValues.latitude !== null && initialValues.latitude !== undefined ? String(initialValues.latitude) : '',
    longitude: initialValues.longitude !== null && initialValues.longitude !== undefined ? String(initialValues.longitude) : '',
    address: initialValues.address || '',
  })

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerError('')

    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    // Build payload — omit empty optional fields
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
    }
    if (form.category_id) payload.category_id = form.category_id
    if (form.price !== '' && form.price_type !== 'FREE' && form.price_type !== 'CONTACT_FOR_PRICE') {
      payload.price = Number(form.price)
    }
    payload.price_type = form.price_type
    if (form.contact_phone.trim()) payload.contact_phone = form.contact_phone.trim()
    if (form.contact_email.trim()) payload.contact_email = form.contact_email.trim().toLowerCase()
    if (form.latitude !== '') payload.latitude = Number(form.latitude)
    if (form.longitude !== '') payload.longitude = Number(form.longitude)
    if (form.address.trim()) payload.address = form.address.trim()

    try {
      await onSubmit(payload)
    } catch (err) {
      const apiError = err?.response?.data
      if (apiError?.error?.issues) {
        const fieldErrors = {}
        apiError.error.issues.forEach((issue) => {
          const key = issue.path.replace('body.', '')
          fieldErrors[key] = issue.message
        })
        setErrors(fieldErrors)
      } else {
        setServerError(apiError?.message || 'Something went wrong. Please try again.')
      }
    }
  }

  const sectionHeader = (title) => (
    <h3
      style={{
        margin: '0 0 16px',
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--text-h)',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {title}
    </h3>
  )

  const card = (children) => (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        background: 'var(--bg)',
      }}
    >
      {children}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {serverError && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px',
          }}
        >
          {serverError}
        </div>
      )}

      {/* Basic information */}
      {card(
        <>
          {sectionHeader('Basic Information')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FormField label="Title" required error={errors.title}>
              <Input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="What are you advertising?"
                error={errors.title}
                maxLength={200}
              />
            </FormField>

            <FormField label="Category" error={errors.category_id}>
              <Select
                value={form.category_id}
                onChange={(e) => update('category_id', e.target.value)}
                error={errors.category_id}
              >
                <option value="">Select a category…</option>
                {Array.isArray(categories) && categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Description" required error={errors.description}>
              <Textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe what you are offering in detail…"
                rows={6}
                error={errors.description}
                maxLength={5000}
              />
              <span style={{ fontSize: '12px', color: 'var(--text)', textAlign: 'right' }}>
                {form.description.length}/5000
              </span>
            </FormField>
          </div>
        </>
      )}

      {/* Pricing */}
      {card(
        <>
          {sectionHeader('Pricing')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Price type" error={errors.price_type}>
              <Select
                value={form.price_type}
                onChange={(e) => update('price_type', e.target.value)}
              >
                {PRICE_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </Select>
            </FormField>

            {['FIXED', 'NEGOTIABLE'].includes(form.price_type) && (
              <FormField label="Price" error={errors.price} hint="Leave empty to omit price">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder="0.00"
                  error={errors.price}
                />
              </FormField>
            )}
          </div>
        </>
      )}

      {/* Contact */}
      {card(
        <>
          {sectionHeader('Contact Information')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField label="Phone number" error={errors.contact_phone}>
              <Input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => update('contact_phone', e.target.value)}
                placeholder="+1234567890"
                error={errors.contact_phone}
              />
            </FormField>

            <FormField label="Email" error={errors.contact_email}>
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => update('contact_email', e.target.value)}
                placeholder="contact@example.com"
                error={errors.contact_email}
              />
            </FormField>
          </div>
        </>
      )}

      {/* Location */}
      {card(
        <>
          {sectionHeader('Location')}
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text)' }}>
            Phase 7 will add an interactive map picker. For now, enter coordinates manually or just provide an address.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FormField label="Address / Location description" error={errors.address}>
              <Input
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="e.g., 123 Main St, Addis Ababa, Ethiopia"
                error={errors.address}
              />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="Latitude" error={errors.latitude} hint="e.g., 9.0054">
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => update('latitude', e.target.value)}
                  placeholder="9.0054"
                  error={errors.latitude}
                />
              </FormField>
              <FormField label="Longitude" error={errors.longitude} hint="e.g., 38.7636">
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => update('longitude', e.target.value)}
                  placeholder="38.7636"
                  error={errors.longitude}
                />
              </FormField>
            </div>
          </div>
        </>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button type="submit" variant="primary" size="lg" loading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
