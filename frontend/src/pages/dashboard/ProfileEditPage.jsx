import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, CheckCircle, ExternalLink, X, Plus,
  Upload, FileText, AlertTriangle, Info, Clock,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { FormField, Input, Textarea, Select } from '../../components/ui/FormField.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import {
  useMyProfile, useUpdateProfile, useCreateProfile, useProfileCompletion,
  useUploadAvatar, useUploadCover, useDeleteAvatar, useDeleteCover,
  useMyVerificationDocument, useUploadVerificationDocument,
  useSubmitForReview, useResubmitForReview,
} from '../../features/profiles/hooks/useProfile.js'
import * as profilesApi from '../../services/profiles.service.js'
import { useCategories } from '../../features/profiles/hooks/useCategories.js'
import { LocationPicker } from '../../features/locations/components/LocationPicker.jsx'
import {
  requiresVerification,
  statusLabel,
  statusBadgeClasses,
  VERIFICATION_STATUS,
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_MB,
} from '../../utils/profileVerification.js'

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
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 60)
}

const emptyForm = {
  display_name: '', slug: '', profile_type: 'PERSONAL', headline: '', description: '',
  contact_phone: '', contact_email: '', website_url: '', whatsapp: '', telegram_username: '',
  country: '', region: '', city: '', area: '', address_line: '',
  phone_visibility: 'PUBLIC', email_visibility: 'PUBLIC', is_published: false,
  // Verification fields
  business_name: '', business_type: '', license_number: '',
  license_issue_date: '', license_expiry_date: '',
  business_address: '', business_city: '', business_region: '', business_country: '',
  additional_information: '',
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls = statusBadgeClasses(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  )
}

