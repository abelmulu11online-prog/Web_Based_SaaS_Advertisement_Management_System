/**
 * AdminUsersPage.jsx — User management with search, filters, and actions.
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Shield, ShieldOff, UserCheck, UserX,
  MoreHorizontal, BadgeCheck,
} from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import {
  AdminTable, SearchBar, FilterSelect,
  Pagination, PageHeader, StatCard,
} from '../../features/admin/components/AdminTable.jsx'
import {
  useAdminUsers, useSuspendUser, useActivateUser,
  usePromoteUser, useDemoteUser,
} from '../../features/admin/hooks/useAdmin.js'

/* ── Badges ────────────────────────────────────────────────────────────── */
const STATUS_BADGE = {
  ACTIVE:    <Badge variant="success" dot size="xs">Active</Badge>,
  SUSPENDED: <Badge variant="danger"  dot size="xs">Suspended</Badge>,
  DELETED:   <Badge variant="default" dot size="xs">Deleted</Badge>,
}
const ROLE_BADGE = {
  ADMIN: <Badge variant="dark"    size="xs">Admin</Badge>,
  USER:  <Badge variant="default" size="xs">User</Badge>,
}
const PLAN_BADGE = {
  FREE:     <Badge variant="default" size="xs">Free</Badge>,
  BASIC:    <Badge variant="info"    size="xs">Basic</Badge>,
  PRO:      <Badge variant="brand"   size="xs">Pro</Badge>,
  BUSINESS: <Badge variant="dark"    size="xs">Business</Badge>,
}

