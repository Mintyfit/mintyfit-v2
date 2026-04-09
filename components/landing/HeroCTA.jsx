'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function HeroCTA({ onOpenAuth }) {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ height: '96px' }} />

  if (user) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
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
        Plan Your Family's First Week — Free →
      </Link>
      <a href="#how-it-works" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        color: 'var(--text-2)',
        textDecoration: 'none',
        fontSize: '0.9375rem',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
        See how it works
      </a>
    </div>
  )
}
