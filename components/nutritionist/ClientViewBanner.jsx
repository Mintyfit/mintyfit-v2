'use client'

import Link from 'next/link'

export default function ClientViewBanner({ clientName, pageLabel, backHref, children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3fff0',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
        padding: '0.75rem 1rem',
        background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid #93c5fd',
        fontSize: '0.875rem', color: '#1e40af',
      }}>
        <span style={{ fontWeight: 600 }}>
          Viewing {clientName}'s {pageLabel}
        </span>
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Changes you make will save to their account
        </span>
        <Link href={backHref} style={{
          marginLeft: 'auto', background: 'transparent', border: '1px solid #93c5fd',
          borderRadius: '6px', padding: '0.25rem 0.75rem', cursor: 'pointer',
          fontSize: '0.8125rem', color: '#1e40af', textDecoration: 'none',
        }}>
          Back to my {pageLabel === 'plan' ? 'plan' : 'stats'}
        </Link>
      </div>
      {children}
    </div>
  )
}
