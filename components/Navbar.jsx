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
import AuthModal from '@/components/landing/AuthModal'

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
  { id: 'shopping',   path: '/shopping-list', label: 'Shop', icon: ShoppingCart, auth: false },
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
  const [authOpen,       setAuthOpen]       = useState(false)
  const [authTab,        setAuthTab]        = useState('signin')
  const dropdownRef = useRef(null)

  const initials    = getInitials(profile, user)
  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Account'
  const logoSrc     = '/images/Mintyfit.svg'

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
      <style>{`
        .mf-nav-mobile { display: none; }
        .mf-nav-desktop { display: block; }
        .mf-nav-bottom { display: none; }
        @media (max-width: 900px) {
          .mf-nav-mobile { display: flex; }
          .mf-nav-desktop { display: none !important; }
          .mf-nav-bottom { display: block; }
          body { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
        }

        .mf-nav-link {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 14px; border-radius: 10px;
          color: var(--text-3); font-weight: 500; font-size: 15px;
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: background 0.15s ease, color 0.15s ease, transform 0.08s ease;
        }
        .mf-nav-link:hover {
          background: rgba(61,138,62,0.10);
          color: var(--primary);
        }
        .mf-nav-link:active {
          background: rgba(61,138,62,0.20);
          transform: translateY(1px);
        }
        .mf-nav-link:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        .mf-nav-link--active {
          background: #dcfce7;
          color: var(--primary);
          font-weight: 700;
          border-bottom-color: var(--primary);
        }

        .mf-icon-btn {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-subtle, #f3f4f6); color: var(--text-2);
          border: 1px solid var(--border, #e5e7eb);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .mf-icon-btn:hover { background: rgba(61,138,62,0.10); color: var(--primary); }
        .mf-icon-btn:active { background: rgba(61,138,62,0.20); }

        .mf-bottom-link {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 3px; padding: 8px 4px;
          color: var(--text-3); text-decoration: none; min-height: 56px;
          border-top: 2px solid transparent;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .mf-bottom-link:active { background: rgba(61,138,62,0.10); }
        .mf-bottom-link--active {
          color: var(--primary);
          border-top-color: var(--primary);
        }
      `}</style>

      {/* Mobile Header */}
      <div className="mf-nav-mobile" style={{
        justifyContent: 'space-between', alignItems: 'center',
        height: 60, backgroundColor: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 2px 8px var(--shadow, rgba(0,0,0,0.04))',
        position: 'sticky', top: 0, zIndex: 200,
        padding: '0 12px',
      }}>
        <button onClick={() => setMobileMenuOpen(o => !o)} className="mf-icon-btn" aria-label="Menu">
          {mobileMenuOpen ? <X size={20} /> : <Hamburger size={20} />}
        </button>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logoSrc} alt="MintyFit" width="120" height="36" style={{ height: 36, objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggle} className="mf-icon-btn" aria-label="Toggle theme"
            style={{ color: dark ? '#F0C060' : 'var(--text-3)' }}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mf-nav-mobile" style={{
          flexDirection: 'column', position: 'fixed', top: 60, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--bg-nav)', zIndex: 199, overflowY: 'auto', padding: '8px 0 24px', borderTop: '1px solid var(--border)',
        }}>
          {DESKTOP_TABS.filter(t => !t.auth || user).map(t => (
            <Link key={t.id} href={t.path} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: '1px solid var(--border)',
              color: isTabActive(t, pathname) ? 'var(--primary)' : 'var(--text-2)',
              fontSize: 16, fontWeight: isTabActive(t, pathname) ? 700 : 500, textDecoration: 'none',
              background: isTabActive(t, pathname) ? 'rgba(61,138,62,0.06)' : 'transparent',
            }}><t.icon size={20} />{t.label}</Link>
          ))}
          {user && (
            <>
              <Link href="/my-account" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 16, fontWeight: 500, textDecoration: 'none' }}><User size={20} />My Account</Link>
              <Link href="/my-family" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 16, fontWeight: 500, textDecoration: 'none' }}><Users size={20} />My Family</Link>
            </>
          )}
          <div style={{ marginTop: 12, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!user && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setAuthTab('signin'); setAuthOpen(true); setMobileMenuOpen(false) }} style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-1)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
                <button onClick={() => { setAuthTab('signup'); setAuthOpen(true); setMobileMenuOpen(false) }} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Get Started</button>
              </div>
            )}
            {user && (
              <button onClick={handleSignOut} style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FEE2E2', color: '#E53E3E', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}><LogOut size={16} />Sign Out</button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="mf-nav-bottom" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        backgroundColor: 'var(--bg-nav)', borderTop: '1px solid var(--border)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', width: '100%' }}>
          {MOBILE_TABS.filter(t => !t.auth || user).map(t => (
            <Link key={t.id} href={t.path}
              className={`mf-bottom-link${isTabActive(t, pathname) ? ' mf-bottom-link--active' : ''}`}>
              <t.icon size={20} strokeWidth={isTabActive(t, pathname) ? 2.5 : 1.8} />
              <span style={{ fontSize: 11, fontWeight: isTabActive(t, pathname) ? 700 : 500 }}>{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => { setAuthOpen(false); router.refresh() }}
        defaultTab={authTab}
      />

      {/* Desktop Nav */}
      <nav className="mf-nav-desktop" style={{
        position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bg-nav)', borderBottom: '1px solid var(--border)', boxShadow: '0 2px 8px var(--shadow, rgba(0,0,0,0.04))',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 16px', height: 63 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', marginRight: 28 }}><img src={logoSrc} alt="MintyFit" width="134" height="40" style={{ height: 40, objectFit: 'contain' }} /></Link>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {DESKTOP_TABS.filter(t => !t.auth || user).map(t => (
              <Link key={t.id} href={t.path}
                className={`mf-nav-link${isTabActive(t, pathname) ? ' mf-nav-link--active' : ''}`}>
                <t.icon size={18} />{t.label}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading ? <div style={{ width: 88, height: 36, borderRadius: 10, backgroundColor: '#dcfce7' }} />
            : !user ? <><button onClick={() => { setAuthTab('signin'); setAuthOpen(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, backgroundColor: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 16, border: '1px solid var(--border)', cursor: 'pointer' }}>Sign In</button><button onClick={() => { setAuthTab('signup'); setAuthOpen(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, backgroundColor: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer' }}><LogIn size={17} />Get Started</button></>
            : <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setDropdownOpen(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, backgroundColor: 'var(--bg-subtle, #f3f4f6)', color: 'var(--text-2)', fontWeight: 500, fontSize: 16, border: 'none', cursor: 'pointer' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{initials}</div><span>{displayName}</span><ChevronDown size={15} />
                </button>
                {dropdownOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, zIndex: 200 }}>
                    <Link href="/my-account" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}><User size={16} />My Account</Link>
                    <Link href="/my-family" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}><Users size={16} />My Family</Link>
                    {isNutritionist && <Link href="/nutritionist" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}>👥 My Clients</Link>}
                    {isSuperAdmin && <Link href="/admin" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: 'var(--text-2)', fontSize: 16, textDecoration: 'none' }}>⚙️ Admin</Link>}
                    <div style={{ height: 1, backgroundColor: 'var(--border)' }} />
                    <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: '#E53E3E', fontSize: 16, width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}><LogOut size={16} />Sign Out</button>
                  </div>
                )}
              </div>}
            <button onClick={toggle} className="mf-icon-btn" aria-label="Toggle theme"
              style={{ width: 44, height: 44, borderRadius: 12, color: dark ? '#F0C060' : 'var(--text-3)' }}>
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
