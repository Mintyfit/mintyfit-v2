'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function FamilyInviteClient({ token, invite, error, user, alreadyInFamily }) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joinError, setJoinError] = useState(null)

  async function handleJoin() {
    setJoining(true)
    setJoinError(null)
    try {
      const res = await fetch('/api/family/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join family')
      setJoined(true)
      setTimeout(() => router.push('/my-family'), 1500)
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  const familyName = invite?.families?.name || 'a family'

  return (
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
          👨‍👩‍👧‍👦
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
        ) : joined ? (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
              You joined!
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '15px' }}>
              Welcome to <strong>{familyName}</strong>. Redirecting to your family page…
            </p>
          </>
        ) : alreadyInFamily ? (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
              Already in a Family
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '28px' }}>
              You are already a member of a family on MintyFit. You can only belong to one family at a time.
            </p>
            <Link href="/my-family" style={{
              display: 'inline-block', padding: '12px 24px',
              background: 'var(--primary)', color: '#fff',
              borderRadius: '10px', textDecoration: 'none', fontWeight: '600',
            }}>
              View My Family
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
              You're invited!
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '8px' }}>
              You have been invited to join
            </p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', marginBottom: '28px' }}>
              {familyName}
            </p>

            {!user ? (
              <>
                <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '20px' }}>
                  Sign in or create an account to accept this invite.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={`/?auth=login&redirect=/family-invite/${token}`}
                    style={{
                      padding: '12px 24px', borderRadius: '10px',
                      background: 'var(--primary)', color: '#fff',
                      textDecoration: 'none', fontWeight: '600', fontSize: '15px',
                    }}
                  >
                    Sign in
                  </Link>
                  <Link
                    href={`/?auth=register&redirect=/family-invite/${token}`}
                    style={{
                      padding: '12px 24px', borderRadius: '10px',
                      border: '1px solid var(--border)', color: 'var(--text-1)',
                      textDecoration: 'none', fontWeight: '600', fontSize: '15px',
                    }}
                  >
                    Create account
                  </Link>
                </div>
              </>
            ) : (
              <>
                {invite?.email && invite.email !== user.email && (
                  <p style={{ color: '#d97706', fontSize: '13px', marginBottom: '16px', background: '#fef3c7', padding: '10px', borderRadius: '8px' }}>
                    This invite was sent to {invite.email}. You are signed in as {user.email}.
                  </p>
                )}
                {joinError && (
                  <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{joinError}</p>
                )}
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'var(--primary)', color: '#fff',
                    border: 'none', borderRadius: '10px', cursor: 'pointer',
                    fontWeight: '700', fontSize: '16px',
                    opacity: joining ? 0.7 : 1,
                  }}
                >
                  {joining ? 'Joining…' : `Join ${familyName}`}
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
  )
}
