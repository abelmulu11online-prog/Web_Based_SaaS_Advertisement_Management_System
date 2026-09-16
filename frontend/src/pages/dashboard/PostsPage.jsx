import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Pin } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { FormField, Input, Textarea, Select } from '../../components/ui/FormField.jsx'
import { NoProfileGuard } from '../../features/profiles/components/NoProfileGuard.jsx'
import {
  useMyPosts, useCreatePost, useUpdatePost, useDeletePost,
} from '../../features/profiles/hooks/useProfile.js'

const POST_TYPE_OPTIONS = [
  { value: 'UPDATE', label: 'Update' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'PROJECT', label: 'Project' },
]

const POST_TYPE_BADGE = {
  UPDATE: 'default',
  ANNOUNCEMENT: 'info',
  PROMOTION: 'success',
  ACHIEVEMENT: 'warning',
  PROJECT: 'default',
}

const emptyForm = {
  title: '', content: '', post_type: 'UPDATE',
  visibility: 'PUBLIC', is_published: false, is_pinned: false,
}

function PostForm({ initial = emptyForm, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial)

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.content.trim()) return
    const payload = {
      ...form,
      title: form.title || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Title" hint="Optional — leave blank for a quick update">
        <Input value={form.title} onChange={set('title')} placeholder="e.g. New collection available" />
      </FormField>

      <FormField label="Content" required>
        <Textarea value={form.content} onChange={set('content')} rows={4} required
          placeholder="Share an update, announcement, or promotion..." />
      </FormField>

      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Post Type">
          <Select value={form.post_type} onChange={set('post_type')}>
            {POST_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Visibility">
          <Select value={form.visibility} onChange={set('visibility')}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private (only you)</option>
          </Select>
        </FormField>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_published} onChange={set('is_published')}
            className="w-4 h-4 rounded accent-brand" />
          Published
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_pinned} onChange={set('is_pinned')}
            className="w-4 h-4 rounded accent-brand" />
          Pinned
        </label>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" variant="primary" loading={loading}>Save post</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function PostsPage() {
  const { data, isLoading, error } = useMyPosts()
  const createMutation = useCreatePost()
  const updateMutation = useUpdatePost()
  const deleteMutation = useDeletePost()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const posts = data?.posts || []

  const handleCreate = async (payload) => {
    try {
      await createMutation.mutateAsync(payload)
      setShowForm(false)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create post')
    }
  }

  const handleUpdate = async (id, payload) => {
    try {
      await updateMutation.mutateAsync({ id, data: payload })
      setEditingId(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update post')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete post')
    }
  }

  if (isLoading) return (
    <DashboardLayout title="Posts">
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    </DashboardLayout>
  )

  if (error) return (
    <DashboardLayout title="Posts">
      <NoProfileGuard><></></NoProfileGuard>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Posts">
      <NoProfileGuard>
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-3">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />New post
            </Button>
          )}
        </div>

        {showForm && (
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-[14px] font-semibold text-ink mb-4">New post</h3>
            <PostForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {posts.length === 0 && !showForm ? (
          <div className="bg-surface border border-border rounded-lg p-10 text-center">
            <FileText size={32} className="mx-auto text-ink-3 mb-3" />
            <p className="text-[14px] font-semibold text-ink mb-1">No posts yet</p>
            <p className="text-[13px] text-ink-3 mb-4">Share updates, announcements, and promotions with visitors.</p>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Create your first post
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.id}>
                {editingId === post.id ? (
                  <div className="bg-surface border border-brand rounded-lg p-5">
                    <h3 className="text-[14px] font-semibold text-ink mb-4">Edit post</h3>
                    <PostForm
                      initial={{
                        title: post.title || '',
                        content: post.content || '',
                        post_type: post.post_type || 'UPDATE',
                        visibility: post.visibility || 'PUBLIC',
                        is_published: post.is_published || false,
                        is_pinned: post.is_pinned || false,
                      }}
                      onSave={(payload) => handleUpdate(post.id, payload)}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {post.is_pinned && <Pin size={11} className="text-brand shrink-0" />}
                        <Badge variant={POST_TYPE_BADGE[post.post_type] || 'default'} size="xs">
                          {post.post_type}
                        </Badge>
                        {!post.is_published && <Badge variant="default" size="xs">Draft</Badge>}
                        {post.published_at && (
                          <span className="text-[11.5px] text-ink-3">
                            {new Date(post.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {post.title && (
                        <p className="text-[13.5px] font-semibold text-ink mb-0.5">{post.title}</p>
                      )}
                      <p className="text-[13px] text-ink-2 line-clamp-2">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <button
                        onClick={() => setEditingId(post.id)}
                        aria-label={`Edit post${post.title ? ': ' + post.title : ''}`}
                        className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(post.id)}
                        aria-label={`Delete post${post.title ? ': ' + post.title : ''}`}
                        className="p-1.5 text-ink-3 hover:text-danger hover:bg-red-50 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {deleteConfirm === post.id && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-3 -mt-px">
                    <p className="text-[13px] text-danger font-medium">Delete this post?</p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="xs" onClick={() => handleDelete(post.id)}
                        loading={deleteMutation.isPending}>Delete</Button>
                      <Button variant="ghost" size="xs" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </NoProfileGuard>
    </DashboardLayout>
  )
}
