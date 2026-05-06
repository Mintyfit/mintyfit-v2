'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthModal from '@/components/landing/AuthModal'

export default function NutritionistInviteClient({ token, invite, error, user }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectError, setConnectError] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [waitingForSession, setWaitingForSession] = useState(false)
  const [autoAcceptError, setAutoAcceptError] = useState(null)

  const signupMode = searchParams?.get('signup') === '1'
  const signupEmail = searchParams?.get('email') || ''

  useEffect(() => {
    if (signupMode && !user) {
      setAuthEmail(signupEmail)
      setShowAuthModal(true)
    }
  }, [signupMode, user, signupEmail])

  useEffect(() => {
    if (user && waitingForSession) {
      acceptInvite()
    }
  }, [user, waitingForSession])

  async function acceptInvite() {
    setWaitingForSession(false)
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await fetch('/api/nutritionist/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to connect')
      setConnected(true)
      setTimeout(() => router.push('/my-account'), 1500)
    } catch (err) {
      setAutoAcceptError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  async function handleConnect() {
    if (!user) {
      setWaitingForSession(true)
      setShowAuthModal(true)
      return
    }
    await acceptInvite()
  }

  const nutritionistName = invite?.profiles?.name || 'A nutritionist'

  return (
    <>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-page)', padding: '24px',
      }}>
        <div style={{
          maxWidth: '440px', width: '100%',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '40px 32px', textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--primary)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px',
          }}>
            🩺
          </div>

          {error ? (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
                Invite Not Found
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '28px' }}>
                {error}
              </p>
              <Link href="/" style={{
                display: 'inline-block', padding: '12px 24px',
                background: 'var(--primary)', color: '#fff',
                borderRadius: '10px', textDecoration: 'none', fontWeight: '600',
              }}>
                Go to MintyFit
              </Link>
            </>
          ) : connected ? (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
                Connected!
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '15px' }}>
                You're now connected with <strong>{nutritionistName}</strong>. Redirecting…
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
                Connect with {nutritionistName}
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '8px' }}>
                {nutritionistName} has invited you to connect on MintyFit. Once connected, they can review your meal plans and leave personal nutrition guidance.
              </p>

              {!user ? (
                <>
                  <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '20px' }}>
                    Sign in or create an account to accept this invite.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      style={{
                        padding: '12px 24px', borderRadius: '10px',
                        background: 'var(--primary)', color: '#fff',
                        textDecoration: 'none', fontWeight: '600', fontSize: '15px',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      style={{
                        padding: '12px 24px', borderRadius: '10px',
                        border: '1px solid var(--border)', color: 'var(--text-1)',
                        textDecoration: 'none', fontWeight: '600', fontSize: '15px',
                        background: 'var(--bg-card)', cursor: 'pointer',
                      }}
                    >
                      Create account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {invite?.email && invite.email !== user.email && (
                    <p style={{ color: '#d97706', fontSize: '13px', marginBottom: '16px', background: '#fef3c7', padding: '10px', borderRadius: '8px' }}>
                      This invite was sent to {invite.email}. You are signed in as {user.email}.
                    </p>
                  )}
                  {connectError && (
                    <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{connectError}</p>
                  )}
                  {autoAcceptError && (
                    <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{autoAcceptError}</p>
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    style={{
                      width: '100%', padding: '14px',
                      background: 'var(--primary)', color: '#fff',
                      border: 'none', borderRadius: '10px', cursor: 'pointer',
                      fontWeight: '700', fontSize: '16px',
                      opacity: connecting ? 0.7 : 1,
                    }}
                  >
                    {connecting ? 'Connecting…' : `Connect with ${nutritionistName}`}
                  </button>
                  <p style={{ marginTop: '16px', color: 'var(--text-3)', fontSize: '13px' }}>
                    Signed in as {user.email}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          if (waitingForSession) {
            // Session will be detected by useEffect
          }
        }}
        defaultTab={signupMode ? 'signup' : 'signin'}
      />
    </>
  )
}
