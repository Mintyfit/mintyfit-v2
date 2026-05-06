'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle = {
  width: '100%',
  padding: '0.875rem 1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-page)',
  color: 'var(--text-1)',
  fontSize: '1rem',
  outline: 'none',
}

const btnStyle = {
  width: '100%',
  padding: '0.875rem',
  borderRadius: '10px',
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 700,
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [ready, setReady] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    console.log('[reset-password] full href:', window.location.href)
    console.log('[reset-password] hash:', window.location.hash)
    console.log('[reset-password] search:', window.location.search)

    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)

    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')

    console.log('[reset-password] hash type:', type, 'accessToken:', !!accessToken)

    if (type === 'recovery' && accessToken) {
      const supabase = createClient()
      if (!supabase) {
        setError('Failed to initialize Supabase client. Please try again.')
        return
      }
      window.history.replaceState(null, '', window.location.pathname)
      ;(async () => {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) {
          setError(sessionError.message)
          return
        }
        setReady(true)
      })()
      return
    }

    const queryError = searchParams.get('error')
    const queryDesc = searchParams.get('error_description')
    if (queryError && queryDesc) {
      const desc = decodeURIComponent(queryDesc.replace(/\+/g, ' '))
      setError(desc)
      return
    }

    if (queryError === 'access_denied') {
      setError('This reset link is invalid or already used. Email security scanners sometimes trigger links before you click them — request a new one below.')
      return
    }

    if (!type && !accessToken && !queryError) {
      setError('Invalid or expired reset link. Please request a new password reset.')
    }
  }, [searchParams])

  async function handleResend(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setResendSent(true)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setMessage('Password updated! Redirecting to sign in...')
      setTimeout(() => router.push('/login?tab=signin'), 2000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-page)', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem',
        width: '100%', maxWidth: '400px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-1)' }}>
          Set new password
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Enter a new password for your account.
        </p>

        {message ? (
          <div style={{
            padding: '1rem', borderRadius: '10px', background: '#f0fdf4',
            color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.9375rem',
          }}>
            {message}
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password"
                required
                minLength={8}
                autoFocus
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              ...btnStyle,
              background: loading ? 'var(--text-4)' : 'var(--primary)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Updating...' : 'Set password'}
            </button>
          </form>
        ) : resendSent ? (
          <div style={{
            padding: '1rem', borderRadius: '10px', background: '#f0fdf4',
            color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.9375rem',
          }}>
            Reset link sent to <strong>{email.trim()}</strong>. Check your inbox and click the link quickly — email scanners may trigger it if you delay.
          </div>
        ) : error ? (
          <div>
            <div style={{
              padding: '1rem', borderRadius: '10px', background: '#fef2f2',
              color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.9375rem',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
            <form onSubmit={handleResend}>
              <p style={{ color: 'var(--text-2)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                Enter your email to request a new reset link:
              </p>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                placeholder="you@example.com"
                required
                style={{ ...inputStyle, marginBottom: '0.75rem' }}
              />
              <button type="submit" disabled={loading} style={{
                ...btnStyle,
                background: loading ? 'var(--text-4)' : 'var(--primary)',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '0.75rem',
              }}>
                {loading ? 'Sending...' : 'Send new reset link'}
              </button>
            </form>
            <a
              href="/login?tab=signin"
              style={{
                display: 'block', textAlign: 'center', color: 'var(--primary)',
                fontWeight: 600, fontSize: '0.875rem',
              }}
            >
              Back to sign in
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}
