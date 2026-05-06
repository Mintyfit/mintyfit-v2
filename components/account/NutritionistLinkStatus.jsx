'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NutritionistLinkStatus({ userId, pendingLink, activeLink, onRefresh }) {
  const supabase = createClient()
  const [acting, setActing] = useState(false)

  const link = pendingLink || activeLink
  if (!link) return null

  const n = link.nutritionist
  const displayName = n?.full_name || n?.email || 'Your nutritionist'
  const subEmail = n?.full_name && n?.email ? n.email : null

  const accept = async () => {
    setActing(true)
    await supabase
      .from('nutritionist_client_links')
      .update({ status: 'active', accepted_at: new Date().toISOString() })
      .eq('id', link.id)
    setActing(false)
    onRefresh?.()
  }

  const decline = async () => {
    setActing(true)
    await supabase.from('nutritionist_client_links').delete().eq('id', link.id)
    setActing(false)
    onRefresh?.()
  }

  const revoke = async () => {
    if (!window.confirm("Revoke your nutritionist's access to your account?")) return
    setActing(true)
    await supabase.from('nutritionist_client_links').delete().eq('id', link.id)
    setActing(false)
    onRefresh?.()
  }

  if (link.status === 'pending') {
    return (
      <div style={{
        background: 'white', borderRadius: '14px', padding: '20px',
        border: '1px solid #fef9c3', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '16px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
          Nutritionist Invite
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Your nutritionist{' '}
          <strong style={{ color: '#1f2937' }}>{displayName}</strong>
          {subEmail && <span> ({subEmail})</span>}
          {' '}has requested access to your account.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={accept}
            disabled={acting}
            style={{ background: '#2d6e2e', color: 'white', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', marginTop: 0, opacity: acting ? 0.6 : 1 }}
          >
            Accept
          </button>
          <button
            onClick={decline}
            disabled={acting}
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', opacity: acting ? 0.6 : 1 }}
          >
            Decline
          </button>
        </div>
      </div>
    )
  }

  if (link.status === 'active') {
    return (
      <div style={{
        background: 'white', borderRadius: '14px', padding: '20px',
        border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '16px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
          Nutritionist Sharing
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
          Your data is currently shared with:
        </p>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontWeight: '700', fontSize: '14px', color: '#1f2937', margin: '0 0 4px' }}>
            {n?.full_name || n?.email || 'Your nutritionist'}
          </p>
          {n?.email && (
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>{n.email}</p>
          )}
          <p style={{ fontSize: '14px', margin: 0, color: n?.phone ? '#374151' : '#9ca3af' }}>
            {n?.phone || 'No phone on file'}
          </p>
        </div>
        <button
          onClick={revoke}
          disabled={acting}
          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', opacity: acting ? 0.6 : 1 }}
        >
          Revoke Access
        </button>
      </div>
    )
  }

  return null
}
