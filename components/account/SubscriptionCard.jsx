'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SubscriptionCard({ profile }) {
  const supabase = createClient()
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState(null)

  const tier = profile?.subscription_tier || 'free'
  const isPaid = tier !== 'free'
  const status = profile?.status || 'active'
  const isPastDue = status === 'past_due'

  async function handlePortal() {
    setPortalError(null)
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create portal session')
      if (data?.url) window.location.href = data.url
      else throw new Error('No portal URL returned.')
    } catch (err) {
      setPortalError(err.message)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div style={{
      background: 'white', borderRadius: '14px', padding: '20px',
      border: isPastDue ? '1px solid #fca5a5' : '1px solid #f0f0f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '16px',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: '0 0 16px' }}>
        Subscription
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          background: isPaid ? '#dcfce7' : '#f3f4f6',
          color: isPaid ? '#2d6e2e' : '#6b7280',
          padding: '4px 12px', borderRadius: 8, fontSize: '14px', fontWeight: 700,
        }}>
          {isPaid ? 'Premium' : 'Free'}
        </div>
        {isPastDue && (
          <div style={{
            background: '#fef2f2', color: '#dc2626',
            padding: '4px 12px', borderRadius: 8, fontSize: '14px', fontWeight: 700,
          }}>
            Payment failed
          </div>
        )}
      </div>

      {isPaid ? (
        <>
          {isPastDue && (
            <p style={{ fontSize: '14px', color: '#dc2626', margin: '0 0 12px' }}>
              Your last payment failed. Update your payment method to keep access.
            </p>
          )}
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            style={{
              background: isPastDue ? '#dc2626' : '#f3f4f6',
              color: isPastDue ? 'white' : '#374151',
              padding: '9px 20px', borderRadius: 10, fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              opacity: portalLoading ? 0.7 : 1,
            }}
          >
            {portalLoading ? 'Opening…' : isPastDue ? 'Update payment method' : 'Manage subscription'}
          </button>
          {portalError && (
            <p style={{ fontSize: '14px', color: '#dc2626', margin: '8px 0 0' }}>{portalError}</p>
          )}
        </>
      ) : (
        <div>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px' }}>
            Free plan: 5 AI recipe generations/day · Up to 2 family members
          </p>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #2d6e2e, #2d6e2e)',
              color: 'white', padding: '9px 20px', borderRadius: 10,
              fontSize: '14px', fontWeight: 700, textDecoration: 'none',
            }}
          >
            Upgrade to Premium ✨
          </Link>
        </div>
      )}
    </div>
  )
}
