/**
 * HomePage — public-facing landing page.
 * Phase 5: links to advertisement listing and dashboard.
 */
import { Link } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar.jsx'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main>
        {/* Hero */}
        <section
          style={{
            padding: '80px 20px',
            maxWidth: '700px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '48px', marginBottom: '16px', letterSpacing: '-1.5px' }}>
            Discover Local Businesses &amp; Services
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '36px', lineHeight: 1.6 }}>
            Browse thousands of advertisements for products, services, skills, jobs, and more.
            Connect directly with advertisers — no middleman, no platform fees.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/ads"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                textDecoration: 'none',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              Browse Advertisements
            </Link>
            <Link
              to="/dashboard"
              style={{
                background: 'var(--code-bg)',
                color: 'var(--text-h)',
                textDecoration: 'none',
                padding: '14px 28px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '16px',
                border: '1px solid var(--border)',
              }}
            >
              Post an Advertisement
            </Link>
          </div>
        </section>

        {/* Features */}
        <section
          style={{
            padding: '40px 20px 80px',
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              { icon: '🛍️', title: 'Products', desc: 'Find items for sale near you' },
              { icon: '🔧', title: 'Services', desc: 'Hire skilled professionals' },
              { icon: '💡', title: 'Skills', desc: 'Connect with talented individuals' },
              { icon: '💼', title: 'Jobs', desc: 'Discover opportunities nearby' },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  padding: '24px',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  background: 'var(--bg)',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>{f.icon}</div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
