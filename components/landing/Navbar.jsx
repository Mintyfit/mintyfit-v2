'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

export default function Navbar({ onOpenAuth }) {
  const { user, loading: authLoading } = useAuth()
  const { dark, loading: themeLoading } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  const loading = authLoading || themeLoading

  // use a stable default for dark mode to match server render
  const isDark = dark === true

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--bg-nav)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.25rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isDark ? '/images/MintyfitWhite.svg' : '/images/Mintyfit.svg'}
            alt="MintyFit"
            style={{ height: 36, width: 'auto' }}
          />
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }} className="hide-mobile">
          <a href="#how-it-works" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: '0.9375rem' }}>How it works</a>
          <a href="#features" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: '0.9375rem' }}>Features</a>
          <a href="#pricing" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: '0.9375rem' }}>Pricing</a>
          <a href="#faq" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: '0.9375rem' }}>FAQ</a>

{!loading && (
            user ? (
              <Link href="/plan" style={{
                background: 'var(--primary)',
                color: '#fff',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
              }}>
                Open App
              </Link>
            ) : (
              <button
                onClick={onOpenAuth}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                }}
              >
                Sign in
              </button>
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="show-mobile"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: 'var(--text-1)',
          }}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: 'var(--bg-nav)',
          borderTop: '1px solid var(--border)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} style={{ color: 'var(--text-2)', textDecoration: 'none' }}>How it works</a>
          <a href="#features" onClick={() => setMenuOpen(false)} style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ color: 'var(--text-2)', textDecoration: 'none' }}>Pricing</a>
          <a href="#faq" onClick={() => setMenuOpen(false)} style={{ color: 'var(--text-2)', textDecoration: 'none' }}>FAQ</a>
          {!loading && (
            user ? (
              <Link href="/planner" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Open App →</Link>
            ) : (
              <button onClick={() => { onOpenAuth(); setMenuOpen(false) }} style={{
                background: 'var(--primary)', color: '#fff', padding: '0.75rem 1.25rem',
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, textAlign: 'left',
              }}>
                Sign in
              </button>
            )
          )}
        </div>
      )}
    </nav>
  )
}
