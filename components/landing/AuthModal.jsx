'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'signup' }) {
  const [tab, setTab] = useState(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab)
      setEmail('')
      setPassword('')
      setGdpr(false)
      setError(null)
      setMessage(null)
    }
  }, [isOpen, defaultTab])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  const supabase = createClient()

  async function handleOAuth(provider) {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (tab === 'signup' && !gdpr) {
      setError('Please agree to the Privacy Policy and Terms of Service to continue.')
      return
    }
    setLoading(true)
    setError(null)

    let result
    if (tab === 'signup') {
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { onboarding_pending: true },
        },
      })
    } else {
      result = await supabase.auth.signInWithPassword({ email, password })
    }

    setLoading(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (tab === 'signup') {
      setMessage('Check your email for a confirmation link!')
    } else {
      onSuccess?.()
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 100, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 101,
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', padding: '0.25rem',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-1)' }}>
          {tab === 'signup' ? 'Create your free account' : 'Welcome back'}
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {tab === 'signup' ? 'No credit card required.' : 'Sign in to continue.'}
        </p>

        {/* Tab switch */}
        <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          {['signup', 'signin'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setMessage(null) }}
              style={{
                flex: 1, padding: '0.625rem', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.9375rem', fontWeight: tab === t ? 700 : 400,
                color: tab === t ? 'var(--primary)' : 'var(--text-3)',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {t === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          ))}
        </div>

        {/* OAuth — Google */}
        <button
          onClick={() => handleOAuth('google')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.75rem', padding: '0.875rem', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)',
            marginBottom: '0.75rem',
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--text-3)', fontSize: '0.8125rem' }}>or continue with email</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {message ? (
          <div style={{
            padding: '1rem', borderRadius: '10px', background: '#f0fdf4',
            color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.9375rem',
          }}>
            {message}
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit}>
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: tab === 'signup' ? '0.75rem' : '1.25rem' }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={8}
                style={inputStyle}
              />
            </div>

            {tab === 'signup' && (
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                marginBottom: '1.25rem', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={gdpr}
                  onChange={e => setGdpr(e.target.checked)}
                  style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <a href="/privacy" target="_blank" style={{ color: 'var(--primary)' }}>Privacy Policy</a>
                  {' '}and{' '}
                  <a href="/terms" target="_blank" style={{ color: 'var(--primary)' }}>Terms of Service</a>.
                  My data will be processed for nutrition tracking purposes.
                </span>
              </label>
            )}

            {error && (
              <div style={{
                padding: '0.75rem', borderRadius: '8px', background: '#fef2f2',
                color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.875rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '10px',
                background: loading ? 'var(--text-4)' : 'var(--primary)',
                color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem', fontWeight: 700,
              }}
            >
              {loading ? 'Please wait…' : tab === 'signup' ? 'Create free account' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

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
