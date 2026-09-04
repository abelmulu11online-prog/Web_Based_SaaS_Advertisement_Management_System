import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FormField, Input } from '../components/ui/FormField.jsx'
import { login } from '../features/auth/services/authService.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setError('')
  }

  function decodeJwtRole(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload?.role ?? null
    } catch {
      return null
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.identifier || !form.password) { setError('Email and password are required.'); return }
    setLoading(true)
    try {
      const data = await login({ identifier: form.identifier, password: form.password })
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      // Redirect admins to the admin dashboard; everyone else follows the original destination
      const role = decodeJwtRole(data.accessToken)
      const destination = role === 'ADMIN' ? '/admin' : from
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-ink mb-1.5">Welcome back</h1>
            <p className="text-sm text-ink-2">
              New to GebetaMarket?{' '}
              <Link to="/register" className="text-brand font-medium hover:underline">Create a free account</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <FormField label="Email address" required>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <Input
                  type="email"
                  name="identifier"
                  placeholder="you@example.com"
                  value={form.identifier}
                  onChange={e => set('identifier', e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </FormField>

            <FormField label="Password" required>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </FormField>

            <div className="flex justify-end -mt-1">
              <Link to="/forgot-password" className="text-[13px] text-ink-2 hover:text-brand transition-colors">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="bg-danger-bg border border-red-200 rounded px-3.5 py-2.5 text-[13px] text-danger">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth className="mt-1">
              Log in
            </Button>
          </form>

          <p className="text-center text-[12px] text-ink-3 mt-6">
            By continuing you agree to our{' '}
            <Link to="#" className="underline hover:text-ink-2">Terms</Link> and{' '}
            <Link to="#" className="underline hover:text-ink-2">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
