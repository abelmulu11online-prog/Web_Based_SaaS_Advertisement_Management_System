import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Camera, CheckCircle, ExternalLink, X, Plus } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { FormField, Input, Textarea, Select } from '../../components/ui/FormField.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import {
  useMyProfile, useUpdateProfile, useCreateProfile, useProfileCompletion,
  useUploadAvatar, useUploadCover, useDeleteAvatar, useDeleteCover,
} from '../../features/profiles/hooks/useProfile.js'
import * as profilesApi from '../../services/profiles.service.js'
import { useCategories } from '../../features/profiles/hooks/useCategories.js'
import { LocationPicker } from '../../features/locations/components/LocationPicker.jsx'

const PROFILE_TYPES = [
  { value: 'PERSONAL',      label: 'Personal — individual / personal' },
  { value: 'PROFESSIONAL',  label: 'Professional — expert / specialist' },
  { value: 'FREELANCER',    label: 'Freelancer — independent contractor' },
  { value: 'SHOP',          label: 'Shop — retail / products' },
  { value: 'BUSINESS',      label: 'Business — company / enterprise' },
  { value: 'COMPANY',       label: 'Company — registered company' },
  { value: 'ORGANIZATION',  label: 'Organization — NGO / association' },
]

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC',    label: 'Public — visible to everyone' },
  { value: 'LOGGED_IN', label: 'Logged-in users only' },
  { value: 'HIDDEN',    label: 'Hidden' },
]

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

const emptyForm = {
  display_name: '', slug: '', profile_type: 'PERSONAL', headline: '', description: '',
  contact_phone: '', contact_email: '', website_url: '', whatsapp: '', telegram_username: '',
  country: '', region: '', city: '', area: '', address_line: '',
  phone_visibility: 'PUBLIC', email_visibility: 'PUBLIC', is_published: false,
}

// ── Create Profile Setup Screen ───────────────────────────────────────────────

