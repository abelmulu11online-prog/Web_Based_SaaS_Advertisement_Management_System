/**
 * AdminUsersPage.jsx — Paginated user management with search, filter,
 * suspend/activate and promote/demote actions.
 * All data from /api/admin/users (PostgreSQL).
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, ShieldOff, UserCheck, UserX, ChevronDown } from 'lucide-react'
import { AdminLayout }  from '../../components/layout/AdminLayout.jsx'
import { Badge }        from '../../components/ui/Badge.jsx'
import { Button }       from '../../components/ui/Button.jsx'
import {
  AdminTable, SearchBar, FilterSelect, Pagination, SectionHeader,
} from '../../features/admin/components/AdminTable.jsx'
import {
  useAdminUsers, useSuspendUser, useActivateUser,
  usePromoteUser, useDemoteUser,
} from '../../features/admin/hooks/useAdmin.js'

const STATUS_OPTS = [
  { value: 'ACTIVE',    label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
]
const ROLE_OPTS = [
  { value: 'USER',  label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
]

const STATUS_BADGE = {
  ACTIVE:    <Badge variant="success" dot>Active</Badge>,
  SUSPENDED: <Badge variant="danger"  dot>Suspended</Badge>,
  DELETED:   <Badge variant="default" dot>Deleted</Badge>,
}
const ROLE_BADGE = {
  ADMIN: <Badge variant="dark">Admin</Badge>,
  USER:  <Badge variant="default">User</Badge>,
}
const PLAN_BADGE = {
  FREE:     <Badge variant="default">Free</Badge>,
  BASIC:    <Badge variant="info">Basic</Badge>,
  PRO:      <Badge variant="brand">Pro</Badge>,
  BUSINESS: <Badge variant="dark">Business</Badge>,
}

function ActionMenu({ user, onSuspend, onActivate, onPromote, onDemote, loading }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-1 text-[12px] font-medium text-brand hover:underline disabled:opacity-50"
      >
        Actions <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
            {user.status === 'SUSPENDED' ? (
              <button
                onClick={() => { onActivate(user.id); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12.5px] text-ink hover:bg-surface-2"
              >
                <UserCheck size={13} className="text-success" /> Activate
              </button>
            ) : (
              <button
                onClick={() => { onSuspend(user.id); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12.5px] text-ink hover:bg-surface-2"
              >
                <UserX size={13} className="text-danger" /> Suspend
              </button>
            )}
            {user.role === 'USER' ? (
              <button
                onClick={() => { onPromote(user.id); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12.5px] text-ink hover:bg-surface-2"
              >
                <Shield size={13} className="text-brand" /> Make Admin
              </button>
            ) : (
              <button
                onClick={() => { onDemote(user.id); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12.5px] text-ink hover:bg-surface-2"
              >
                <ShieldOff size={13} className="text-ink-3" /> Remove Admin
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch]   = useState(searchParams.get('search') || '')
  const [status, setStatus]   = useState(searchParams.get('status') || '')
  const [role,   setRole]     = useState(searchParams.get('role')   || '')
  const [page,   setPage]     = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [debouncedSearch, status, role])

  const params = {
    page,
    page_size: 20,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(status && { status }),
    ...(role   && { role }),
  }

  const { data, isLoading, error } = useAdminUsers(params)
  const suspend  = useSuspendUser()
  const activate = useActivateUser()
  const promote  = usePromoteUser()
  const demote   = useDemoteUser()

  const anyMutating = suspend.isPending || activate.isPending || promote.isPending || demote.isPending

  const users      = data?.users      || []
  const pagination = data?.pagination || null

  const columns = [
    {
      key: 'email',
      label: 'User',
      render: (u) => (
        <div>
          <p className="font-medium text-ink text-[13px]">{u.email || '—'}</p>
          {u.phone && <p className="text-[11px] text-ink-3">{u.phone}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => STATUS_BADGE[u.status] || <Badge variant="default">{u.status}</Badge>,
      className: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => ROLE_BADGE[u.role] || <Badge variant="default">{u.role}</Badge>,
      className: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
    },
    {
      key: 'plan_name',
      label: 'Plan',
      render: (u) => PLAN_BADGE[u.plan_name] || <Badge variant="default">{u.plan_name || 'Free'}</Badge>,
      className: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
    },
    {
      key: 'ad_count',
      label: 'Ads',
      render: (u) => (
        <span className="text-[12px] text-ink-2">
          {u.ad_count || 0}
          {u.published_ad_count > 0 && (
            <span className="text-success ml-1">({u.published_ad_count} live)</span>
          )}
        </span>
      ),
      className: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (u) => (
        <span className="text-[12px] text-ink-3">
          {new Date(u.created_at).toLocaleDateString()}
        </span>
      ),
      className: 'hidden xl:table-cell',
      cellClass: 'hidden xl:table-cell',
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <ActionMenu
          user={u}
          onSuspend={(id) => suspend.mutate(id)}
          onActivate={(id) => activate.mutate(id)}
          onPromote={(id) => promote.mutate(id)}
          onDemote={(id) => demote.mutate(id)}
          loading={anyMutating}
        />
      ),
      cellClass: 'text-right',
    },
  ]

  return (
    <AdminLayout title="Users">
      <div className="flex flex-col gap-6">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by email or phone…"
            className="w-full sm:w-64"
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={STATUS_OPTS}
            placeholder="All statuses"
          />
          <FilterSelect
            value={role}
            onChange={setRole}
            options={ROLE_OPTS}
            placeholder="All roles"
          />
          {(search || status || role) && (
            <button
              onClick={() => { setSearch(''); setStatus(''); setRole('') }}
              className="text-[12px] text-ink-3 hover:text-danger"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Mutation errors */}
        {(suspend.error || activate.error || promote.error || demote.error) && (
          <div className="bg-danger-bg border border-red-200 rounded-lg px-4 py-2.5 text-[13px] text-danger">
            {(suspend.error || activate.error || promote.error || demote.error)?.response?.data?.message || 'Action failed.'}
          </div>
        )}

        {/* Table */}
        <AdminTable
          columns={columns}
          rows={users}
          loading={isLoading}
          error={error}
          emptyMessage="No users found matching your filters."
        />

        <Pagination pagination={pagination} onPage={setPage} />
      </div>
    </AdminLayout>
  )
}
