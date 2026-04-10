'use client'

import { Suspense, useState, useMemo } from 'react'
import Link from 'next/link'

const APP_LINKS = [
  { href: '/recipes', label: 'Recipes' },
  { href: '/menus', label: 'Menus' },
  { href: '/plan', label: 'Plan' },
  { href: '/shopping-list', label: 'Shopping' },
  { href: '/statistics', label: 'Stats' },
  { href: '/blog', label: 'Blog' },
]

function NavItems({ onOpenAuth }) {
  const [menuOpen, setMenuOpen] = useState(false)
  
  const linkStyle = useMemo(() => ({
    color: 'var(--text-2)',
    textDecoration: 'none',
    fontSize: '0.9375rem',
    fontWeight: 500,
  }), [])

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
          <img
            src="/images/Mintyfit.svg"
            alt="MintyFit"
            style={{ height: 36, width: 'auto' }}
          />
        </Link>

        {/* Desktop nav - always same content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="hide-mobile">
          {APP_LINKS.map(link => (
            <Link key={link.href} href={link.href} style={linkStyle}>
              {link.label}
            </Link>
          ))}
          
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
          </svg>
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
          {APP_LINKS.map(link => (
            <Link 
              key={link.href} 
              href={link.href} 
              onClick={() => setMenuOpen(false)}
              style={{ color: 'var(--text-2)', textDecoration: 'none' }}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={() => { onOpenAuth(); setMenuOpen(false) }} style={{
            background: 'var(--primary)', color: '#fff', padding: '0.75rem 1.25rem',
            borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            Sign in
          </button>
        </div>
      )}
    </nav>
  )
}

export default function Navbar({ onOpenAuth }) {
  return (
    <Suspense fallback={<nav style={{ height: 64 }} />}>
      <NavItems onOpenAuth={onOpenAuth} />
    </Suspense>
  )
}