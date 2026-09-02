'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import Modal from './Modal'

/**
 * ConfirmDialog — global, styled, accessible confirm(). Replaces window.confirm.
 *
 * Usage:
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: 'Clear day?', body: '…', destructive: true }))) return
 *
 * Returns a Promise<boolean>.
 */
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { title, body, confirmLabel, destructive }
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState(typeof options === 'string' ? { body: options } : options)
    })
  }, [])

  const settle = useCallback((value) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => settle(false)}
        title={state?.title || 'Are you sure?'}
      >
        {state?.body && (
          <p style={{ fontSize: 'var(--text-sm, 0.875rem)', color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 1rem' }}>
            {state.body}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => settle(false)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-2)', fontWeight: 600,
              fontSize: 'var(--text-sm, 0.875rem)', cursor: 'pointer', minHeight: 40,
            }}
          >
            {state?.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={() => settle(true)}
            autoFocus
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
              background: state?.destructive ? '#dc2626' : 'var(--primary)',
              color: '#fff', fontWeight: 600,
              fontSize: 'var(--text-sm, 0.875rem)', cursor: 'pointer', minHeight: 40,
            }}
          >
            {state?.confirmLabel || 'Confirm'}
          </button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  // Outside provider: fall back to native confirm so nothing breaks
  return ctx || ((opts) => Promise.resolve(window.confirm(typeof opts === 'string' ? opts : (opts?.body || opts?.title || 'Are you sure?'))))
}