function CreateProfileSetup({ onCreated }) {
  const createMutation = useCreateProfile()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ display_name: '', slug: '', profile_type: 'PERSONAL', category_id: '' })
  const [slugStatus, setSlugStatus] = useState(null)
  const [error, setError] = useState('')
  let slugTimer = null

  const set = (k) => (e) => {
    const val = e.target.value
    if (k === 'display_name') {
      setForm(f => {
        const next = { ...f, display_name: val }
        if (!f._slugEdited) {
          next.slug = slugify(val)
          checkSlug(next.slug)
        }
        return next
      })
    } else if (k === 'slug') {
      setForm(f => ({ ...f, slug: val, _slugEdited: true }))
      checkSlug(val)
    } else {
      setForm(f => ({ ...f, [k]: val }))
    }
  }

  const checkSlug = (val) => {
    clearTimeout(slugTimer)
    if (!val || val.length < 2) { setSlugStatus(null); return }
    setSlugStatus('checking')
    slugTimer = setTimeout(async () => {
      try {
        const r = await profilesApi.checkSlugAvailability(val)
        setSlugStatus(r.available ? 'available' : 'taken')
      } catch { setSlugStatus(null) }
    }, 400)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.display_name.trim() || !form.slug.trim()) return
    if (slugStatus === 'taken') { setError('That URL is already taken — choose a different one.'); return }
    setError('')
    try {
      await createMutation.mutateAsync({
        display_name: form.display_name.trim(),
        slug: form.slug.trim(),
        profile_type: form.profile_type,
        category_id: form.category_id || null,
        is_published: false,
      })
      onCreated?.()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create profile')
    }
  }

  const { data: categoriesData } = useCategories()

  // Flatten category tree into a grouped select list
  const categoryOptions = []
  if (Array.isArray(categoriesData)) {
    const roots = categoriesData.filter(c => !c.parent_id)
    const children = categoriesData.filter(c => c.parent_id)
    for (const root of roots) {
      categoryOptions.push({ value: root.id, label: `${root.icon || ''} ${root.name}`.trim(), isParent: true })
      const subs = children.filter(c => c.parent_id === root.id)
      for (const sub of subs) {
        categoryOptions.push({ value: sub.id, label: `  ${sub.icon || ''}  ${sub.name}`.trim(), isParent: false })
      }
    }
  }

  return (
    <DashboardLayout title="Set Up Your Profile">
      <div className="max-w-xl mx-auto">
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-[17px] font-bold text-ink">Create your public profile</h2>
            <p className="text-[13px] text-ink-3 mt-1">
              Your profile is your public page. People can discover and contact you through it.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <FormField label="What should we call you or your business?" required>
              <Input
                value={form.display_name}
                onChange={set('display_name')}
                placeholder="e.g. Gondar Electronics, Natnael Berhanu"
                required
                autoFocus
              />
            </FormField>

            <FormField
              label="Your public URL"
              hint={`Your profile will be at /@${form.slug || 'your-name'}`}
              error={slugStatus === 'taken' ? 'This URL is already taken' : ''}
            >
              <div className="flex items-center gap-0 border border-border-2 rounded overflow-hidden focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
                <span className="px-3 text-[13px] text-ink-3 bg-surface-2 border-r border-border-2 h-9 flex items-center shrink-0">/@</span>
                <input
                  value={form.slug}
                  onChange={(e) => set('slug')(e)}
                  placeholder="your-name"
                  className="flex-1 px-3 py-2 text-sm text-ink bg-surface outline-none h-9"
                />
                {slugStatus === 'available' && (
                  <span className="pr-3 text-green-500"><CheckCircle size={14} /></span>
                )}
              </div>
            </FormField>

            <FormField label="Profile type">
              <Select value={form.profile_type} onChange={set('profile_type')}>
                {PROFILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </FormField>

            <FormField label="Category" hint="How people will find you in the directory">
              <Select value={form.category_id || ''} onChange={set('category_id')}>
                <option value="">— Select a category —</option>
                {categoryOptions.map(opt => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={opt.isParent ? { fontWeight: 'bold' } : { paddingLeft: '16px' }}
                  >
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>

            {error && <p className="text-[13px] text-danger">{error}</p>}

            <Button type="submit" variant="primary" fullWidth loading={createMutation.isPending} size="lg">
              Create profile
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

// ── Main Edit Page ─────────────────────────────────────────────────────────────

export default function ProfileEditPage() {
  const { data: profile, isLoading } = useMyProfile()
  const { data: completion } = useProfileCompletion()
  const updateMutation = useUpdateProfile()
  const uploadAvatar   = useUploadAvatar()
  const uploadCover    = useUploadCover()
  const deleteAvatarMutation = useDeleteAvatar()
  const deleteCoverMutation  = useDeleteCover()
  const avatarRef = useRef()
  const coverRef  = useRef()

  const { data: categoriesData } = useCategories()

  // Flatten category tree into a grouped select list
  const categoryOptions = []
  if (Array.isArray(categoriesData)) {
    const roots = categoriesData.filter(c => !c.parent_id)
    const children = categoriesData.filter(c => c.parent_id)
    for (const root of roots) {
      categoryOptions.push({ value: root.id, label: `${root.icon || ''} ${root.name}`.trim(), isParent: true })
      const subs = children.filter(c => c.parent_id === root.id)
      for (const sub of subs) {
        categoryOptions.push({ value: sub.id, label: `  ${sub.icon || ''}  ${sub.name}`.trim(), isParent: false })
      }
    }
  }

  const [form, setForm] = useState(null)
  const [slugStatus, setSlugStatus] = useState(null)
  const [saved, setSaved]   = useState(false)
  const [errors, setErrors] = useState({})
  let slugTimer = null

  useEffect(() => {
    if (profile && !form) {
      setForm({
        display_name:      profile.display_name || '',
        slug:              profile.slug || '',
        profile_type:      profile.profile_type || 'PERSONAL',
        category_id:       profile.category_id || '',
        headline:          profile.headline || '',
        description:       profile.description || '',
        contact_phone:     profile.contact_phone || '',
        contact_email:     profile.contact_email || '',
        website_url:       profile.website_url || '',
        whatsapp:          profile.whatsapp || '',
        telegram_username: profile.telegram_username || '',
        country:           profile.country || '',
        region:            profile.region || '',
        city:              profile.city || '',
        area:              profile.area || '',
        address_line:      profile.address_line || '',
        latitude:          profile.latitude ?? null,
        longitude:         profile.longitude ?? null,
        location_precision: profile.location_precision || 'CITY',
        phone_visibility:  profile.phone_visibility || 'PUBLIC',
        email_visibility:  profile.email_visibility || 'PUBLIC',
        is_published:      profile.is_published ?? false,
      })
    }
  }, [profile, form])

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [key]: val }))
    if (key === 'slug') checkSlug(val)
  }

  const checkSlug = (val) => {
    clearTimeout(slugTimer)
    if (!val || val.length < 2 || val === profile?.slug) { setSlugStatus(null); return }
    setSlugStatus('checking')
    slugTimer = setTimeout(async () => {
      try {
        const r = await profilesApi.checkSlugAvailability(val)
        setSlugStatus(r.available ? 'available' : 'taken')
      } catch { setSlugStatus(null) }
    }, 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (slugStatus === 'taken') return
    setErrors({})
    try {
      // Build payload — send null for empty optional strings, strip internal state keys
      const payload = {}
      const optionalStrings = [
        'headline','description','contact_phone','contact_email','website_url',
        'whatsapp','telegram_username','country','region','city','area','address_line',
      ]
      // Keys to never send to the server
      const internalKeys = ['_slugEdited', '_slug_edited']
      // Keys handled separately below (typed as numbers, not strings)
      const separateKeys = ['latitude', 'longitude', 'location_precision']

      const nullableFields = [...optionalStrings, 'category_id']
      Object.keys(form).forEach(k => {
        if (internalKeys.includes(k)) return
        if (separateKeys.includes(k)) return
        if (nullableFields.includes(k)) {
          payload[k] = form[k] === '' ? null : form[k]
        } else {
          payload[k] = form[k]
        }
      })
      // Lat/lng — pass as numbers or null (not strings)
      if ('latitude' in form) payload.latitude = form.latitude === '' || form.latitude == null ? null : Number(form.latitude)
      if ('longitude' in form) payload.longitude = form.longitude === '' || form.longitude == null ? null : Number(form.longitude)
      if ('location_precision' in form) payload.location_precision = form.location_precision || 'CITY'
      await updateMutation.mutateAsync(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const data = err?.response?.data
      // Show field-level errors if available
      if (data?.error?.details) {
        const detail = data.error.details[0]
        setErrors({ form: `${detail.field ? detail.field + ': ' : ''}${detail.message}` })
      } else {
        setErrors({ form: data?.message || 'Failed to save changes' })
      }
    }
  }

  // Still loading
  if (isLoading) return (
    <DashboardLayout title="Edit Profile">
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-24 rounded" />
      </div>
    </DashboardLayout>
  )

  // No profile yet — show setup screen
  if (!profile) {
    return <CreateProfileSetup onCreated={() => {}} />
  }

  // Has profile — show full edit form
  if (!form) return null

  const avatarUrl = profile?.avatar_url
  const coverUrl  = profile?.cover_url
  const score     = completion?.score ?? profile?.completion_score ?? 0
  const checks    = completion?.checks || []

  return (
    <DashboardLayout title="Edit Profile">
      <div className="max-w-2xl space-y-5">

        {/* Completion bar */}
        {score < 100 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-ink">Profile {score}% complete</p>
              <span className="text-[12px] text-ink-3">{score}/100</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-1.5">
              <div className="bg-brand rounded-full h-1.5 transition-all" style={{ width: `${score}%` }} />
            </div>
            {checks.filter(c => !c.done).length > 0 && (
              <div className="mt-3 space-y-1">
                {checks.filter(c => !c.done).slice(0, 4).map(c => {
                  const CHECK_LINKS = {
                    social: '/dashboard/profile/social-links',
                    hours: '/dashboard/profile/hours',
                    service: '/dashboard/profile/services',
                    portfolio: '/dashboard/profile/portfolio',
                    avatar: null,
                    cover: null,
                    headline: null,
                    description: null,
                    location: null,
                    contact: null,
                    published: null,
                  }
                  const href = CHECK_LINKS[c.key]
                  return href ? (
                    <Link key={c.key} to={href} className="text-[12px] text-brand flex items-center gap-1.5 hover:underline">
                      <span className="w-1 h-1 rounded-full bg-brand shrink-0" />
                      {c.label} →
                    </Link>
                  ) : (
                    <p key={c.key} className="text-[12px] text-ink-3 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-border-2 shrink-0" />
                      {c.label}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Cover + Avatar */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Cover */}
          <div className="relative h-32 bg-surface-2 group cursor-pointer" onClick={() => coverRef.current?.click()}>
            {coverUrl
              ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-surface-2 to-border" />
            }
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Camera size={15} className="text-white" />
              <span className="text-white text-[12.5px] font-medium">Change cover</span>
            </div>
            {coverUrl && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteCoverMutation.mutate() }}
                className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                aria-label="Remove cover"
              >
                <X size={11} />
              </button>
            )}
          </div>
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { if (e.target.files[0]) uploadCover.mutate(e.target.files[0]); e.target.value = '' }} />

          <div className="px-5 pb-5 flex items-end gap-4 -mt-10">
            {/* Avatar */}
            <div className="relative shrink-0 group cursor-pointer" onClick={() => avatarRef.current?.click()}>
              <div className="w-20 h-20 rounded-xl border-2 border-surface bg-surface-2 overflow-hidden shadow-sm">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center bg-brand/10">
                      <span className="text-2xl font-bold text-brand">{profile?.display_name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                }
              </div>
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                <Camera size={13} className="text-white" />
              </div>
              {uploadAvatar.isPending && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { if (e.target.files[0]) uploadAvatar.mutate(e.target.files[0]); e.target.value = '' }} />

            <div className="flex-1 pb-1 min-w-0">
              <p className="text-[14px] font-bold text-ink truncate">{profile.display_name}</p>
              {profile.slug && (
                <Link to={`/p/${profile.slug}`} target="_blank"
                  className="text-[12px] text-brand flex items-center gap-1 hover:underline w-fit">
                  /@{profile.slug} <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic info */}
          <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-[13.5px] font-bold text-ink">Basic Information</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Display Name" required>
                <Input value={form.display_name} onChange={set('display_name')} placeholder="Your name or business name" required />
              </FormField>
              <FormField label="Profile Type">
                <Select value={form.profile_type} onChange={set('profile_type')}>
                  {PROFILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </FormField>
            </div>

            <FormField
              label="Category"
              hint="Choose the category that best describes what you do — this is how people find you"
            >
              <Select value={form.category_id || ''} onChange={set('category_id')}>
                <option value="">— Select a category —</option>
                {categoryOptions.map(opt => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={opt.isParent ? { fontWeight: 'bold' } : { paddingLeft: '16px' }}
                  >
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Public URL"
              hint={`Share as: platform.com/@${form.slug || '...'}`}
              error={slugStatus === 'taken' ? 'Already taken' : ''}
            >
              <div className={`flex items-center border rounded overflow-hidden focus-within:ring-2 focus-within:ring-brand/10 ${
                slugStatus === 'taken' ? 'border-danger' : slugStatus === 'available' ? 'border-green-400' : 'border-border-2 focus-within:border-brand'
              }`}>
                <span className="px-3 text-[12.5px] text-ink-3 bg-surface-2 border-r border-border-2 h-9 flex items-center shrink-0">/@</span>
                <input
                  value={form.slug}
                  onChange={set('slug')}
                  placeholder="my-shop"
                  className="flex-1 px-3 text-sm text-ink bg-surface outline-none h-9"
                />
                {slugStatus === 'available' && <CheckCircle size={13} className="mr-3 text-green-500 shrink-0" />}
              </div>
            </FormField>

            <FormField label="Headline" hint="Short tagline (max 150 chars)">
              <Input value={form.headline} onChange={set('headline')} placeholder="e.g. Full-Stack Developer · Freelance · Gondar" maxLength={150} />
            </FormField>

            <FormField label="Description">
              <Textarea value={form.description} onChange={set('description')} rows={4}
                placeholder="Tell visitors who you are and what you offer..." />
            </FormField>

            {/* Publish toggle */}
            <div className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border ${form.is_published ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-2 border-border'}`}>
              <div>
                <p className={`text-[13px] font-semibold ${form.is_published ? 'text-emerald-700' : 'text-ink'}`}>
                  {form.is_published ? '✅ Profile is public' : '🔒 Profile is hidden'}
                </p>
                <p className="text-[11.5px] text-ink-3 mt-0.5">
                  {form.is_published ? 'People can find you in the directory' : 'Toggle to make your profile discoverable'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.is_published ? 'bg-emerald-500' : 'bg-border-2'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-[13.5px] font-bold text-ink">Contact</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Phone">
                <Input value={form.contact_phone} onChange={set('contact_phone')} placeholder="+251 9..." type="tel" />
              </FormField>
              <FormField label="Email">
                <Input value={form.contact_email} onChange={set('contact_email')} placeholder="you@example.com" type="email" />
              </FormField>
              <FormField label="WhatsApp">
                <Input value={form.whatsapp} onChange={set('whatsapp')} placeholder="+251 9..." type="tel" />
              </FormField>
              <FormField label="Telegram Username">
                <Input value={form.telegram_username} onChange={set('telegram_username')} placeholder="@username" />
              </FormField>
              <FormField label="Website" className="sm:col-span-2">
                <Input value={form.website_url} onChange={set('website_url')} placeholder="https://yoursite.com" type="url" />
              </FormField>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Phone Visibility">
                <Select value={form.phone_visibility} onChange={set('phone_visibility')}>
                  {VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Email Visibility">
                <Select value={form.email_visibility} onChange={set('email_visibility')}>
                  {VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </FormField>
            </div>
          </section>

          {/* Location */}
          <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-[13.5px] font-bold text-ink">Location</h2>
            <p className="text-[12.5px] text-ink-3">
              Pin your location on the map. Visitors will be able to see where you are and get directions to find you.
            </p>

            {/* Map picker */}
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              address={form.address_line || ''}
              height="280px"
              onChange={({ latitude, longitude, address }) => {
                setForm(f => ({
                  ...f,
                  latitude,
                  longitude,
                  address_line: address || f.address_line,
                }))
              }}
            />

            {/* Text fields for city/country still needed for search filtering */}
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <FormField label="Country">
                <Input value={form.country} onChange={set('country')} placeholder="Ethiopia" />
              </FormField>
              <FormField label="Region / State">
                <Input value={form.region} onChange={set('region')} placeholder="Amhara" />
              </FormField>
              <FormField label="City" hint="Used for search by city name">
                <Input value={form.city} onChange={set('city')} placeholder="Gondar" />
              </FormField>
              <FormField label="Area / Neighborhood">
                <Input value={form.area} onChange={set('area')} placeholder="Azezo" />
              </FormField>
            </div>

            <FormField label="Location Visibility" hint="How precisely your location is shown publicly">
              <Select value={form.location_precision || 'CITY'} onChange={set('location_precision')}>
                <option value="CITY">City only — just show city name</option>
                <option value="DISTRICT">District — show city + area</option>
                <option value="FULL">Full — show exact map pin</option>
              </Select>
            </FormField>
          </section>

          {/* Save */}
          {errors.form && (
            <p className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-lg px-4 py-3">{errors.form}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" loading={updateMutation.isPending}>Save changes</Button>
            {saved && (
              <span className="text-[13px] text-success flex items-center gap-1.5">
                <CheckCircle size={14} />Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
