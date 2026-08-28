/**
 * DashboardPage — Advertiser dashboard showing all their advertisements.
 * Route: /dashboard
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useMyAdvertisements,
  usePublishAdvertisement,
  usePauseAdvertisement,
  useArchiveAdvertisement,
  useDeleteAdvertisement,
} from '../features/advertisements/hooks/useAdvertisements.js'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Navbar } from '../components/layout/Navbar.jsx'

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '420px',
          width: '90%',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '0 0 24px', fontSize: '16px', color: 'var(--text-h)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [confirmAction, setConfirmAction] = useState(null)

  const isLoggedIn = !!localStorage.getItem('accessToken')

  const { data, isLoading, isError } = useMyAdvertisements({
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    page_size: 10,
  })

  const publishMut = usePublishAdvertisement()
  const pauseMut = usePauseAdvertisement()
  const archiveMut = useArchiveAdvertisement()
  const deleteMut = useDeleteAdvertisement()

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2>Please log in to view your dashboard</h2>
          <Link to="/login" style={{ color: 'var(--accent)' }}>Go to login</Link>
        </div>
      </div>
    )
  }

  const ads = data?.advertisements || []
  const pagination = data?.pagination || {}

  const anyLoading = publishMut.isPending || pauseMut.isPending || archiveMut.isPending || deleteMut.isPending

  function doConfirm(action, id, label) {
    setConfirmAction({ action, id, label })
  }

  async function executeConfirmed() {
    const { action, id } = confirmAction
    setConfirmAction(null)
    if (action === 'delete') await deleteMut.mutateAsync(id)
    if (action === 'archive') await archiveMut.mutateAsync(id)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {confirmAction && (
        <ConfirmDialog
          message={`Are you sure you want to ${confirmAction.label}?`}
          onConfirm={executeConfirmed}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px', textAlign: 'left' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: '28px' }}>My Advertisements</h1>
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '15px' }}>
              Manage your listings — create, publish, pause, and archive.
            </p>
          </div>
          <Link to="/dashboard/advertisements/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary">+ New Advertisement</Button>
          </Link>
        </div>

        {/* Status filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          {['', 'DRAFT', 'PUBLISHED', 'PAUSED', 'EXPIRED', 'ARCHIVED'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--border)',
                background: statusFilter === s ? 'var(--accent)' : 'var(--code-bg)',
                color: statusFilter === s ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: statusFilter === s ? 600 : 400,
                fontFamily: 'var(--sans)',
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text)' }}>
            Loading your advertisements…
          </div>
        )}

        {/* Error */}
        {isError && (
          <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '8px', color: '#991b1b' }}>
            Failed to load advertisements. Please refresh the page.
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && ads.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'var(--code-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <h3 style={{ margin: '0 0 8px' }}>No advertisements yet</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--text)' }}>
              Create your first advertisement to get started.
            </p>
            <Link to="/dashboard/advertisements/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Create Advertisement</Button>
            </Link>
          </div>
        )}

        {/* Advertisements table */}
        {!isLoading && ads.length > 0 && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-h)' }}>Advertisement</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-h)' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-h)' }}>Price</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-h)' }}>Updated</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-h)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad, i) => (
                  <tr
                    key={ad.id}
                    style={{
                      borderBottom: i < ads.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {/* Title + category */}
                    <td style={{ padding: '14px 16px', maxWidth: '300px' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-h)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ad.primary_image && (
                          <img
                            src={ad.primary_image.image_url}
                            alt=""
                            style={{
                              width: '36px',
                              height: '36px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              marginRight: '10px',
                              verticalAlign: 'middle',
                            }}
                          />
                        )}
                        {ad.title}
                      </div>
                      {ad.category_name && (
                        <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>
                          {ad.category_icon && `${ad.category_icon} `}{ad.category_name}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <Badge status={ad.status}>{ad.status}</Badge>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '14px 16px', color: 'var(--text-h)' }}>
                      {ad.price_type === 'FREE' ? 'Free'
                        : ad.price_type === 'CONTACT_FOR_PRICE' ? 'On request'
                          : ad.price !== null && ad.price !== undefined
                            ? Number(ad.price).toLocaleString()
                            : '—'}
                    </td>

                    {/* Updated */}
                    <td style={{ padding: '14px 16px', color: 'var(--text)', fontSize: '13px' }}>
                      {new Date(ad.updated_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* View (if published) */}
                        {ad.status === 'PUBLISHED' && (
                          <Link to={`/ads/${ad.id}`} style={{ textDecoration: 'none' }}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        )}

                        {/* Edit */}
                        {['DRAFT', 'PAUSED'].includes(ad.status) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/dashboard/advertisements/${ad.id}/edit`)}
                          >
                            Edit
                          </Button>
                        )}

                        {/* Publish */}
                        {['DRAFT', 'PAUSED'].includes(ad.status) && (
                          <Button
                            variant="success"
                            size="sm"
                            loading={publishMut.isPending && anyLoading}
                            onClick={() => publishMut.mutate(ad.id)}
                          >
                            Publish
                          </Button>
                        )}

                        {/* Pause */}
                        {ad.status === 'PUBLISHED' && (
                          <Button
                            variant="warning"
                            size="sm"
                            loading={pauseMut.isPending && anyLoading}
                            onClick={() => pauseMut.mutate(ad.id)}
                          >
                            Pause
                          </Button>
                        )}

                        {/* Archive */}
                        {['DRAFT', 'PUBLISHED', 'PAUSED'].includes(ad.status) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => doConfirm('archive', ad.id, `archive "${ad.title}"`)}
                          >
                            Archive
                          </Button>
                        )}

                        {/* Delete */}
                        {['DRAFT', 'ARCHIVED'].includes(ad.status) && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => doConfirm('delete', ad.id, `permanently delete "${ad.title}"`)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Previous
            </Button>
            <span style={{ alignSelf: 'center', fontSize: '14px', color: 'var(--text)' }}>
              {pagination.page} / {pagination.total_pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pagination.has_next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
