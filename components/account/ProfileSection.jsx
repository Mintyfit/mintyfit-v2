'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const CARD = {
  background: 'white', borderRadius: '14px', padding: '20px',
  border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  marginBottom: '16px',
}
const LABEL = { display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '6px' }
const INPUT = {
  width: '100%', border: '1px solid #e5e7eb', borderRadius: '10px',
  padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}
const BTN_GREEN = {
  background: '#2d6e2e', color: 'white', padding: '10px 20px',
  borderRadius: '10px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer',
}

export default function ProfileSection({ userId, userEmail, profile: initialProfile }) {
  const supabase = createClient()
  const fileRef = useRef()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [unitsPreference, setUnitsPreference] = useState('metric')
  const [emailPrefs, setEmailPrefs] = useState({
    weekly_summary: true,
    meal_reminders: false,
    tips: true,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Password change
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    if (!initialProfile) return
    setName(initialProfile.full_name || '')
    setPhone(initialProfile.phone || '')
    setUnitsPreference(initialProfile.units_preference || 'metric')
    setEmailPrefs({
      weekly_summary: initialProfile.email_weekly_summary ?? true,
      meal_reminders: initialProfile.email_meal_reminders ?? false,
      tips: initialProfile.email_tips ?? true,
    })
  }, [initialProfile])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
      window.location.reload()
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: name,
      phone,
      units_preference: unitsPreference,
      email_weekly_summary: emailPrefs.weekly_summary,
      email_meal_reminders: emailPrefs.meal_reminders,
      email_tips: emailPrefs.tips,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    setMsg(error ? `Error: ${error.message}` : 'Profile saved!')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Passwords do not match'); return }
    if (pwForm.next.length < 8) { setPwMsg('Minimum 8 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwMsg(error ? error.message : 'Password updated!')
    setPwForm({ next: '', confirm: '' })
    setTimeout(() => setPwMsg(''), 4000)
  }

  const avatarUrl = initialProfile?.avatar_url
  const initials = (initialProfile?.full_name || userEmail || '?').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Profile card */}
      <div style={CARD}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
          <button onClick={() => fileRef.current.click()} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #bbf7d0' }} />
              : <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#2d6e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: '700', border: '2px solid #bbf7d0' }}>{initials}</div>
            }
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
              <p style={{ fontWeight: '500', color: '#374151', margin: 0, fontSize: '14px' }}>{initialProfile?.full_name || 'Your Name'}</p>
              <div style={{ display: 'flex', gap: 4 }}>
                {['metric', 'imperial'].map(u => (
                  <button
                    key={u}
                    onClick={() => setUnitsPreference(u)}
                    style={{
                      padding: '2px 10px', borderRadius: 6, fontSize: '12px', fontWeight: 600,
                      border: '1px solid', cursor: 'pointer',
                      borderColor: unitsPreference === u ? '#2d6e2e' : '#e5e7eb',
                      background: unitsPreference === u ? '#2d6e2e' : '#f9fafb',
                      color: unitsPreference === u ? '#fff' : '#6b7280',
                    }}
                  >
                    {u === 'metric' ? 'kg / cm' : 'lbs / in'}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{userEmail}</p>
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={INPUT} placeholder="Your name" />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Email</label>
          <input value={userEmail || ''} disabled style={{ ...INPUT, background: '#f9fafb', color: '#9ca3af' }} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={LABEL}>Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={INPUT} placeholder="+1 (555) 000-0000" />
        </div>
        {msg && (
          <p style={{ fontSize: '14px', color: msg.startsWith('Error') ? '#b91c1c' : '#2d6e2e', marginBottom: '8px' }}>
            {msg}
          </p>
        )}
        <button onClick={saveProfile} disabled={saving} style={{ ...BTN_GREEN, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      {/* Password card */}
      <div style={CARD}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '20px' }}>Change Password</h2>
        <div style={{ maxWidth: '400px' }}>
          {[['next', 'New Password'], ['confirm', 'Confirm Password']].map(([field, label]) => (
            <div key={field} style={{ marginBottom: '16px' }}>
              <label style={LABEL}>{label}</label>
              <input type="password" value={pwForm[field]} onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))} style={INPUT} />
            </div>
          ))}
          {pwMsg && <p style={{ fontSize: '14px', color: pwMsg.includes('updated') ? '#2d6e2e' : '#b91c1c', marginBottom: '8px' }}>{pwMsg}</p>}
          <button onClick={changePassword} style={BTN_GREEN}>Update Password</button>
        </div>
      </div>

      {/* Email preferences card */}
      <div style={CARD}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>Email Preferences</h2>
        {[
          { key: 'weekly_summary', label: 'Weekly nutrition summary' },
          { key: 'meal_reminders', label: 'Meal planning reminders' },
          { key: 'tips', label: 'Health tips & articles' },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: '14px', color: '#374151' }}>{label}</span>
            <button
              onClick={() => setEmailPrefs(p => ({ ...p, [key]: !p[key] }))}
              style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '999px', background: emailPrefs[key] ? '#2d6e2e' : '#d1d5db', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: '2px', left: emailPrefs[key] ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
            </button>
          </div>
        ))}
      </div>

      {/* GDPR card */}
      <div style={CARD}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>Your Data</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Download or delete all your MintyFit data at any time.</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/api/gdpr/export" style={{ background: '#f0fdf4', color: '#2d6e2e', border: '1px solid #bbf7d0', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', textDecoration: 'none' }}>
            Export Data (JSON)
          </a>
          <button
            onClick={() => {
              if (window.confirm('Delete all your data permanently? This cannot be undone.')) {
                fetch('/api/gdpr/delete', { method: 'POST' }).then(() => window.location.href = '/')
              }
            }}
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
          >
            Delete Account
          </button>
        </div>
      </div>

    </div>
  )
}
