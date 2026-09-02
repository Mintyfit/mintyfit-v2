'use client'

import { useEffect, useRef } from 'react'

/**
 * Modal — base dialog primitive. Focus trap, Escape to close, body scroll lock,
 * backdrop click to close, dialog semantics.
 *
 * Props: open, onClose, title (string), children, maxWidth
 */
export default function Modal({ open, onClose, title, children, maxWidth = 420 }) {
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement
    // Focus the panel on open
    setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      ;(focusable || panelRef.current)?.focus()
    }, 0)

    function onKeyDown(e) {
      if (e.key === 'Escape') { onClose?.(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      // Focus trap
      const focusables = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '1.25rem', width: '100%', maxWidth,
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)', outline: 'none',
        }}
      >
        {title && (
          <h2 style={{ fontSize: 'var(--text-lg, 1.125rem)', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 0.75rem' }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}
