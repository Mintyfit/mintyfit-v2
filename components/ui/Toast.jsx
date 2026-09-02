'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

/**
 * Toast — global notification system. Replaces alert().
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Saved') / toast.error('Failed') / toast.info('…')
 *
 * Accessibility: aria-live="polite" region; errors use role="alert".
 */
const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const show = useCallback((type, message, durationMs = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev.slice(-3), { id, type, message }]) // max 4 visible
    timers.current.set(id, setTimeout(() => dismiss(id), durationMs))
  }, [dismiss])

  const api = {
    success: (m, d) => show('success', m, d),
    error: (m, d) => show('error', m, d ?? 6000),
    info: (m, d) => show('info', m, d),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed', bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
          left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          width: 'min(92vw, 420px)', pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              padding: '0.75rem 1rem', borderRadius: '10px',
              background: t.type === 'error' ? '#7f1d1d' : t.type === 'success' ? '#14532d' : 'var(--bg-card)',
              color: t.type === 'info' ? 'var(--text-1)' : '#fff',
              border: `1px solid ${t.type === 'error' ? '#991b1b' : t.type === 'success' ? '#166534' : 'var(--border)'}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              fontSize: 'var(--text-sm, 0.875rem)', lineHeight: 1.45,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  // Outside provider (shouldn't happen): no-op that never crashes
  return ctx || { success: () => {}, error: () => {}, info: () => {} }
}
