/**
 * FormField.jsx — Accessible form-field wrapper + input primitives.
 *
 * Exports: FormField, Input, Textarea, Select
 *
 * Design principles:
 * - Labels are always visible (no placeholder-only patterns)
 * - Error messages are announced via role="alert" + aria-live
 * - Error state changes border AND adds aria-invalid="true"
 * - Hint text wired with matching id for aria-describedby
 * - Input height is 40px (h-10) — comfortable tap target on mobile
 * - Focus ring: 1px white gap + 2px brand ring for contrast on any bg
 */

/* ── FormField wrapper ─────────────────────────────────────────────────────── */

/**
 * @param {string}  id        — stem id; label gets htmlFor={id}, error gets id="${id}-error"
 * @param {string}  label     — visible label text
 * @param {string}  error     — validation error (renders below input)
 * @param {string}  hint      — helper text shown when no error
 * @param {boolean} required  — shows visual * and sr-only "(required)"
 * @param {node}    children  — the input element(s)
 */
export function FormField({ id, label, error, hint, required, children, className = '' }) {
  const errorId = id ? `${id}-error` : undefined
  const hintId  = id ? `${id}-hint`  : undefined

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-[13px] font-medium text-ink leading-none select-none"
        >
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true"> *</span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}

      {children}

      {hint && !error && (
        <p id={hintId} className="text-[12px] text-ink-3 leading-snug">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-[12px] text-danger leading-snug flex items-center gap-1.5"
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="shrink-0"
          >
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
            <path d="M6 4v2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <circle cx="6" cy="8.5" r="0.625" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Shared base styles ────────────────────────────────────────────────────── */

/*
 * Single source of truth for all input primitives.
 * h-10 = 40px — comfortable touch target on mobile.
 * The global `input:focus-visible` rule in index.css handles
 * the refined focus ring (1px white gap + 2px brand ring).
 */
const inputBase = [
  'w-full font-sans text-[14px] text-ink bg-surface',
  'border border-border-2 rounded-lg',
  'px-3.5 h-10',
  'outline-none transition-colors duration-150',
  'placeholder:text-ink-3 placeholder:text-[13.5px]',
  'focus:border-brand',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2',
  'focus-visible:outline-none',
].join(' ')

const errorClass = 'border-danger focus:border-danger focus:ring-danger/20'

/* ── Input ─────────────────────────────────────────────────────────────────── */

/**
 * Accessible single-line text input.
 * Automatically sets aria-invalid when `error` is truthy.
 * Pass aria-describedby="${id}-error" alongside to announce errors on focus.
 */
export function Input({ error, className = '', ...props }) {
  return (
    <input
      aria-invalid={error ? 'true' : undefined}
      className={`${inputBase} ${error ? errorClass : ''} ${className}`}
      {...props}
    />
  )
}

/* ── Textarea ──────────────────────────────────────────────────────────────── */

/**
 * Accessible multiline textarea.
 * min-h: 110px so the default state looks intentionally sized.
 */
export function Textarea({ error, rows = 5, className = '', ...props }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={error ? 'true' : undefined}
      className={[
        'w-full font-sans text-[14px] text-ink bg-surface',
        'border border-border-2 rounded-lg',
        'px-3.5 py-2.5',
        'outline-none transition-colors duration-150',
        'placeholder:text-ink-3 placeholder:text-[13.5px]',
        'focus:border-brand',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2',
        'resize-vertical min-h-[110px]',
        'focus-visible:outline-none',
        error ? errorClass : '',
        className,
      ].join(' ')}
      {...props}
    />
  )
}

/* ── Select ────────────────────────────────────────────────────────────────── */

export function Select({ error, children, className = '', ...props }) {
  return (
    <select
      aria-invalid={error ? 'true' : undefined}
      className={`${inputBase} cursor-pointer ${error ? errorClass : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
