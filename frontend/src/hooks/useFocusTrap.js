/**
 * useFocusTrap.js
 *
 * A reusable hook that traps keyboard focus inside a given container
 * while the trap is active. Implements the ARIA APG modal focus-trap pattern.
 *
 * Usage:
 *   const trapRef = useFocusTrap(isOpen)
 *   <div ref={trapRef} role="dialog" aria-modal="true">…</div>
 *
 * When isActive becomes true:
 *   - Focus moves to the first focusable child (or the container itself)
 *   - Tab / Shift+Tab cycle only within the container
 *   - Escape calls the optional onEscape callback
 *
 * When isActive becomes false:
 *   - Focus returns to the element that was focused before the trap opened
 */
import { useEffect, useRef, useCallback } from 'react'

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(', ')

/**
 * @param {boolean} isActive  — whether the trap is currently active
 * @param {Function} [onEscape] — called when Escape is pressed
 * @returns {React.RefObject} — attach this ref to the container element
 */
export function useFocusTrap(isActive, onEscape) {
  const containerRef = useRef(null)
  // Remember which element was focused before the trap opened
  const previouslyFocusedRef = useRef(null)

  const getFocusable = useCallback(() => {
    if (!containerRef.current) return []
    return Array.from(
      containerRef.current.querySelectorAll(FOCUSABLE_SELECTORS)
    ).filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none')
  }, [])

  useEffect(() => {
    if (!isActive) return

    // Save currently focused element so we can restore it when trap closes
    previouslyFocusedRef.current = document.activeElement

    // Move focus into the trap on next tick (so the element is rendered)
    const timer = setTimeout(() => {
      const focusable = getFocusable()
      if (focusable.length > 0) {
        focusable[0].focus()
      } else if (containerRef.current) {
        // Fall back to container itself if no focusable children
        containerRef.current.setAttribute('tabindex', '-1')
        containerRef.current.focus()
      }
    }, 0)

    function handleKeyDown(e) {
      if (!containerRef.current) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape?.()
        return
      }

      if (e.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusable[0]
      const last  = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the triggering element
      if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [isActive, onEscape, getFocusable])

  return containerRef
}