/* ── Filter options ────────────────────────────────────────────────────── */
const STATUS_OPTS = [
  { value: 'ACTIVE',    label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
]
const ROLE_OPTS = [
  { value: 'USER',  label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
]

/* ── Avatar initial ────────────────────────────────────────────────────── */
function UserAvatar({ email }) {
  const initial = email?.[0]?.toUpperCase() || '?'
  return (
    <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center shrink-0">
      <span className="text-[12px] font-bold text-brand leading-none">{initial}</span>
    </div>
  )
}

/* ── Kebab action menu ─────────────────────────────────────────────────── */
function ActionMenu({ user, onSuspend, onActivate, onPromote, onDemote, loading }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        aria-label="User actions"
        aria-haspopup="true"
        aria-expanded={open}
        className="
          h-8 w-8 flex items-center justify-center rounded-lg
          border border-transparent
          text-ink-3 hover:text-ink hover:border-border hover:bg-surface-2
          disabled:opacity-40 transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
        "
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="
              absolute right-0 mt-1 z-20
              bg-surface border border-border rounded-xl
              shadow-[0_8px_32px_rgba(0,0,0,0.12)]
              py-1 min-w-[160px]
              animate-fade-in
            "
            role="menu"
          >
            {user.status === 'SUSPENDED' ? (
              <button
                role="menuitem"
                onClick={() => { onActivate(user.id); setOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-ink hover:bg-surface-2 transition-colors"
              >
                <UserCheck size={13} className="text-success" /> Activate user
              </button>
            ) : (
              <button
                role="menuitem"
                onClick={() => { onSuspend(user.id); setOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-danger hover:bg-danger-bg transition-colors"
              >
                <UserX size={13} /> Suspend user
              </button>
            )}

            <div className="h-px bg-border mx-2 my-1" role="separator" />

            {user.role === 'USER' ? (
              <button
                role="menuitem"
                onClick={() => { onPromote(user.id); setOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-ink hover:bg-surface-2 transition-colors"
              >
                <Shield size={13} className="text-brand" /> Make admin
              </button>
            ) : (
              <button
                role="menuitem"
                onClick={() => { onDemote(user.id); setOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2 transition-colors"
              >
                <ShieldOff size={13} className="text-ink-3" /> Remove admin
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [role,   setRole]   = useState(searchParams.get('role')   || '')
  const [page,   setPage]   = useState(1)
  const [debSearch, setDebSearch] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debSearch, status, role])

  const params = {
    page, page_size: 20,
    ...(debSearch && { search: debSearch }),
    ...(status    && { status }),
    ...(role      && { role }),
  }

  const { data, isLoading, error } = useAdminUsers(params)
  const suspend  = useSuspendUser()
  const activate = useActivateUser()
  const promote  = usePromoteUser()
  const demote   = useDemoteUser()

  const anyMutating = suspend.isPending || activate.isPending || promote.isPending || demote.isPending
  const mutationError = suspend.error || activate.error || promote.error || demote.error

  const users      = data?.users      || []
  const pagination = data?.pagination || null

  const columns = [
    {
      key: 'email',
      label: 'User',
      render: u => (
        <div className="flex items-center gap-3">
          <UserAvatar email={u.email} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13.5px] font-medium text-ink leading-snug truncate">
                {u.email || '—'}
              </p>
              {u.email_verified_at && (
                <BadgeCheck size={13} className="text-brand shrink-0" aria-label="Verified" />
              )}
            </div>
            {u.phone && (
              <p className="text-[11.5px] text-ink-3">{u.phone}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: u => STATUS_BADGE[u.status] || <Badge variant="default" size="xs">{u.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass:  'hidden sm:table-cell',
    },
    {
      key: 'role',
      label: 'Role',
      render: u => ROLE_BADGE[u.role] || <Badge variant="default" size="xs">{u.role}</Badge>,
      className: 'hidden md:table-cell',
      cellClass:  'hidden md:table-cell',
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: u => PLAN_BADGE[u.plan_name] || <Badge variant="default" size="xs">{u.plan_name || 'Free'}</Badge>,
      className: 'hidden lg:table-cell',
      cellClass:  'hidden lg:table-cell',
    },
    {
      key: 'ad_count',
      label: 'Ads',
      render: u => (
        <span className="text-[13px] tabular-nums">
          {u.ad_count || 0}
          {u.published_ad_count > 0 && (
            <span className="text-success ml-1 text-[11.5px]">({u.published_ad_count} live)</span>
          )}
        </span>
      ),
      className: 'hidden lg:table-cell',
      cellClass:  'hidden lg:table-cell',
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: u => (
        <span className="text-[12.5px] text-ink-3 tabular-nums">
          {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass:  'hidden xl:table-cell',
    },
    {
      key: 'actions',
      label: '',
      render: u => (
        <ActionMenu
          user={u}
          onSuspend={id => suspend.mutate(id)}
          onActivate={id => activate.mutate(id)}
          onPromote={id => promote.mutate(id)}
          onDemote={id => demote.mutate(id)}
          loading={anyMutating}
        />
      ),
      cellClass: 'text-right',
      className: 'text-right',
    },
  ]

  return (
    <AdminLayout title="Users">
      <PageHeader
        title="Users"
        subtitle="Manage and monitor platform members, advertisers, and account activity."
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4">
              <Skeleton className="h-3 w-20 rounded mb-3" />
              <Skeleton className="h-7 w-14 rounded" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total users"   value={(data?.pagination?.total ?? users.length).toLocaleString()} iconBg="bg-blue-50"      iconColor="text-blue-600" />
            <StatCard label="Showing"       value={users.length.toLocaleString()} sub="on this page"          iconBg="bg-surface-2"     iconColor="text-ink-3" />
            <StatCard label="Status filter" value={status || 'All'}               iconBg="bg-brand-light"    iconColor="text-brand" />
            <StatCard label="Role filter"   value={role   || 'All'}               iconBg="bg-surface-2"     iconColor="text-ink-3" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by email or phone…"
            className="w-full sm:flex-1 sm:max-w-xs"
          />
          <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} placeholder="All statuses" />
          <FilterSelect value={role}   onChange={setRole}   options={ROLE_OPTS}   placeholder="All roles" />
          {(search || status || role) && (
            <button
              onClick={() => { setSearch(''); setStatus(''); setRole('') }}
              className="text-[12.5px] text-ink-3 hover:text-danger transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Mutation error */}
        {mutationError && (
          <div className="bg-danger-bg border border-red-200 rounded-lg px-4 py-2.5 text-[13px] text-danger">
            {mutationError?.response?.data?.message || 'Action failed. Please try again.'}
          </div>
        )}

        {/* Table */}
        <AdminTable
          columns={columns}
          rows={users}
          loading={isLoading}
          error={error}
          emptyMessage="No users match your current filters."
        />

        <Pagination pagination={pagination} onPage={setPage} />
      </div>
    </AdminLayout>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}
