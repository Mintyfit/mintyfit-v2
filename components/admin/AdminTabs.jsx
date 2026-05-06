'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const tabs = [
  { href: '/my-account', label: 'My Account' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/families', label: 'Families' },
  { href: '/admin/nutritionists', label: 'Nutritionists' },
  { href: '/admin/approvals', label: 'Approvals' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/gdpr', label: 'GDPR' },
  { href: '/admin/import-plan', label: 'Import Plan' },
]

export default function AdminTabs() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeTab = tabs.find(t => pathname === t.href || pathname?.startsWith(t.href + '/'))

  return (
    <>
      {/* Desktop tabs - hidden on mobile */}
      <div className="desktop-tabs" style={{
        display: 'flex',
        gap: 4,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 4,
        width: 'fit-content',
        flexWrap: 'wrap',
      }}>
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                background: active ? '#2d6e2e' : 'transparent',
                color: active ? 'white' : '#6b7280',
                padding: '8px 20px',
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Mobile dropdown - hidden on desktop */}
      <div className="mobile-tabs" style={{
        display: 'none',
      }}>
        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            color: '#1f2937',
          }}
        >
          <span>{activeTab?.label || 'Menu'}</span>
          <svg style={{ width: 20, height: 20, color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>
        {mobileOpen && (
          <div style={{
            marginTop: 8,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {tabs.map((tab, i) => {
              const active = pathname === tab.href || pathname?.startsWith(tab.href + '/')
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    background: active ? '#f0fdf4' : 'transparent',
                    color: active ? '#2d6e2e' : '#1f2937',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    borderBottom: i < tabs.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-tabs { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-tabs { display: none !important; }
          .mobile-tabs { display: block !important; }
        }
      `}</style>
    </>
  )
}
