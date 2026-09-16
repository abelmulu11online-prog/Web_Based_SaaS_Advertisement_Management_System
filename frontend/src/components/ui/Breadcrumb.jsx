/**
 * Breadcrumb.jsx
 *
 * Accessible, styled breadcrumb navigation.
 * Uses semantic <nav> + <ol> structure per WAI-ARIA Breadcrumb pattern.
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'Home', to: '/' },
 *     { label: 'About us' },          // no `to` = current page
 *   ]} />
 *
 * The last item (no `to`) is automatically marked aria-current="page".
 */
import { Link } from 'react-router-dom'

/**
 * @param {{ label: string, to?: string }[]} items
 */
export function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb-nav">
      <ol
        className="flex items-center flex-wrap gap-x-1.5 gap-y-1"
        style={{ listStyle: 'none', padding: 0, margin: 0 }}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {isLast || !item.to ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'text-ink font-medium' : 'text-ink-3'}
                >
                  {item.label}
                </span>
              ) : (
                <Link to={item.to}>
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-ink-4 shrink-0"
                >
                  <path
                    d="M4.5 2.5L7.5 6L4.5 9.5"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
