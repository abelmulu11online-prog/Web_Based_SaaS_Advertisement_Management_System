/**
 * PageShell.jsx
 *
 * Shared wrapper for all public editorial / document pages:
 * About, Contact, Privacy Policy, Terms of Service.
 *
 * Provides the consistent outer chrome: Navbar + scrollable main + Footer.
 * The `contained` prop (default true) centres content in a reading-width column.
 * The `wide` prop uses a wider max-width (for Contact's two-column layout).
 */
import { Navbar } from './Navbar.jsx'
import { Footer } from './Footer.jsx'

/**
 * @param {boolean} contained — wrap children in a centred, max-width column (default: true)
 * @param {boolean} wide      — use max-w-4xl instead of prose-page width (default: false)
 * @param {string}  className — extra classes for the inner wrapper
 * @param {node}    children
 */
export function PageShell({ contained = true, wide = false, className = '', children }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 w-full"
      >
        {contained ? (
          <div
            className={[
              'mx-auto px-5 sm:px-8 py-12 sm:py-16',
              wide ? 'max-w-4xl' : 'max-w-[44rem]',
              className,
            ].join(' ')}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </main>

      <Footer />
    </div>
  )
}
