/**
 * EditAdPage — edit an existing advertisement + manage its images.
 * Route: /dashboard/advertisements/:id/edit
 */
import { useState } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import {
  useMyAdvertisement,
  useUpdateAdvertisement,
  useAddAdvertisementImage,
  useDeleteAdvertisementImage,
  useSetPrimaryImage,
  usePublishAdvertisement,
} from '../features/advertisements/hooks/useAdvertisements.js'
import { AdvertisementForm } from '../features/advertisements/components/AdvertisementForm.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { Navbar } from '../components/layout/Navbar.jsx'

function ImageManager({ ad }) {
  const [imageUrl, setImageUrl] = useState('')
  const [altText, setAltText] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [addError, setAddError] = useState('')

  const addImageMut = useAddAdvertisementImage(ad.id)
  const deleteImageMut = useDeleteAdvertisementImage(ad.id)
  const setPrimaryMut = useSetPrimaryImage(ad.id)

  async function handleAddImage(e) {
    e.preventDefault()
    setAddError('')
    if (!imageUrl.trim()) {
      setAddError('Image URL is required')
      return
    }
    try {
      await addImageMut.mutateAsync({ image_url: imageUrl.trim(), alt_text: altText.trim() || undefined, is_primary: isPrimary })
      setImageUrl('')
      setAltText('')
      setIsPrimary(false)
    } catch (err) {
      setAddError(err?.response?.data?.message || 'Failed to add image')
    }
  }

  const images = ad.images || []

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--text-h)' }}>
        Images ({images.length}/10)
      </h3>

      {/* Current images */}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                position: 'relative',
                width: '100px',
                border: img.is_primary ? '2px solid var(--accent)' : '2px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <img
                src={img.image_url}
                alt={img.alt_text || ''}
                style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }}
                onError={(e) => { e.target.style.background = 'var(--code-bg)'; e.target.style.minHeight = '80px' }}
              />
              {img.is_primary && (
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    padding: '2px 5px',
                  }}
                >
                  PRIMARY
                </div>
              )}
              <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
                {!img.is_primary && (
                  <button
                    title="Set as primary"
                    onClick={() => setPrimaryMut.mutate(img.id)}
                    style={{
                      flex: 1,
                      padding: '4px',
                      border: 'none',
                      background: 'var(--code-bg)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: 'var(--accent)',
                    }}
                  >
                    ★
                  </button>
                )}
                <button
                  title="Delete image"
                  onClick={() => deleteImageMut.mutate(img.id)}
                  style={{
                    flex: 1,
                    padding: '4px',
                    border: 'none',
                    background: 'var(--code-bg)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#dc2626',
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add image form */}
      {images.length < 10 && (
        <form onSubmit={handleAddImage}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <FormField label="Image URL" error={addError}>
              <Input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                error={addError}
              />
            </FormField>
            <FormField label="Alt text (optional)">
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Brief description of the image"
              />
            </FormField>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
              />
              Set as primary image
            </label>
            <Button type="submit" variant="ghost" size="sm" loading={addImageMut.isPending} style={{ alignSelf: 'flex-start' }}>
              + Add Image
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function EditAdPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isLoggedIn = !!localStorage.getItem('accessToken')

  const { data: ad, isLoading, isError } = useMyAdvertisement(id)
  const updateMut = useUpdateAdvertisement(id)
  const publishMut = usePublishAdvertisement()

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <Link to="/login" style={{ color: 'var(--accent)' }}>Please log in</Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text)' }}>Loading…</div>
      </div>
    )
  }

  if (isError || !ad) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <p style={{ color: '#dc2626' }}>Advertisement not found.</p>
          <Link to="/dashboard" style={{ color: 'var(--accent)' }}>← Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const canEdit = ['DRAFT', 'PAUSED'].includes(ad.status)

  async function handleUpdate(data) {
    await updateMut.mutateAsync(data)
  }

  async function handlePublish() {
    await publishMut.mutateAsync(id)
    navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px', textAlign: 'left' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px' }}>
          <Link to="/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Dashboard</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span>{ad.title}</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '24px' }}>Edit Advertisement</h1>
              <Badge status={ad.status}>{ad.status}</Badge>
            </div>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>
              {canEdit ? 'Edit the details below, then publish when ready.' : `This advertisement is ${ad.status.toLowerCase()} and cannot be edited.`}
            </p>
          </div>

          {['DRAFT', 'PAUSED'].includes(ad.status) && (
            <Button
              variant="success"
              loading={publishMut.isPending}
              onClick={handlePublish}
            >
              🚀 Publish
            </Button>
          )}
        </div>

        {/* Success message after creation */}
        {location.state?.created && (
          <div
            style={{
              padding: '12px 16px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#15803d',
              fontSize: '14px',
              marginBottom: '20px',
            }}
          >
            ✅ Advertisement created! Add images and fill in details, then publish it.
          </div>
        )}

        {updateMut.isSuccess && (
          <div
            style={{
              padding: '12px 16px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#15803d',
              fontSize: '14px',
              marginBottom: '20px',
            }}
          >
            ✅ Changes saved successfully.
          </div>
        )}

        {canEdit ? (
          <AdvertisementForm
            initialValues={ad}
            onSubmit={handleUpdate}
            isLoading={updateMut.isPending}
            submitLabel="Save Changes"
          />
        ) : (
          <div
            style={{
              padding: '16px',
              background: 'var(--code-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '14px',
              marginBottom: '20px',
            }}
          >
            This advertisement is <strong>{ad.status}</strong>. Pause it first to make edits.
          </div>
        )}

        {/* Image manager — always shown */}
        <div style={{ marginTop: '24px' }}>
          <ImageManager ad={ad} />
        </div>
      </main>
    </div>
  )
}
