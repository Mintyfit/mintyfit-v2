'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ShoppingCartLink from './ShoppingCartLink'

const NAV_LINKS = [
  { href: '/recipes', label: 'Recipes', icon: '🍽️' },
  { href: '/menus', label: 'Menus', icon: '🥗' },
  { href: '/plan', label: 'Planner', icon: '📅' },
  { href: '/shopping-list', label: 'Shopping', icon: '🛒' },
  { href: '/statistics', label: 'Stats', icon: '📊' },
]

export default function AppNav() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.25rem',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link href="/" style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--primary)',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}>
            🌿 MintyFit
          </Link>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hide-mobile">
            {NAV_LINKS.map(link => {
              const active = pathname?.startsWith(link.href)
              const linkStyle = {
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.875rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary)' : 'var(--text-2)',
                background: active ? 'rgba(61,138,62,0.08)' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
              }
              if (link.href === '/shopping-list') {
                return (
                  <ShoppingCartLink key={link.href} active={active} style={linkStyle}>
                    <span>{link.icon}</span>
                    {link.label}
                  </ShoppingCartLink>
                )
              }
              return (
                <Link key={link.href} href={link.href} style={linkStyle}>
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Desktop right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="hide-mobile">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: '0.4rem 0.6rem',
                fontSize: '1rem',
                lineHeight: 1,
                color: 'var(--text-2)',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            {!loading && (
              user ? (
                <>
                  <Link href="/my-account" style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}>
                    {user.email?.[0]?.toUpperCase() || '?'}
                  </Link>
                </>
              ) : (
                <Link href="/?auth=login" style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                }}>
                  Sign in
                </Link>
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
            gap: '0.5rem',
          }}>
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--text-2)',
                fontWeight: 500,
                background: pathname?.startsWith(link.href) ? 'rgba(61,138,62,0.08)' : 'transparent',
              }}>
                {link.icon} {link.label}
              </Link>
            ))}
            {/* Dark mode toggle in mobile menu */}
            <button
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text-2)',
                fontSize: '0.9375rem',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {dark ? '☀️ Light mode' : '🌙 Dark mode'}
            </button>
            {!loading && user && (
              <button onClick={() => { signOut(); setMenuOpen(false) }} style={{
                padding: '0.75rem',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text-3)',
                textAlign: 'left',
                fontSize: '0.9375rem',
              }}>
                Sign out
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Mobile bottom nav */}
      <div className="show-mobile" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'var(--bg-nav)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: '60px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_LINKS.map(link => {
          const active = pathname?.startsWith(link.href)
          const mobileStyle = {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textDecoration: 'none',
            color: active ? 'var(--primary)' : 'var(--text-3)',
            fontSize: '0.625rem',
            fontWeight: active ? 600 : 400,
            padding: '0.5rem 0.75rem',
          }
          if (link.href === '/shopping-list') {
            return (
              <ShoppingCartLink key={link.href} active={active} style={mobileStyle}>
                <span style={{ fontSize: '1.25rem' }}>{link.icon}</span>
                {link.label}
              </ShoppingCartLink>
            )
          }
          return (
            <Link key={link.href} href={link.href} style={mobileStyle}>
              <span style={{ fontSize: '1.25rem' }}>{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </div>
    </>
  )
}
