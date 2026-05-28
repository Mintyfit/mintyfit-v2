'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function HeroCTA({ onOpenAuth }) {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ height: '96px' }} />

  if (user) {
    return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
        <Link href="/planner" style={{
          display: 'inline-block',
          background: 'var(--primary)',
          color: '#fff',
          padding: '1rem 2rem',
          borderRadius: '12px',
          fontWeight: 700,
          fontSize: '1.0625rem',
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(61,138,62,0.35)',
        }}>
          Open App →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
      <Link href="/onboarding" style={{
        display: 'inline-block',
        background: 'var(--primary)',
        color: '#fff',
        padding: '1rem 2rem',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '1.0625rem',
        textDecoration: 'none',
        boxShadow: '0 4px 14px rgba(61,138,62,0.35)',
        whiteSpace: 'nowrap',
      }}>
        GO
      </Link>
    </div>
  )
}
