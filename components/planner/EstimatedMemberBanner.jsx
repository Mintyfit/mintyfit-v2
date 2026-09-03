'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Warns when one or more family members are using age/gender reference
 * estimates (instead of measured weight/height) for their calorie targets and
 * nutrition figures — so the numbers shown are approximate for those members.
 *
 * members: enriched member array (from enrichMember — carries isEstimated)
 */
export default function EstimatedMemberBanner({ members }) {
  const [dismissed, setDismissed] = useState(false)
  const estimated = (members || []).filter(m => m?.isEstimated)
  if (dismissed || estimated.length === 0) return null

  const names = estimated
    .map(m => m.display_name || m.first_name || m.name || m.full_name || 'Member')
    .slice(0, 3)
    .join(', ')
  const extra = estimated.length > 3 ? ` +${estimated.length - 3} more` : ''

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
        maxWidth: '1280px', margin: '0 auto 1rem',
        padding: '0.75rem 1rem',
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.4)',
        borderRadius: '10px', fontSize: '0.875rem', color: 'var(--text-2)',
      }}
    >
      <span style={{ fontSize: '1.1rem', lineHeight: 1.2 }} aria-hidden="true">⚠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: 'var(--text-1)' }}>Estimated nutrition for {names}{extra}.</strong>
        {' '}Their calorie target and nutrient figures use age/gender averages because measured weight and height aren't set, so they're approximate.
        {' '}
        <Link href="/my-family" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
          Add their measurements →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: '1rem', lineHeight: 1, padding: '0 0.125rem', flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  )
}
