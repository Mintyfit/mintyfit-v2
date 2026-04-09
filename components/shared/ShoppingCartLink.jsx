'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

// Renders the shopping list nav link with a live unchecked-item badge.
// Fetches /api/shopping-list/count once on mount (and when user changes).
export default function ShoppingCartLink({ active, style, children }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) { setCount(0); return }
    let cancelled = false
    fetch('/api/shopping-list/count')
      .then(r => r.json())
      .then(d => { if (!cancelled) setCount(d.count ?? 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user])

  return (
    <Link href="/shopping-list" style={{ position: 'relative', ...style }}>
      {children}
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-6px',
          minWidth: '17px',
          height: '17px',
          borderRadius: '9px',
          background: 'var(--primary)',
          color: '#fff',
          fontSize: '0.625rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 3px',
          lineHeight: 1,
          pointerEvents: 'none',
        }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
