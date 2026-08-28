/**
 * LoginPage.jsx — Sign in with email + password.
 * Route: /login
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { login } from '../features/auth/services/authService.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // Redirect back to where the user came from (e.g. /pricing) after login
  const from = location.state?.from || '/dashboard'

  const [form, setForm]     = useState({ identifier: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.identifier || !form.password) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await login({ identifier: form.identifier, password: form.password })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '400px', margin: '0 auto', padding: '60px 20px' }}>

        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', margin: '0 0 28px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Sign up free
          </Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Email" required>
            <Input
              name="identifier"
              type="email"
              placeholder="you@example.com"
              value={form.identifier}
              onChange={handleChange}
              autoFocus
              autoComplete="email"
            />
          </FormField>

          <FormField label="Password" required>
            <Input
              name="password"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </FormField>

          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fca5a5',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '14px', color: '#991b1b',
            }}>
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: '4px' }}>
            Log in
          </Button>
        </form>

        <p style={{ fontSize: '13px', color: 'var(--text)', marginTop: '24px', textAlign: 'center' }}>
          <Link to="/pricing" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            View pricing plans
          </Link>
        </p>
      </main>
    </div>
  )
}
