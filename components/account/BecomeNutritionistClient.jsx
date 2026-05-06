'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthModal from '@/components/landing/AuthModal'

export default function BecomeNutritionistClient({ user, profile, alreadyApplied, isNutritionist }) {
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    credentials_url: profile?.credentials_url || '',
    gdpr: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: '1px solid var(--border)', borderRadius: '8px',
    background: 'var(--bg-card)', color: 'var(--text-1)',
    fontSize: '14px',
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      setShowAuthModal(true)
      return
    }
    if (!formData.gdpr) {
      setError('Please agree to the terms to continue.')
      return
    }
    if (!formData.bio) {
      setError('Please provide a brief bio.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/nutritionist/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: formData.display_name,
          bio: formData.bio,
          credentials_url: formData.credentials_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (isNutritionist) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🩺</div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
          You're already a nutritionist
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '24px' }}>
          You have access to the nutritionist dashboard.
        </p>
        <Link
          href="/nutritionist"
          style={{
            display: 'inline-block', padding: '12px 24px',
            background: 'var(--primary)', color: '#fff',
            borderRadius: '10px', textDecoration: 'none', fontWeight: '600',
          }}
        >
          Open your dashboard
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>✓</div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
          Application received
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '24px' }}>
          Thanks for applying! We'll review your application and email you within a few business days.
        </p>
        <Link
          href="/my-account"
          style={{
            display: 'inline-block', padding: '12px 24px',
            background: 'var(--primary)', color: '#fff',
            borderRadius: '10px', textDecoration: 'none', fontWeight: '600',
          }}
        >
          Back to My Account
        </Link>
      </div>
    )
  }

  if (alreadyApplied) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
          Application pending
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', marginBottom: '24px' }}>
          Your nutritionist application is being reviewed. We'll email you once approved.
        </p>
        <Link
          href="/my-account"
          style={{
            display: 'inline-block', padding: '12px 24px',
            background: 'var(--primary)', color: '#fff',
            borderRadius: '10px', textDecoration: 'none', fontWeight: '600',
          }}
        >
          Back to My Account
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🩺</div>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '12px' }}>
          Become a MintyFit Nutritionist
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '15px', lineHeight: 1.6 }}>
          Help families achieve their nutrition goals. Review meal plans, leave personalized notes, and make a real difference in people's health.
        </p>
      </div>

      {/* Benefits */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '20px', marginBottom: '24px',
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '16px' }}>
          What you'll get
        </h2>
        <ul style={{ color: 'var(--text-2)', fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px' }}>
          <li>Connect with families who need your expertise</li>
          <li>Review meal plans and leave nutrition notes</li>
          <li>View client statistics and progress</li>
          <li>Free Pro account while you're an active nutritionist</li>
        </ul>
      </div>

      {/* Form */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '24px',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '20px' }}>
          Application
        </h2>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '12px', marginBottom: '16px', color: '#dc2626', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '500' }}>
              Display name
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={e => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Dr. Jane Smith"
              style={inputStyle}
              disabled={!!profile?.display_name}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '500' }}>
              Bio *
            </label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about your qualifications and experience (max 500 characters)"
              rows={4}
              maxLength={500}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px', textAlign: 'right' }}>
              {formData.bio.length}/500
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '500' }}>
              Credentials URL (optional)
            </label>
            <input
              type="url"
              value={formData.credentials_url}
              onChange={e => setFormData(prev => ({ ...prev, credentials_url: e.target.value }))}
              placeholder="https://linkedin.com/in/your-profile"
              style={inputStyle}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
              Link to your LinkedIn, professional website, or certification
            </div>
          </div>

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            marginBottom: '20px', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={formData.gdpr}
              onChange={e => setFormData(prev => ({ ...prev, gdpr: e.target.checked }))}
              style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.5 }}>
              I agree to MintyFit's{' '}
              <Link href="/terms" target="_blank" style={{ color: 'var(--primary)' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" style={{ color: 'var(--primary)' }}>Privacy Policy</Link>.
              I understand my data will be processed for nutritionist services.
            </span>
          </label>

          {!user ? (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              style={{
                width: '100%', padding: '14px',
                background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '700', fontSize: '16px',
              }}
            >
              Sign in to apply
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '14px',
                background: 'var(--primary)', color: '#fff',
                border: 'none', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '700', fontSize: '16px',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          )}
        </form>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          window.location.reload()
        }}
        defaultTab="signin"
      />
    </div>
  )
}
