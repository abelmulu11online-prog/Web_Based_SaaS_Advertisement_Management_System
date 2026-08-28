/**
 * CreateAdPage — create a new advertisement.
 * Route: /dashboard/advertisements/new
 */
import { useNavigate, Link } from 'react-router-dom'
import { useCreateAdvertisement } from '../features/advertisements/hooks/useAdvertisements.js'
import { AdvertisementForm } from '../features/advertisements/components/AdvertisementForm.jsx'
import { Navbar } from '../components/layout/Navbar.jsx'

export default function CreateAdPage() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('accessToken')
  const createMut = useCreateAdvertisement()

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2>Please log in to create an advertisement</h2>
          <Link to="/login" style={{ color: 'var(--accent)' }}>Go to login</Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(data) {
    const ad = await createMut.mutateAsync(data)
    navigate(`/dashboard/advertisements/${ad.id}/edit`, {
      state: { created: true },
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px', textAlign: 'left' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px' }}>
          <Link to="/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Dashboard</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span>New Advertisement</span>
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: '28px' }}>Create Advertisement</h1>
        <p style={{ margin: '0 0 28px', color: 'var(--text)' }}>
          Fill in the details below. Your advertisement will be saved as a draft first — you can publish it from the dashboard.
        </p>

        <AdvertisementForm
          onSubmit={handleSubmit}
          isLoading={createMut.isPending}
          submitLabel="Save as Draft"
        />
      </main>
    </div>
  )
}