// ── Document upload section ───────────────────────────────────────────────────
function DocumentUploadSection({ profileId, currentDoc, profile }) {
  const uploadMutation = useUploadVerificationDocument()
  const fileRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const [localFile, setLocalFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const status = profile?.verification_status
  const isLocked = status === VERIFICATION_STATUS.UNDER_REVIEW

  function validateFile(file) {
    if (!file) return 'Please select a file.'
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowed.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Accepted: JPEG, PNG, PDF.`
    }
    if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_DOCUMENT_SIZE_MB} MB.`
    }
    return null
  }

  async function handleUpload(file) {
    if (isLocked) return
    const err = validateFile(file)
    if (err) { setUploadError(err); return }
    setUploadError('')
    setLocalFile(file)
    setUploadProgress(0)
    try {
      await uploadMutation.mutateAsync({
        file,
        onProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total))
        },
      })
      setUploadProgress(100)
    } catch (e) {
      setUploadError(e?.response?.data?.message || 'Upload failed. Please try again.')
      setLocalFile(null)
      setUploadProgress(0)
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  const displayDoc = currentDoc
  const fileIcon = (mime) => mime === 'application/pdf' ? '📄' : '🖼️'

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[13px] font-semibold text-ink">
            Business License / Legal Registration Document
          </p>
          <p className="text-[12px] text-ink-3 mt-0.5">
            Accepted: {ACCEPTED_DOCUMENT_EXTENSIONS} · Max {MAX_DOCUMENT_SIZE_MB} MB
          </p>
        </div>
        {displayDoc && (
          <span className="text-[11.5px] text-success flex items-center gap-1">
            <CheckCircle size={12} /> Uploaded
          </span>
        )}
      </div>

      {isLocked ? (
        <div className="flex items-center gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
          <Clock size={15} className="text-blue-500 shrink-0" />
          <p className="text-[12.5px] text-blue-700">
            Document is locked while your profile is under review. You can replace it after resubmission.
          </p>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          aria-label="Upload verification document"
          className={`
            relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
            transition-colors duration-150
            ${dragOver ? 'border-brand bg-brand-light' : 'border-border-2 hover:border-brand bg-surface-2 hover:bg-surface'}
            ${uploadMutation.isPending ? 'opacity-60 pointer-events-none' : ''}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_DOCUMENT_TYPES}
            className="hidden"
            onChange={onFileChange}
            aria-hidden="true"
          />
          {uploadMutation.isPending ? (
            <div className="space-y-2">
              <div className="w-full bg-border rounded-full h-1.5">
                <div
                  className="bg-brand h-1.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[12.5px] text-ink-2">Uploading… {uploadProgress}%</p>
            </div>
          ) : (
            <>
              <Upload size={20} className="mx-auto mb-2 text-ink-3" aria-hidden="true" />
              <p className="text-[13px] font-medium text-ink">
                {displayDoc ? 'Replace document' : 'Click or drag to upload'}
              </p>
              <p className="text-[11.5px] text-ink-3 mt-1">
                JPEG, PNG, or PDF · max {MAX_DOCUMENT_SIZE_MB} MB
              </p>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-[12px] text-danger flex items-center gap-1.5">
          <AlertTriangle size={12} /> {uploadError}
        </p>
      )}

      {displayDoc && (
        <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
          <span className="text-xl" aria-hidden="true">{fileIcon(displayDoc.mime_type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-ink truncate">{displayDoc.document_name}</p>
            <p className="text-[11.5px] text-ink-3">
              {displayDoc.mime_type === 'application/pdf' ? 'PDF' : 'Image'}
              {displayDoc.file_size ? ` · ${(displayDoc.file_size / 1024).toFixed(0)} KB` : ''}
              {displayDoc.uploaded_at
                ? ` · Uploaded ${new Date(displayDoc.uploaded_at).toLocaleDateString()}`
                : ''}
            </p>
          </div>
          <CheckCircle size={15} className="text-success shrink-0" />
        </div>
      )}
    </div>
  )
}

// ── Verification section ──────────────────────────────────────────────────────
function VerificationSection({ form, set, profile, verificationDoc, onSaveFirst }) {
  const submitMutation   = useSubmitForReview()
  const resubmitMutation = useResubmitForReview()
  const [submitError, setSubmitError] = useState('')
  const [submitDone, setSubmitDone]   = useState(false)

  const status = profile?.verification_status || VERIFICATION_STATUS.UNVERIFIED
  const isUnderReview = status === VERIFICATION_STATUS.UNDER_REVIEW
  const isRejected    = status === VERIFICATION_STATUS.REJECTED
  const isActive      = status === VERIFICATION_STATUS.ACTIVE || status === VERIFICATION_STATUS.VERIFIED

  async function handleSubmit() {
    setSubmitError('')

    // Validate business_name in current form state before saving
    if (!form.business_name || !form.business_name.trim()) {
      setSubmitError('Business / organization name is required before submitting for review. Please fill in the field above.')
      return
    }

    // Step 1: save the profile first so the DB has the latest form data
    const saveError = await onSaveFirst()
    if (saveError) {
      setSubmitError(`Could not save profile before submitting: ${saveError}`)
      return
    }

    // Step 2: submit for review
    try {
      if (isRejected) {
        await resubmitMutation.mutateAsync()
      } else {
        await submitMutation.mutateAsync()
      }
      setSubmitDone(true)
      setTimeout(() => setSubmitDone(false), 4000)
    } catch (e) {
      setSubmitError(e?.response?.data?.message || 'Failed to submit for review. Please try again.')
    }
  }

  return (
    <section className="bg-surface border border-border rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[13.5px] font-bold text-ink flex items-center gap-2">
            <FileText size={15} className="text-ink-3" aria-hidden="true" />
            Business / Legal Verification
          </h2>
          <p className="text-[12px] text-ink-3 mt-1 max-w-lg">
            This profile type requires admin verification before your profile can become public.
            Please provide valid business/legal information and upload the required document.
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Status banners */}
      {isUnderReview && (
        <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl" role="status">
          <Info size={15} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-blue-700">Under Review</p>
            <p className="text-[12px] text-blue-600 mt-0.5">
              Your profile and verification documents are waiting for admin review.
              Your profile will become public after approval. You can still edit basic info below.
            </p>
          </div>
        </div>
      )}

      {isRejected && profile?.rejection_reason && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl" role="alert">
          <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-red-700">Verification Rejected</p>
            <p className="text-[12px] text-red-600 mt-1">
              <strong>Reason: </strong>{profile.rejection_reason}
            </p>
            <p className="text-[12px] text-red-600 mt-1">
              Please update your information and document below, then resubmit.
            </p>
          </div>
        </div>
      )}

      {isActive && (
        <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl" role="status">
          <CheckCircle size={15} className="text-emerald-500 shrink-0" aria-hidden="true" />
          <p className="text-[13px] text-emerald-700 font-medium">
            Your profile has been approved. You can now publish it publicly.
          </p>
        </div>
      )}

      {/* Business information fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Legal / Business / Organization Name" required>
          <Input
            value={form.business_name}
            onChange={set('business_name')}
            placeholder="e.g. Sunrise Coffee PLC"
            maxLength={200}
            disabled={isUnderReview}
          />
        </FormField>
        <FormField label="Business or Organization Type">
          <Input
            value={form.business_type}
            onChange={set('business_type')}
            placeholder="e.g. Private Limited Company, NGO"
            maxLength={100}
            disabled={isUnderReview}
          />
        </FormField>
        <FormField label="Registration / License Number">
          <Input
            value={form.license_number}
            onChange={set('license_number')}
            placeholder="e.g. BL-2023-001234"
            maxLength={100}
            disabled={isUnderReview}
          />
        </FormField>
        <FormField label="Contact Phone" hint="Business contact number">
          <Input
            value={form.contact_phone || ''}
            onChange={set('contact_phone')}
            placeholder="+251 91 234 5678"
            type="tel"
            disabled={isUnderReview}
          />
        </FormField>
        <FormField label="Issue Date" hint="YYYY-MM-DD format">
          <Input
            value={form.license_issue_date}
            onChange={set('license_issue_date')}
            placeholder="2020-01-15"
            maxLength={10}
            disabled={isUnderReview}
          />
        </FormField>
        <FormField label="Expiry Date" hint="YYYY-MM-DD, if applicable">
          <Input
            value={form.license_expiry_date}
            onChange={set('license_expiry_date')}
            placeholder="2025-01-15"
            maxLength={10}
            disabled={isUnderReview}
          />
        </FormField>
      </div>

      {/* Business address */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Business Address" className="sm:col-span-2">
          <Input
            value={form.business_address}
            onChange={set('business_address')}
            placeholder="Street address"
            maxLength={300}
            disabled={isUnderReview}
          />
        </FormField>
        <FormField label="City">
          <Input value={form.business_city} onChange={set('business_city')} placeholder="Addis Ababa" disabled={isUnderReview} />
        </FormField>
        <FormField label="Region">
          <Input value={form.business_region} onChange={set('business_region')} placeholder="Addis Ababa City" disabled={isUnderReview} />
        </FormField>
        <FormField label="Country">
          <Input value={form.business_country} onChange={set('business_country')} placeholder="Ethiopia" disabled={isUnderReview} />
        </FormField>
      </div>

      {/* Additional information */}
      <FormField
        label="Additional Business / Legal Information"
        hint="Describe your business, services, and any information the admin may need for verification. Max 3000 characters."
      >
        <Textarea
          value={form.additional_information}
          onChange={set('additional_information')}
          rows={4}
          maxLength={3000}
          placeholder="Describe what your business or organization does, services offered, registration details, or any other relevant information..."
          disabled={isUnderReview}
        />
        {form.additional_information?.length > 0 && (
          <p className="text-[11px] text-ink-4 text-right">{form.additional_information.length}/3000</p>
        )}
      </FormField>

      {/* Document upload */}
      <DocumentUploadSection
        profile={profile}
        currentDoc={verificationDoc}
      />

      {/* Submit for review */}
      {!isActive && (
        <div className="pt-1 border-t border-border">
          {submitError && (
            <p className="text-[12.5px] text-danger mb-3 flex items-center gap-1.5">
              <AlertTriangle size={13} /> {submitError}
            </p>
          )}
          {submitDone && (
            <p className="text-[12.5px] text-success mb-3 flex items-center gap-1.5">
              <CheckCircle size={13} /> Submitted for review successfully.
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {!isUnderReview && (
              <Button
                type="button"
                variant="primary"
                loading={submitMutation.isPending || resubmitMutation.isPending}
                onClick={handleSubmit}
                icon={<FileText size={14} />}
              >
                {isRejected ? 'Resubmit for Review' : 'Submit for Review'}
              </Button>
            )}
            <p className="text-[11.5px] text-ink-3">
              {isUnderReview
                ? 'Waiting for admin review. You will be notified when reviewed.'
                : 'Your profile will be saved automatically before submitting.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Create Profile Setup Screen ───────────────────────────────────────────────
function CreateProfileSetup({ onCreated }) {
  const { t } = useTranslation()
  const createMutation = useCreateProfile()
  const [form, setForm] = useState({ display_name: '', slug: '', profile_type: 'PERSONAL', category_id: '' })
  const [slugStatus, setSlugStatus] = useState(null)
  const [error, setError] = useState('')
  let slugTimer = null

  const set = (k) => (e) => {
    const val = e.target.value
    if (k === 'display_name') {
      setForm(f => {
        const next = { ...f, display_name: val }
        if (!f._slugEdited) { next.slug = slugify(val); checkSlug(next.slug) }
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
    if (slugStatus === 'taken') { setError(t('profile.edit.urlTaken')); return }
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
      setError(err?.response?.data?.message || t('profile.edit.createFailed'))
    }
  }

  const { data: categoriesData } = useCategories()
  const categoryOptions = []
  if (Array.isArray(categoriesData)) {
    const roots = categoriesData.filter(c => !c.parent_id)
    const children = categoriesData.filter(c => c.parent_id)
    for (const root of roots) {
      categoryOptions.push({ value: root.id, label: `${root.icon || ''} ${root.name}`.trim(), isParent: true })
      for (const sub of children.filter(c => c.parent_id === root.id)) {
        categoryOptions.push({ value: sub.id, label: `  ${sub.icon || ''}  ${sub.name}`.trim(), isParent: false })
      }
    }
  }

  return (
    <DashboardLayout title={t('profile.edit.setupTitle')}>
      <div className="max-w-xl mx-auto">
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-[17px] font-bold text-ink">{t('profile.edit.createTitle')}</h2>
            <p className="text-[13px] text-ink-3 mt-1">{t('profile.edit.createDesc')}</p>
          </div>

          {requiresVerification(form.profile_type) && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-amber-700">
                <strong>{form.profile_type}</strong> profiles require admin verification before going public.
                You'll be able to add business details and upload your document on the next step.
              </p>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-5">
            <FormField label={t('profile.edit.nameLabel')} required>
              <Input value={form.display_name} onChange={set('display_name')}
                placeholder={t('profile.edit.namePlaceholder')} required autoFocus />
            </FormField>

            <FormField
              label={t('profile.edit.urlLabel')}
              hint={t('profile.edit.urlHint', { slug: form.slug || 'your-name' })}
              error={slugStatus === 'taken' ? t('profile.edit.urlTaken') : ''}
            >
              <div className={`flex items-center border rounded overflow-hidden focus-within:ring-2 focus-within:ring-brand/10 ${
                slugStatus === 'taken' ? 'border-danger' : slugStatus === 'available' ? 'border-green-400' : 'border-border-2 focus-within:border-brand'
              }`}>
                <span className="px-3 text-[13px] text-ink-3 bg-surface-2 border-r border-border-2 h-9 flex items-center shrink-0">/@</span>
                <input
                  value={form.slug}
                  onChange={(e) => set('slug')(e)}
                  placeholder={t('profile.edit.urlPlaceholder')}
                  className="flex-1 px-3 py-2 text-sm text-ink bg-surface outline-none h-9"
                />
                {slugStatus === 'available' && <span className="pr-3 text-green-500"><CheckCircle size={14} /></span>}
              </div>
            </FormField>

            <FormField label={t('profile.edit.profileTypeLabel')}>
              <Select value={form.profile_type} onChange={set('profile_type')}>
                {PROFILE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </FormField>

            <FormField label={t('profile.edit.categoryLabel')} hint={t('profile.edit.categoryHint')}>
              <Select value={form.category_id || ''} onChange={set('category_id')}>
                <option value="">{t('profile.edit.categoryPlaceholder')}</option>
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}
                    style={opt.isParent ? { fontWeight: 'bold' } : { paddingLeft: '16px' }}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>

            {error && <p className="text-[13px] text-danger">{error}</p>}

            <Button type="submit" variant="primary" fullWidth loading={createMutation.isPending} size="lg">
              {t('profile.edit.createBtn')}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

// ── Main Edit Page ─────────────────────────────────────────────────────────────
export default function ProfileEditPage() {
  const { t } = useTranslation()
  const { data: profile, isLoading } = useMyProfile()
  const { data: completion } = useProfileCompletion()
  const { data: verificationDoc } = useMyVerificationDocument()
  const updateMutation = useUpdateProfile()
  const uploadAvatar   = useUploadAvatar()
  const uploadCover    = useUploadCover()
  const deleteAvatarMutation = useDeleteAvatar()
  const deleteCoverMutation  = useDeleteCover()
  const avatarRef = useRef()
  const coverRef  = useRef()

  const { data: categoriesData } = useCategories()
  const categoryOptions = []
  if (Array.isArray(categoriesData)) {
    const roots = categoriesData.filter(c => !c.parent_id)
    const children = categoriesData.filter(c => c.parent_id)
    for (const root of roots) {
      categoryOptions.push({ value: root.id, label: `${root.icon || ''} ${root.name}`.trim(), isParent: true })
      for (const sub of children.filter(c => c.parent_id === root.id)) {
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
        // Verification fields
        business_name:          profile.business_name || '',
        business_type:          profile.business_type || '',
        license_number:         profile.license_number || '',
        license_issue_date:     profile.license_issue_date
          ? profile.license_issue_date.substring(0, 10) : '',
        license_expiry_date:    profile.license_expiry_date
          ? profile.license_expiry_date.substring(0, 10) : '',
        business_address:       profile.business_address || '',
        business_city:          profile.business_city || '',
        business_region:        profile.business_region || '',
        business_country:       profile.business_country || '',
        additional_information: profile.additional_information || '',
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
      const payload = {}
      const optionalStrings = [
        'headline', 'description', 'contact_phone', 'contact_email', 'website_url',
        'whatsapp', 'telegram_username', 'country', 'region', 'city', 'area', 'address_line',
        // Verification strings
        'business_name', 'business_type', 'license_number',
        'license_issue_date', 'license_expiry_date',
        'business_address', 'business_city', 'business_region', 'business_country',
        'additional_information',
      ]
      const separateKeys = ['latitude', 'longitude', 'location_precision']
      const internalKeys = ['_slugEdited']
      const nullableFields = [...optionalStrings, 'category_id']

      Object.keys(form).forEach(k => {
        if (internalKeys.includes(k) || separateKeys.includes(k)) return
        if (nullableFields.includes(k)) {
          payload[k] = form[k] === '' ? null : form[k]
        } else {
          payload[k] = form[k]
        }
      })
      if ('latitude' in form) payload.latitude = form.latitude == null || form.latitude === '' ? null : Number(form.latitude)
      if ('longitude' in form) payload.longitude = form.longitude == null || form.longitude === '' ? null : Number(form.longitude)
      if ('location_precision' in form) payload.location_precision = form.location_precision || 'CITY'

      await updateMutation.mutateAsync(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const data = err?.response?.data
      if (data?.error?.details) {
        const detail = data.error.details[0]
        setErrors({ form: `${detail.field ? detail.field + ': ' : ''}${detail.message}` })
      } else {
        setErrors({ form: data?.message || 'Failed to save changes' })
      }
    }
  }

  if (isLoading) return (
    <DashboardLayout title={t('profile.edit.title')}>
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-10 rounded" />
        <Skeleton className="h-24 rounded" />
      </div>
    </DashboardLayout>
  )

  if (!profile) return <CreateProfileSetup onCreated={() => {}} />
  if (!form) return null

  const avatarUrl = profile?.avatar_url
  const coverUrl  = profile?.cover_url
  const score     = completion?.score ?? profile?.completion_score ?? 0
  const checks    = completion?.checks || []
  const needsVerification = requiresVerification(form.profile_type)

  return (
    <DashboardLayout title={t('profile.edit.title')}>
      <div className="max-w-2xl space-y-5">

        {/* Completion bar */}
        {score < 100 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-ink">
                {t('profile.edit.completionScore', { score })}
              </p>
              <span className="text-[12px] text-ink-3">{score}/100</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-1.5">
              <div className="bg-brand rounded-full h-1.5 transition-all" style={{ width: `${score}%` }} />
            </div>
            {checks.filter(c => !c.done).length > 0 && (
              <div className="mt-3 space-y-1">
                {checks.filter(c => !c.done).slice(0, 4).map(c => {
                  const CHECK_LINKS = {
                    social: '/dashboard/profile/social-links', hours: '/dashboard/profile/hours',
                    service: '/dashboard/profile/services', portfolio: '/dashboard/profile/portfolio',
                  }
                  const href = CHECK_LINKS[c.key]
                  return href ? (
                    <Link key={c.key} to={href} className="text-[12px] text-brand flex items-center gap-1.5 hover:underline">
                      <span className="w-1 h-1 rounded-full bg-brand shrink-0" />{c.label} →
                    </Link>
                  ) : (
                    <p key={c.key} className="text-[12px] text-ink-3 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-border-2 shrink-0" />{c.label}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Cover + Avatar */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="relative h-32 bg-surface-2 group cursor-pointer" onClick={() => coverRef.current?.click()}>
            {coverUrl
              ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-surface-2 to-border" />
            }
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Camera size={15} className="text-white" />
              <span className="text-white text-[12.5px] font-medium">{t('profile.edit.changeCover')}</span>
            </div>
            {coverUrl && (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); deleteCoverMutation.mutate() }}
                className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white"
                aria-label={t('profile.edit.removeCover')}>
                <X size={11} />
              </button>
            )}
          </div>
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { if (e.target.files[0]) uploadCover.mutate(e.target.files[0]); e.target.value = '' }} />

          <div className="px-5 pb-5 flex items-end gap-4 -mt-10">
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
            <h2 className="text-[13.5px] font-bold text-ink">{t('profile.edit.basicInfo')}</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label={t('profile.edit.displayNameLabel')} required>
                <Input value={form.display_name} onChange={set('display_name')}
                  placeholder={t('profile.edit.displayNamePlaceholder')} required />
              </FormField>
              <FormField label={t('profile.edit.profileTypeLabel')}>
                <Select value={form.profile_type} onChange={set('profile_type')}>
                  {PROFILE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </FormField>
            </div>

            {needsVerification && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Info size={13} className="text-amber-600 shrink-0" />
                <p className="text-[12px] text-amber-700">
                  This profile type requires admin verification. Complete the verification section below.
                </p>
              </div>
            )}

            <FormField label={t('profile.edit.categoryLabel')} hint={t('profile.edit.categoryHint')}>
              <Select value={form.category_id || ''} onChange={set('category_id')}>
                <option value="">{t('profile.edit.categoryPlaceholder')}</option>
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}
                    style={opt.isParent ? { fontWeight: 'bold' } : { paddingLeft: '16px' }}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label={t('profile.edit.urlLabel')}
              hint={t('profile.edit.urlPlaceholderFull', { slug: form.slug || '...' })}
              error={slugStatus === 'taken' ? t('profile.edit.urlTakenShort') : ''}
            >
              <div className={`flex items-center border rounded overflow-hidden focus-within:ring-2 focus-within:ring-brand/10 ${
                slugStatus === 'taken' ? 'border-danger' : slugStatus === 'available' ? 'border-green-400' : 'border-border-2 focus-within:border-brand'
              }`}>
                <span className="px-3 text-[12.5px] text-ink-3 bg-surface-2 border-r border-border-2 h-9 flex items-center shrink-0">/@</span>
                <input value={form.slug} onChange={set('slug')} placeholder="my-shop"
                  className="flex-1 px-3 text-sm text-ink bg-surface outline-none h-9" />
                {slugStatus === 'available' && <CheckCircle size={13} className="mr-3 text-green-500 shrink-0" />}
              </div>
            </FormField>

            <FormField label={t('profile.edit.headlineLabel')} hint={t('profile.edit.headlineHint')}>
              <Input value={form.headline} onChange={set('headline')}
                placeholder={t('profile.edit.headlinePlaceholder')} maxLength={150} />
            </FormField>

            <FormField label={t('profile.edit.descriptionLabel')}>
              <Textarea value={form.description} onChange={set('description')} rows={4}
                placeholder={t('profile.edit.descriptionPlaceholder')} />
            </FormField>

            {/* Publish toggle — only show if profile can be published */}
            {!needsVerification && (
              <div className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border ${form.is_published ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-2 border-border'}`}>
                <div>
                  <p className={`text-[13px] font-semibold ${form.is_published ? 'text-emerald-700' : 'text-ink'}`}>
                    {form.is_published ? t('profile.edit.profilePublic') : t('profile.edit.profileHidden')}
                  </p>
                  <p className="text-[11.5px] text-ink-3 mt-0.5">
                    {form.is_published ? t('profile.edit.profilePublicDesc') : t('profile.edit.profileHiddenDesc')}
                  </p>
                </div>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.is_published ? 'bg-emerald-500' : 'bg-border-2'}`}
                  role="switch" aria-checked={form.is_published}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )}
          </section>

          {/* Contact */}
          <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-[13.5px] font-bold text-ink">{t('profile.edit.contactTitle')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label={t('profile.edit.phoneLabel')}>
                <Input value={form.contact_phone} onChange={set('contact_phone')}
                  placeholder={t('profile.edit.phonePlaceholder')} type="tel" />
              </FormField>
              <FormField label={t('profile.edit.emailLabel')}>
                <Input value={form.contact_email} onChange={set('contact_email')}
                  placeholder={t('profile.edit.emailPlaceholder')} type="email" />
              </FormField>
              <FormField label={t('profile.edit.whatsappLabel')}>
                <Input value={form.whatsapp} onChange={set('whatsapp')}
                  placeholder={t('profile.edit.phonePlaceholder')} type="tel" />
              </FormField>
              <FormField label={t('profile.edit.telegramLabel')}>
                <Input value={form.telegram_username} onChange={set('telegram_username')}
                  placeholder={t('profile.edit.telegramPlaceholder')} />
              </FormField>
              <FormField label={t('profile.edit.websiteLabel')} className="sm:col-span-2">
                <Input value={form.website_url} onChange={set('website_url')}
                  placeholder={t('profile.edit.websitePlaceholder')} type="url" />
              </FormField>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label={t('profile.edit.phoneVisibility')}>
                <Select value={form.phone_visibility} onChange={set('phone_visibility')}>
                  {['PUBLIC','LOGGED_IN','HIDDEN'].map(v => (
                    <option key={v} value={v}>{t(`profile.edit.visibility.${v}`)}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t('profile.edit.emailVisibility')}>
                <Select value={form.email_visibility} onChange={set('email_visibility')}>
                  {['PUBLIC','LOGGED_IN','HIDDEN'].map(v => (
                    <option key={v} value={v}>{t(`profile.edit.visibility.${v}`)}</option>
                  ))}
                </Select>
              </FormField>
            </div>
          </section>

          {/* Location */}
          <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-[13.5px] font-bold text-ink">{t('profile.edit.locationTitle')}</h2>
            <p className="text-[12.5px] text-ink-3">{t('profile.edit.locationDesc')}</p>
            <LocationPicker
              latitude={form.latitude} longitude={form.longitude} address={form.address_line || ''}
              height="280px"
              onChange={({ latitude, longitude, address }) => {
                setForm(f => ({ ...f, latitude, longitude, address_line: address || f.address_line }))
              }}
            />
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <FormField label={t('profile.edit.countryLabel')}>
                <Input value={form.country} onChange={set('country')} placeholder="Ethiopia" />
              </FormField>
              <FormField label={t('profile.edit.regionLabel')}>
                <Input value={form.region} onChange={set('region')} placeholder="Amhara" />
              </FormField>
              <FormField label={t('profile.edit.cityLabel')} hint={t('profile.edit.cityHint')}>
                <Input value={form.city} onChange={set('city')} placeholder="Gondar" />
              </FormField>
              <FormField label={t('profile.edit.areaLabel')}>
                <Input value={form.area} onChange={set('area')} placeholder="Azezo" />
              </FormField>
            </div>
            <FormField label={t('profile.edit.locationVisibility')} hint={t('profile.edit.locationVisibilityHint')}>
              <Select value={form.location_precision || 'CITY'} onChange={set('location_precision')}>
                <option value="CITY">{t('profile.edit.cityOnly')}</option>
                <option value="DISTRICT">{t('profile.edit.district')}</option>
                <option value="FULL">{t('profile.edit.full')}</option>
              </Select>
            </FormField>
          </section>

          {/* ── Business / Legal Verification (conditional) ── */}
          {needsVerification && (
            <VerificationSection
              form={form}
              set={set}
              profile={profile}
              verificationDoc={verificationDoc}
              onSaveFirst={async () => {
                // Called by VerificationSection before submitting for review.
                // Saves the current form to the DB and returns an error string or null.
                if (slugStatus === 'taken') return 'Profile URL is already taken.'
                try {
                  const payload = {}
                  const optionalStrings = [
                    'headline', 'description', 'contact_phone', 'contact_email', 'website_url',
                    'whatsapp', 'telegram_username', 'country', 'region', 'city', 'area', 'address_line',
                    'business_name', 'business_type', 'license_number',
                    'license_issue_date', 'license_expiry_date',
                    'business_address', 'business_city', 'business_region', 'business_country',
                    'additional_information',
                  ]
                  const separateKeys = ['latitude', 'longitude', 'location_precision']
                  const internalKeys = ['_slugEdited']
                  const nullableFields = [...optionalStrings, 'category_id']
                  Object.keys(form).forEach(k => {
                    if (internalKeys.includes(k) || separateKeys.includes(k)) return
                    if (nullableFields.includes(k)) {
                      payload[k] = form[k] === '' ? null : form[k]
                    } else {
                      payload[k] = form[k]
                    }
                  })
                  if ('latitude' in form) payload.latitude = form.latitude == null || form.latitude === '' ? null : Number(form.latitude)
                  if ('longitude' in form) payload.longitude = form.longitude == null || form.longitude === '' ? null : Number(form.longitude)
                  if ('location_precision' in form) payload.location_precision = form.location_precision || 'CITY'
                  await updateMutation.mutateAsync(payload)
                  return null // success
                } catch (err) {
                  const data = err?.response?.data
                  return data?.message || 'Failed to save profile changes.'
                }
              }}
            />
          )}

          {errors.form && (
            <p className="text-[13px] text-danger bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {errors.form}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" loading={updateMutation.isPending}>
              {t('profile.edit.saveChanges')}
            </Button>
            {saved && (
              <span className="text-[13px] text-success flex items-center gap-1.5">
                <CheckCircle size={14} />{t('profile.edit.savedSuccessfully')}
              </span>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
