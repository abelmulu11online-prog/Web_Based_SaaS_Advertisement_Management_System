import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Package } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { FormField, Input, Textarea, Select } from '../../components/ui/FormField.jsx'
import { NoProfileGuard } from '../../features/profiles/components/NoProfileGuard.jsx'
import {
  useMyProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
} from '../../features/profiles/hooks/useProfile.js'

const AVAILABILITY_OPTIONS = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'PRE_ORDER', label: 'Pre-Order' },
  { value: 'DISCONTINUED', label: 'Discontinued' },
]

const CONDITION_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'REFURBISHED', label: 'Refurbished' },
]

const PRICE_TYPE_OPTIONS = [
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'NEGOTIABLE', label: 'Negotiable' },
  { value: 'CONTACT_FOR_PRICE', label: 'Contact for Price' },
]

const AVAILABILITY_BADGE = {
  IN_STOCK: 'success',
  OUT_OF_STOCK: 'danger',
  PRE_ORDER: 'warning',
  DISCONTINUED: 'default',
}

const emptyForm = {
  title: '', description: '', price: '', currency: 'ETB',
  price_type: 'FIXED', brand: '', condition: '', availability: 'IN_STOCK',
  tags: '', is_featured: false, is_published: false,
}

function ProductForm({ initial = emptyForm, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial)

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      price: form.price ? parseFloat(form.price) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      condition: form.condition || null,
      brand: form.brand || null,
      description: form.description || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Product Title" required>
        <Input value={form.title} onChange={set('title')} placeholder="e.g. iPhone 15 Pro" required />
      </FormField>

      <FormField label="Description">
        <Textarea value={form.description} onChange={set('description')} rows={3}
          placeholder="Describe the product..." />
      </FormField>

      <div className="grid sm:grid-cols-3 gap-4">
        <FormField label="Price">
          <Input value={form.price} onChange={set('price')} type="number" min="0" step="0.01" placeholder="0.00" />
        </FormField>
        <FormField label="Currency">
          <Select value={form.currency} onChange={set('currency')}>
            <option value="ETB">ETB</option>
            <option value="USD">USD</option>
          </Select>
        </FormField>
        <FormField label="Price Type">
          <Select value={form.price_type} onChange={set('price_type')}>
            {PRICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <FormField label="Brand">
          <Input value={form.brand} onChange={set('brand')} placeholder="e.g. Apple" />
        </FormField>
        <FormField label="Condition">
          <Select value={form.condition} onChange={set('condition')}>
            {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Availability">
          <Select value={form.availability} onChange={set('availability')}>
            {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
      </div>

      <FormField label="Tags" hint="Comma-separated, e.g. phone, electronics, apple">
        <Input value={form.tags} onChange={set('tags')} placeholder="phone, electronics, apple" />
      </FormField>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_published} onChange={set('is_published')}
            className="w-4 h-4 rounded accent-brand" />
          Published
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-ink">
          <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')}
            className="w-4 h-4 rounded accent-brand" />
          Featured
        </label>
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" variant="primary" loading={loading}>Save product</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export default function ProductsPage() {
  const { data, isLoading, error } = useMyProducts()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const products = data?.products || []

  const handleCreate = async (payload) => {
    try {
      await createMutation.mutateAsync(payload)
      setShowForm(false)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create product')
    }
  }

  const handleUpdate = async (id, payload) => {
    try {
      await updateMutation.mutateAsync({ id, data: payload })
      setEditingId(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update product')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete product')
    }
  }

  if (isLoading) return (
    <DashboardLayout title="Products">
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    </DashboardLayout>
  )

  if (error) return (
    <DashboardLayout title="Products">
      <p className="text-sm text-danger">Failed to load products.</p>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Products">
      <div className="space-y-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-ink-3">{products.length} product{products.length !== 1 ? 's' : ''}</p>
          {!showForm && (
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add product
            </Button>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-[14px] font-semibold text-ink mb-4">New product</h3>
            <ProductForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={createMutation.isPending}
            />
          </div>
        )}

        {/* Product list */}
        {products.length === 0 && !showForm ? (
          <div className="bg-surface border border-border rounded-lg p-10 text-center">
            <Package size={32} className="mx-auto text-ink-3 mb-3" />
            <p className="text-[14px] font-semibold text-ink mb-1">No products yet</p>
            <p className="text-[13px] text-ink-3 mb-4">Add products that visitors can see on your profile.</p>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} className="mr-1" />Add your first product
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <div key={product.id}>
                {editingId === product.id ? (
                  <div className="bg-surface border border-brand rounded-lg p-5">
                    <h3 className="text-[14px] font-semibold text-ink mb-4">Edit product</h3>
                    <ProductForm
                      initial={{
                        title: product.title || '',
                        description: product.description || '',
                        price: product.price || '',
                        currency: product.currency || 'ETB',
                        price_type: product.price_type || 'FIXED',
                        brand: product.brand || '',
                        condition: product.condition || '',
                        availability: product.availability || 'IN_STOCK',
                        tags: (product.tags || []).join(', '),
                        is_featured: product.is_featured || false,
                        is_published: product.is_published || false,
                      }}
                      onSave={(payload) => handleUpdate(product.id, payload)}
                      onCancel={() => setEditingId(null)}
                      loading={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded bg-surface-2 shrink-0 overflow-hidden">
                      {product.primary_image ? (
                        <img src={product.primary_image.image_url} alt={product.title}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink-3">
                          <Package size={16} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-semibold text-ink truncate">{product.title}</span>
                        {product.is_featured && <Star size={12} className="text-amber-500 shrink-0" />}
                        <Badge variant={AVAILABILITY_BADGE[product.availability] || 'default'} size="xs">
                          {product.availability?.replace('_', ' ')}
                        </Badge>
                        {!product.is_published && <Badge variant="default" size="xs">Draft</Badge>}
                      </div>
                      {product.price && (
                        <p className="text-[12.5px] text-ink-3 mt-0.5">
                          {product.price.toLocaleString()} {product.currency}
                          {product.price_type !== 'FIXED' && ` · ${product.price_type.replace(/_/g, ' ')}`}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditingId(product.id)}
                        className="p-1.5 text-ink-3 hover:text-ink hover:bg-surface-2 rounded transition-colors"
                        aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(product.id)}
                        className="p-1.5 text-ink-3 hover:text-danger hover:bg-red-50 rounded transition-colors"
                        aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete confirm */}
                {deleteConfirm === product.id && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between gap-3 -mt-px">
                    <p className="text-[13px] text-danger font-medium">Delete &ldquo;{product.title}&rdquo;?</p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="xs" onClick={() => handleDelete(product.id)}
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
    </DashboardLayout>
  )
}
