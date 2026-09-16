/**
 * AdminVerificationsPage.jsx — Profile Verification review queue.
 *
 * Shows profiles submitted for verification review. Admin can:
 *  - Filter by status and profile type
 *  - Open a detail drawer/panel
 *  - View business/legal info + secure document link
 *  - Approve, reject (with required reason), or suspend
 */
import { useState } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, FileText,
  Eye, Search, Filter, RefreshCw, PauseCircle, X,
  ChevronRight, Clock, User, Building2, ExternalLink,
} from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Button }       from '../../components/ui/Button.jsx'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField.jsx'
import { Skeleton }     from '../../components/ui/Skeleton.jsx'
import { PageHeader }   from '../../features/admin/components/AdminTable.jsx'
import {
  useAdminVerifications, useAdminVerificationDetail, useAdminVerificationStats,
  useApproveVerification, useRejectVerification, useSuspendVerification,
} from '../../features/admin/hooks/useAdmin.js'
import { statusLabel, statusBadgeClasses } from '../../utils/profileVerification.js'

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls = statusBadgeClasses(status)
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls.bg} ${cls.text} ${cls.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  )
}

// ── Verification detail drawer ─────────────────────────────────────────────────
function VerificationDetailDrawer({ profileId, onClose }) {
  const { data: detail, isLoading, error, refetch } = useAdminVerificationDetail(profileId)
  const approveMutation = useApproveVerification()
  const rejectMutation  = useRejectVerification()
  const suspendMutation = useSuspendVerification()

  const [rejecting,     setRejecting]     = useState(false)
  const [suspending,    setSuspending]    = useState(false)
  const [rejectReason,  setRejectReason]  = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [approveNote,   setApproveNote]   = useState('')
  const [approving,     setApproving]     = useState(false)
  const [actionMsg,     setActionMsg]     = useState('')
  const [actionErr,     setActionErr]     = useState('')

  async function handleApprove() {
    setActionErr('')
    try {
      await approveMutation.mutateAsync({ profileId, note: approveNote || null })
      setActionMsg('Profile approved successfully.')
      setApproving(false)
      refetch()
    } catch (e) {
      setActionErr(e?.response?.data?.message || 'Approval failed.')
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setActionErr('Rejection reason is required.'); return }
    setActionErr('')
    try {
      await rejectMutation.mutateAsync({ profileId, reason: rejectReason.trim() })
      setActionMsg('Profile rejected.')
      setRejecting(false)
      setRejectReason('')
      refetch()
    } catch (e) {
      setActionErr(e?.response?.data?.message || 'Rejection failed.')
    }
  }

  async function handleSuspend() {
    setActionErr('')
    try {
      await suspendMutation.mutateAsync({ profileId, reason: suspendReason.trim() || null })
      setActionMsg('Profile suspended.')
      setSuspending(false)
      setSuspendReason('')
      refetch()
    } catch (e) {
      setActionErr(e?.response?.data?.message || 'Suspension failed.')
    }
  }

  const d = detail

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Profile verification detail"
    >
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="w-full max-w-2xl bg-surface border-l border-border h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between gap-4 z-10">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Profile Verification Review</h2>
            {d && <p className="text-[12px] text-ink-3 mt-0.5">ID: {profileId}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
            aria-label="Close detail panel"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
          </div>
        )}

        {error && (
          <div className="p-6">
            <p className="text-danger text-sm">{error?.response?.data?.message || 'Failed to load detail.'}</p>
          </div>
        )}

        {d && (
          <div className="flex-1 p-6 space-y-6">

            {actionMsg && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <p className="text-[13px] text-emerald-700">{actionMsg}</p>
              </div>
            )}
            {actionErr && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <p className="text-[13px] text-red-700">{actionErr}</p>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <StatusBadge status={d.verification_status} />
              {d.reviewed_at && (
                <span className="text-[11.5px] text-ink-3">
                  Reviewed {new Date(d.reviewed_at).toLocaleString()}
                  {d.reviewer_email && ` by ${d.reviewer_email}`}
                </span>
              )}
            </div>

            {/* Rejection reason (if applicable) */}
            {d.rejection_reason && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-[12px] font-semibold text-red-700 mb-1">Previous Rejection Reason</p>
                <p className="text-[12.5px] text-red-600">{d.rejection_reason}</p>
              </div>
            )}

            {/* User information */}
            <section>
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-3 flex items-center gap-2">
                <User size={12} aria-hidden="true" /> User Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <InfoRow label="Name"        value={d.display_name} />
                <InfoRow label="Email"       value={d.user_email} />
                <InfoRow label="Phone"       value={d.user_phone || '—'} />
                <InfoRow label="User ID"     value={d.user_id?.slice(0, 8) + '…'} />
                <InfoRow label="Profile Type" value={d.profile_type} />
                <InfoRow label="Account Status" value={d.user_status} />
              </div>
            </section>

            {/* Business/legal information */}
            <section>
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Building2 size={12} aria-hidden="true" /> Business / Legal Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <InfoRow label="Business Name"   value={d.business_name || '—'} span={2} />
                <InfoRow label="Business Type"   value={d.business_type || '—'} />
                <InfoRow label="License / Reg #" value={d.license_number || '—'} />
                <InfoRow label="Issue Date"      value={d.license_issue_date ? new Date(d.license_issue_date).toLocaleDateString() : '—'} />
                <InfoRow label="Expiry Date"     value={d.license_expiry_date ? new Date(d.license_expiry_date).toLocaleDateString() : '—'} />
                <InfoRow label="Address"         value={d.business_address || '—'} span={2} />
                <InfoRow label="City"            value={d.business_city || '—'} />
                <InfoRow label="Region"          value={d.business_region || '—'} />
                <InfoRow label="Country"         value={d.business_country || '—'} />
              </div>
            </section>

            {/* Additional information */}
            {d.additional_information && (
              <section>
                <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-2">
                  Additional Information
                </h3>
                <div className="p-3.5 bg-surface-2 border border-border rounded-xl text-[13px] text-ink whitespace-pre-wrap">
                  {d.additional_information}
                </div>
              </section>
            )}

            {/* Document */}
            <section>
              <h3 className="text-[12px] font-semibold text-ink-3 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText size={12} aria-hidden="true" /> Verification Document
              </h3>
              {d.doc_id ? (
                <div className="flex items-center justify-between gap-3 p-3.5 bg-surface-2 border border-border rounded-xl">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{d.document_name}</p>
                    <p className="text-[11.5px] text-ink-3">
                      {d.doc_mime_type === 'application/pdf' ? 'PDF' : 'Image'}
                      {d.doc_file_size ? ` · ${(d.doc_file_size / 1024).toFixed(0)} KB` : ''}
                      {d.doc_uploaded_at ? ` · ${new Date(d.doc_uploaded_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  {d.doc_signed_url ? (
                    <a
                      href={d.doc_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12.5px] font-medium text-brand hover:underline shrink-0"
                    >
                      <ExternalLink size={13} />
                      View Document
                    </a>
                  ) : (
                    <span className="text-[12px] text-ink-3">Link unavailable</span>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[12.5px] text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> No document uploaded yet.
                  </p>
                </div>
              )}
            </section>

            {/* Action panel */}
            {d.verification_status !== 'ACTIVE' && d.verification_status !== 'SUSPENDED' && (
              <section className="border-t border-border pt-5 space-y-4">
                <h3 className="text-[13px] font-bold text-ink">Review Actions</h3>

                {/* Approve */}
                <div className="space-y-2">
                  {approving ? (
                    <div className="space-y-2">
                      <FormField label="Approval note (optional)">
                        <Textarea
                          value={approveNote}
                          onChange={e => setApproveNote(e.target.value)}
                          placeholder="Optional note for the admin record..."
                          rows={2}
                        />
                      </FormField>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          loading={approveMutation.isPending}
                          icon={<CheckCircle2 size={14} />}
                          onClick={handleApprove}
                        >
                          Confirm Approval
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setApproving(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 size={14} />}
                      onClick={() => { setRejecting(false); setSuspending(false); setApproving(true); setActionErr('') }}
                    >
                      Approve Profile
                    </Button>
                  )}
                </div>

                {/* Reject */}
                <div className="space-y-2">
                  {rejecting ? (
                    <div className="space-y-2">
                      <FormField label="Rejection reason" required>
                        <Textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Explain what the user needs to fix..."
                          rows={3}
                        />
                      </FormField>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          loading={rejectMutation.isPending}
                          icon={<XCircle size={14} />}
                          onClick={handleReject}
                        >
                          Confirm Rejection
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<XCircle size={14} />}
                      onClick={() => { setApproving(false); setSuspending(false); setRejecting(true); setActionErr('') }}
                    >
                      Reject Profile
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Suspend active profiles */}
            {(d.verification_status === 'ACTIVE' || d.verification_status === 'VERIFIED') && (
              <section className="border-t border-border pt-5 space-y-4">
                <h3 className="text-[13px] font-bold text-ink">Moderation</h3>
                {suspending ? (
                  <div className="space-y-2">
                    <FormField label="Suspension reason">
                      <Textarea
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        placeholder="Reason for suspension (shown to user)..."
                        rows={2}
                      />
                    </FormField>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        loading={suspendMutation.isPending}
                        icon={<PauseCircle size={14} />}
                        onClick={handleSuspend}
                      >
                        Confirm Suspension
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSuspending(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<PauseCircle size={14} />}
                    onClick={() => { setSuspending(true); setActionErr('') }}
                  >
                    Suspend Profile
                  </Button>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, span = 1 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-[11px] text-ink-3 font-medium mb-0.5">{label}</p>
      <p className="text-[13px] text-ink break-all">{value || '—'}</p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminVerificationsPage() {
  const [params, setParams] = useState({ status: 'UNDER_REVIEW', page: 1 })
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const { data, isLoading, error, refetch } = useAdminVerifications({ ...params, search: search || undefined })
  const { data: stats } = useAdminVerificationStats()

  const profiles    = data?.profiles    ?? []
  const pagination  = data?.pagination  ?? {}
  const underReview = stats?.under_review ?? 0

  function setFilter(key, value) {
    setParams(p => ({ ...p, [key]: value, page: 1 }))
  }

  return (
    <AdminLayout title="Profile Verifications">
      <PageHeader
        title="Profile Verifications"
        subtitle={`${underReview} profile${underReview !== 1 ? 's' : ''} awaiting review`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setFilter('page', 1)}
            placeholder="Search by name, business, email…"
            className="w-full pl-9 pr-3 h-9 text-[13px] bg-surface border border-border-2 rounded-lg outline-none focus:border-brand text-ink placeholder:text-ink-3"
            aria-label="Search verifications"
          />
        </div>

        <Select
          value={params.status || ''}
          onChange={e => setFilter('status', e.target.value)}
          className="w-44 h-9 text-[13px]"
          aria-label="Filter by status"
        >
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="ACTIVE">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="">All Statuses</option>
        </Select>

        <Select
          value={params.profile_type || ''}
          onChange={e => setFilter('profile_type', e.target.value)}
          className="w-40 h-9 text-[13px]"
          aria-label="Filter by profile type"
        >
          <option value="">All Types</option>
          <option value="SHOP">Shop</option>
          <option value="BUSINESS">Business</option>
          <option value="COMPANY">Company</option>
          <option value="ORGANIZATION">Organization</option>
        </Select>

        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={refetch}>
          Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Under Review', value: underReview,          color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Total Listed', value: pagination.total ?? 0, color: 'text-ink',       bg: 'bg-surface-2' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-border rounded-xl px-4 py-3`}>
            <p className="text-[11px] text-ink-3 font-semibold uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={24} className="text-danger" />
          <p className="text-[14px] text-ink-2">{error?.response?.data?.message || 'Failed to load verifications.'}</p>
          <Button variant="ghost" size="sm" onClick={refetch}>Retry</Button>
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <CheckCircle2 size={28} className="text-ink-3" />
          <p className="text-[14px] text-ink-3 font-medium">No profiles found</p>
          <p className="text-[12.5px] text-ink-4">
            {params.status === 'UNDER_REVIEW' ? 'No profiles are currently waiting for review.' : 'No results for the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="w-full flex items-center gap-4 px-5 py-4 bg-surface border border-border rounded-xl hover:border-brand hover:shadow-sm transition-all text-left group"
              aria-label={`Review ${p.display_name}`}
            >
              {/* Avatar placeholder */}
              <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0">
                <span className="text-[15px] font-bold text-ink-3">
                  {p.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13.5px] font-semibold text-ink truncate">{p.display_name}</p>
                  <StatusBadge status={p.verification_status} />
                  <span className="text-[11px] text-ink-3 bg-surface-2 border border-border px-2 py-0.5 rounded-full">
                    {p.profile_type}
                  </span>
                </div>
                <p className="text-[12px] text-ink-3 mt-0.5">
                  {p.business_name ? `${p.business_name} · ` : ''}{p.user_email}
                </p>
                {p.business_city && (
                  <p className="text-[11.5px] text-ink-4">{p.business_city}{p.business_country ? `, ${p.business_country}` : ''}</p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[11.5px] text-ink-3">
                  {p.doc_id ? (
                    <span className="text-success flex items-center gap-1"><FileText size={11} /> Doc uploaded</span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1"><AlertTriangle size={11} /> No document</span>
                  )}
                </p>
                <p className="text-[11px] text-ink-4 mt-0.5">
                  {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </div>

              <ChevronRight size={15} className="text-ink-4 group-hover:text-brand transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-[12.5px] text-ink-3">
            Page {pagination.page} of {pagination.total_pages} · {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary" size="sm"
              disabled={!pagination.has_prev}
              onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="secondary" size="sm"
              disabled={!pagination.has_next}
              onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selectedId && (
        <VerificationDetailDrawer
          profileId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </AdminLayout>
  )
}
