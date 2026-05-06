'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen, CalendarDays, ScrollText,
  User, Moon, Sun, LogIn, ChevronDown, LogOut, BarChart2, Newspaper,
  Menu as Hamburger, X, Users, ShoppingCart,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

const DESKTOP_TABS = [
  { id: 'recipes',    path: '/recipes',    label: 'Recipes',  icon: BookOpen,     auth: false },
  { id: 'menus',      path: '/menus',      label: 'Menus',    icon: ScrollText,   auth: false },
  { id: 'plan',       path: '/plan',       label: 'Plan',     icon: CalendarDays, auth: false },
  { id: 'statistics', path: '/statistics', label: 'Stats',    icon: BarChart2,    auth: false },
  { id: 'shopping',   path: '/shopping-list', label: 'Shopping', icon: ShoppingCart, auth: false },
  { id: 'blog',       path: '/blog',       label: 'Blog',    icon: Newspaper,    auth: false },
]

const MOBILE_TABS = [
  { id: 'recipes',    path: '/recipes',    label: 'Recipes',  icon: BookOpen,     auth: false },
  { id: 'menus',      path: '/menus',      label: 'Menus',    icon: ScrollText,   auth: false },
  { id: 'plan',       path: '/plan',       label: 'Plan',     icon: CalendarDays, auth: false },
  { id: 'statistics', path: '/statistics', label: 'Stats',    icon: BarChart2,    auth: false },
  { id: 'shopping',   path: '/shopping-list', label: 'Shopping', icon: ShoppingCart, auth: false },
]

function isTabActive(tab, pathname) {
  return pathname.startsWith(tab.path)
}

function getInitials(profile, user) {
  if (profile?.full_name) {
    return profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }
  return (user?.email?.[0] ?? '?').toUpperCase()
}

export default function Navbar() {
  const pathname = usePathname() || '/'
  const router   = useRouter()
  const { user, profile, loading, signOut, isNutritionist, isSuperAdmin } = useAuth()
  const { dark, toggle } = useTheme()

  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  const initials    = getInitials(profile, user)
  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account'
  const logoSrc     = '/images/Mintyfit.svg'

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  async function handleSignOut() {
    setDropdownOpen(false)
    setMobileMenuOpen(false)
    await signOut()
    router.push('/')
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header" style={{
        display: 'none',
        justifyContent: 'space-between', alignItems: 'center',
        height: 60, backgroundColor: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px var(--shadow)',
        position: 'sticky', top: 0, zIndex: 200,
        padding: '0 12px',
      }}>
        <button onClick={() => setMobileMenuOpen(o => !o)} style={{
          width: 38, height: 38, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'var(--bg-subtle)', color: 'var(--text-2)',
          border: 'none', cursor: 'pointer', flexShrink: 0,
        }}>
          {mobileMenuOpen ? <X size={20} /> : <Hamburger size={20} />}
        </button>
        <Link href="/"><img src={logoSrc} alt="MintyFit" width="120" height="36" style={{ height: 36, objectFit: 'contain' }} /></Link>
        {loading ? <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-subtle)' }} />
        : !user ? <button onClick={() => router.push('/onboarding')} style={{ height: 38, padding: '0 14px', borderRadius: 10, background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none' }}>Start</button>
        : <button onClick={() => setMobileMenuOpen(o => !o)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontWeight: 700, border: 'none' }}>{initials}</button>}
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-header" style={{
          display: 'flex', flexDirection: 'column', position: 'fixed', top: 60, left: 0, right: 0, bottom: 0,
          backgroundColor: '#fff', zIndex: 199, overflowY: 'auto', padding: '8px 0 24px', borderTop: '1px solid var(--border-light)',
        }}>
          {DESKTOP_TABS.filter(t => !t.auth || user).map(t => <Link key={t.id} href={t.path} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: '1px solid var(--border-light)',
            color: isTabActive(t, pathname) ? 'var(--primary)' : 'var(--text-2)', fontSize: 16, fontWeight: isTabActive(t, pathname) ? 700 : 500, textDecoration: 'none',
          }}><t.icon size={20} />{t.label}</Link>)}
          <div style={{ marginTop: 8, padding: '0 16px', display: 'flex', gap: 10 }}>
            <button onClick={toggle} style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg-subtle)', color: 'var(--text-2)', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
              {dark ? <><Sun size={16} />Light</> : <><Moon size={16} />Dark</>}
            </button>
            {user && <button onClick={handleSignOut} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FEE2E2', color: '#E53E3E', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}><LogOut size={16} />Out</button>}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav" style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, backgroundColor: '#fff', borderTop: '1px solid var(--border-light)', boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', width: '100%' }}>
          {MOBILE_TABS.filter(t => !t.auth || user).map(t => <Link key={t.id} href={t.path} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '10px 4px',
            color: isTabActive(t, pathname) ? 'var(--primary)' : 'var(--text-3)', textDecoration: 'none', minHeight: 60, borderTop: isTabActive(t, pathname) ? '2px solid var(--primary)' : '2px solid transparent',
          }}><t.icon size={20} strokeWidth={isTabActive(t, pathname) ? 2.5 : 1.8} /><span style={{ fontSize: 11, fontWeight: isTabActive(t, pathname) ? 700 : 400 }}>{t.label}</span></Link>)}
        </div>
      </nav>

      {/* Desktop Nav */}
      <nav className="desktop-nav" style={{
        position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bg-nav)', borderBottom: '1px solid var(--border-light)', boxShadow: '0 2px 8px var(--shadow)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 16px', height: 63 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 28 }}><img src={logoSrc} alt="MintyFit" width="134" height="40" style={{ height: 40, objectFit: 'contain' }} /></Link>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {DESKTOP_TABS.filter(t => !t.auth || user).map(t => <Link key={t.id} href={t.path} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10,
              backgroundColor: isTabActive(t, pathname) ? '#dcfce7' : 'transparent', color: isTabActive(t, pathname) ? 'var(--primary)' : 'var(--text-3)',
              fontWeight: isTabActive(t, pathname) ? 700 : 500, fontSize: 16, textDecoration: 'none', borderBottom: isTabActive(t, pathname) ? '2px solid var(--primary)' : '2px solid transparent',
            }}><t.icon size={18} />{t.label}</Link>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? <div style={{ width: 88, height: 36, borderRadius: 10, backgroundColor: '#dcfce7' }} />
            : !user ? <button onClick={() => router.push('/onboarding')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, backgroundColor: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer' }}><LogIn size={17} />Get Started</button>
            : <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setDropdownOpen(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-2)', fontWeight: 500, fontSize: 16, border: 'none', cursor: 'pointer' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{initials}</div><span>{displayName}</span><ChevronDown size={15} />
                </button>
                {dropdownOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', backgroundColor: '#fff', border: '1px solid var(--border-light)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, zIndex: 200 }}>
                    <Link href="/my-account" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}><User size={16} />My Account</Link>
                    <Link href="/my-family" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}><Users size={16} />My Family</Link>
                    {isNutritionist && <Link href="/nutritionist" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}>👥 My Clients</Link>}
                    {isSuperAdmin && <Link href="/admin" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}>⚙️ Admin</Link>}
                    <div style={{ height: 1, backgroundColor: 'var(--border-light)' }} />
                    <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: '#E53E3E', fontSize: 16, width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={16} />Sign Out</button>
                  </div>
                )}
              </div>}
            <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, backgroundColor: dark ? '#30363D' : 'var(--bg-subtle)', color: dark ? '#F0C060' : 'var(--text-3)', border: 'none', cursor: 'pointer' }}>{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
          </div>
        </div>
      </nav>
    </>
  )
}
