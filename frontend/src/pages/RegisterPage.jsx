/**
 * RegisterPage.jsx — Create a new account with email + password.
 * Route: /register
 *
 * After successful registration, auto-logs in and redirects to /pricing
 * so the user can immediately pick a plan.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { register, login } from '../features/auth/services/authService.js'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm]     = useState({ email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(err => ({ ...err, [e.target.name]: '' }))
    setServerError('')
  }

  function validate() {
    const e = {}
    if (!form.email)    e.email    = 'Email is required.'
    if (!form.password) e.password = 'Password is required.'
    else if (form.password.length < 8) e.password = 'At least 8 characters.'
    else if (!/[A-Z]/.test(form.password)) e.password = 'Include at least one uppercase letter.'
    else if (!/[0-9]/.test(form.password)) e.password = 'Include at least one number.'
    else if (!/[^a-zA-Z0-9]/.test(form.password)) e.password = 'Include at least one special character.'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }
    setLoading(true)
    setServerError('')
    try {
      // Register then auto-login
      await register({ email: form.email, password: form.password })
      const data = await login({ identifier: form.email, password: form.password })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      // Send to pricing page so they can subscribe right away
      navigate('/pricing', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: '400px', margin: '0 auto', padding: '60px 20px' }}>

        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 6px' }}>
          Create your account
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text)', margin: '0 0 28px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Log in
          </Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField label="Email" required error={errors.email}>
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              autoFocus
              autoComplete="email"
            />
          </FormField>

          <FormField
            label="Password"
            required
            error={errors.password}
            hint="Min 8 chars, uppercase, number, and special character"
          >
            <Input
              name="password"
              type="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="Confirm password" required error={errors.confirm}>
            <Input
              name="confirm"
              type="password"
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={handleChange}
              error={errors.confirm}
              autoComplete="new-password"
            />
          </FormField>

          {serverError && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fca5a5',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '14px', color: '#991b1b',
            }}>
              {serverError}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: '4px' }}>
            Create account
          </Button>
        </form>

        <p style={{ fontSize: '13px', color: 'var(--text)', marginTop: '20px', textAlign: 'center', lineHeight: 1.5 }}>
          By signing up you agree to our terms of service.
          After registering you'll be taken to the pricing page to choose a plan.
        </p>
      </main>
    </div>
  )
}
