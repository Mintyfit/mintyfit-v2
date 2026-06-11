'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/landing/AuthModal'
import { useAuth } from '@/contexts/AuthContext'
import { fieldLabel, displayToDb, lbsToKg, inToCm } from '@/lib/unitConversion'

const STORAGE_KEY = 'mintyfit-onboarding'

const STEPS = [
  { key: 'personal', label: 'Personal Info', emoji: '👤' },
  { key: 'body', label: 'Body', emoji: '⚖️' },
  { key: 'diet', label: 'Diet', emoji: '🥗' },
  { key: 'goal', label: 'Goal', emoji: '🎯' },
  { key: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
]

const DIETARY_TYPES = ['none', 'omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'pescatarian']

const ALLERGIES = ['none', 'gluten', 'dairy', 'nuts', 'shellfish', 'soy', 'eggs', 'fish', 'peanuts']

const GOALS = [
  { key: 'weight_loss', label: 'Weight loss' },
  { key: 'eat_healthier', label: 'Eat healthier' },
  { key: 'build_muscle', label: 'Build muscle' },
  { key: 'metabolic_health', label: 'Metabolic health' },
  { key: 'general_wellness', label: 'General wellness' },
]

function emptyMember() {
  return { id: Date.now() + Math.random(), name: '', relationship: 'child', dob: '', gender: 'male', weight: '', height: '' }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  // Your data (maps to My Account panels)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [dietaryType, setDietaryType] = useState('none')
  const [allergies, setAllergies] = useState([])
  const [goal, setGoal] = useState('')
  const [units, setUnits] = useState('metric')

  // Family members (additional people)
  const [members, setMembers] = useState([])

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const d = JSON.parse(saved)
        if (d.name !== undefined) setName(d.name)
        if (d.gender) setGender(d.gender)
        if (d.dob) setDob(d.dob)
        if (d.weight) setWeight(d.weight)
        if (d.height) setHeight(d.height)
        if (d.dietaryType) setDietaryType(d.dietaryType)
        if (d.allergies) setAllergies(d.allergies)
        if (d.goal) setGoal(d.goal)
        if (d.units) setUnits(d.units)
      if (d.members) setMembers(d.members)
      }
    } catch {}
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, gender, dob, weight, height, dietaryType, allergies, goal, units, members, step }))
    } catch {}
  }, [name, gender, dob, weight, height, dietaryType, allergies, goal, members, step])

  function toggleAllergy(a) {
    if (a === 'none') {
      setAllergies(prev => prev.includes('none') ? [] : ['none'])
    } else {
      setAllergies(prev => {
        const next = prev.includes(a) ? prev.filter(x => x !== a) : [...prev.filter(x => x !== 'none'), a]
        return next
      })
    }
  }

  function addMember() { setMembers(prev => [...prev, emptyMember()]) }
  function updateMember(id, field, value) { setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m)) }
  function removeMember(id) { setMembers(prev => prev.filter(m => m.id !== id)) }

  const stepCanNext = [
    true, // personal — name always filled
    !!weight && !!height && !!dob, // body
    true, // diet
    !!goal, // goal
    true, // family
  ]

  async function handleSave() {
    setSaving(true)
    try {
      const isMetric = units === 'metric'
      const primaryWeight = isMetric ? parseFloat(weight) : lbsToKg(parseFloat(weight))
      const primaryHeight = isMetric ? parseFloat(height) : inToCm(parseFloat(height))

      const membersPayload = [
        { id: 'primary', name: name || user?.email?.split('@')[0], gender, dob, weight: primaryWeight, height: primaryHeight },
        ...members.filter(m => m.name.trim()).map(m => ({
          ...m,
          weight: isMetric ? parseFloat(m.weight) : lbsToKg(parseFloat(m.weight)),
          height: isMetric ? parseFloat(m.height) : inToCm(parseFloat(m.height)),
        })),
      ]
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          members: membersPayload,
          dietary: { [membersPayload[0].id]: [dietaryType, ...allergies] },
          goals: { [membersPayload[0].id]: goal, ...Object.fromEntries(members.filter(m => m.name.trim()).map(m => [m.id, goal])) },
          units,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      localStorage.removeItem(STORAGE_KEY)
      router.push('/plan')
    } catch (err) {
      console.error('[onboarding] Save error:', err)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-3)' }}>Loading...</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 1.5rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' }}>MintyFit</Link>
        <StepIndicator step={step} steps={STEPS} />
        <Link href={user ? '/plan' : '/'} style={{ color: 'var(--text-3)', fontSize: '0.875rem', textDecoration: 'none' }}>Skip</Link>
      </header>

      <div style={{ flex: 1, padding: '2rem 1.25rem', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
        {/* STEP 0: Personal Info */}
        {step === 0 && (
          <div>
            <h1 style={headingStyle}>Tell us about yourself</h1>
            <p style={subStyle}>This helps us personalize your nutrition plan.</p>
            <div style={cardStyle}>
              <label style={labelStyle}>Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="First name" style={inputStyle} />

              <label style={{ ...labelStyle, marginTop: '1rem' }}>Gender</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['male', 'female', 'other'].map(g => (
                  <button key={g} onClick={() => setGender(g)} style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px', textTransform: 'capitalize',
                    border: `2px solid ${gender === g ? 'var(--primary)' : 'var(--border)'}`,
                    background: gender === g ? '#f0fdf4' : 'var(--bg-card)',
                    color: gender === g ? 'var(--primary)' : 'var(--text-2)', cursor: 'pointer', fontWeight: gender === g ? 600 : 400,
                  }}>{g}</button>
                ))}
              </div>

              <label style={{ ...labelStyle, marginTop: '1rem' }}>Units</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['metric', 'imperial'].map(u => (
                  <button key={u} onClick={() => setUnits(u)} style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px', textTransform: 'capitalize',
                    border: `2px solid ${units === u ? 'var(--primary)' : 'var(--border)'}`,
                    background: units === u ? '#f0fdf4' : 'var(--bg-card)',
                    color: units === u ? 'var(--primary)' : 'var(--text-2)', cursor: 'pointer', fontWeight: units === u ? 600 : 400,
                  }}>{u}</button>
                ))}
              </div>
            </div>
            <NavButtons canNext={stepCanNext[0]} onNext={() => setStep(1)} showBack={false} />
          </div>
        )}

        {/* STEP 1: Body */}
        {step === 1 && (
          <div>
            <h1 style={headingStyle}>Your body measurements</h1>
            <p style={subStyle}>Used to calculate your daily nutrition needs.</p>
            <div style={cardStyle}>
              <label style={labelStyle}>Date of birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} style={inputStyle} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                <div>
                  <label style={labelStyle}>{fieldLabel('weight_kg', units === 'metric')}</label>
                  <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder={units === 'metric' ? '70' : '154'} min={1} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{fieldLabel('height_cm', units === 'metric')}</label>
                  <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder={units === 'metric' ? '175' : '69'} min={1} style={inputStyle} />
                </div>
              </div>
            </div>
            <NavButtons canNext={stepCanNext[1]} onNext={() => setStep(2)} onBack={() => setStep(0)} />
          </div>
        )}

        {/* STEP 2: Diet */}
        {step === 2 && (
          <div>
            <h1 style={headingStyle}>Dietary preferences</h1>
            <p style={subStyle}>What type of eating pattern works for you?</p>
            <div style={cardStyle}>
              <label style={labelStyle}>Dietary type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {DIETARY_TYPES.map(t => (
                  <button key={t} onClick={() => setDietaryType(t)} style={{
                    padding: '0.5rem 1rem', borderRadius: '20px', textTransform: 'capitalize',
                    border: `2px solid ${dietaryType === t ? 'var(--primary)' : 'var(--border)'}`,
                    background: dietaryType === t ? '#f0fdf4' : 'var(--bg-card)',
                    color: dietaryType === t ? 'var(--primary)' : 'var(--text-2)', cursor: 'pointer', fontWeight: dietaryType === t ? 600 : 400,
                  }}>{t}</button>
                ))}
              </div>

              <label style={labelStyle}>Allergies & intolerances</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {ALLERGIES.map(a => {
                  const selected = allergies.includes(a)
                  return (
                    <button key={a} onClick={() => toggleAllergy(a)} style={{
                      padding: '0.5rem 1rem', borderRadius: '20px', textTransform: 'capitalize',
                      border: `2px solid ${selected ? 'var(--danger)' : 'var(--border)'}`,
                      background: selected ? '#fef2f2' : 'var(--bg-card)',
                      color: selected ? 'var(--danger)' : 'var(--text-2)', cursor: 'pointer', fontWeight: selected ? 600 : 400,
                    }}>{a}{selected ? ' ✓' : ''}</button>
                  )
                })}
              </div>
            </div>
            <NavButtons canNext={stepCanNext[2]} onNext={() => setStep(3)} onBack={() => setStep(1)} />
          </div>
        )}

        {/* STEP 3: Goal */}
        {step === 3 && (
          <div>
            <h1 style={headingStyle}>What's your goal?</h1>
            <p style={subStyle}>We'll tailor your nutrient targets accordingly.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {GOALS.map(g => (
                <button key={g.key} onClick={() => setGoal(g.key)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', borderRadius: '12px', textAlign: 'left',
                  border: `2px solid ${goal === g.key ? 'var(--primary)' : 'var(--border)'}`,
                  background: goal === g.key ? '#f0fdf4' : 'var(--bg-card)',
                  color: goal === g.key ? 'var(--primary)' : 'var(--text-1)', cursor: 'pointer', fontWeight: goal === g.key ? 600 : 400,
                }}>
                  <span style={{ flex: 1 }}>{g.label}</span>
                  {goal === g.key && <span>✓</span>}
                </button>
              ))}
            </div>
            <NavButtons canNext={stepCanNext[3]} onNext={() => setStep(4)} onBack={() => setStep(2)} nextLabel="Next →" />
          </div>
        )}

        {/* STEP 4: Family members */}
        {step === 4 && (
          <div>
            <h1 style={headingStyle}>Add family members</h1>
            <p style={subStyle}>Each person gets their own nutrition plan. Add them now or skip — you can always add more later.</p>

            {members.map((m, idx) => (
              <div key={m.id} style={{ ...cardStyle, marginBottom: '1rem', position: 'relative' }}>
                <button onClick={() => removeMember(m.id)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1.25rem' }}>×</button>
                <label style={labelStyle}>Name</label>
                <input value={m.name} onChange={e => updateMember(m.id, 'name', e.target.value)} placeholder="First name" style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>DOB</label>
                    <input type="date" value={m.dob} onChange={e => updateMember(m.id, 'dob', e.target.value)} max={new Date().toISOString().split('T')[0]} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select value={m.gender} onChange={e => updateMember(m.id, 'gender', e.target.value)} style={inputStyle}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{fieldLabel('weight_kg', units === 'metric')}</label>
                    <input type="number" value={m.weight} onChange={e => updateMember(m.id, 'weight', e.target.value)} placeholder={units === 'metric' ? '40' : '88'} min={1} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{fieldLabel('height_cm', units === 'metric')}</label>
                    <input type="number" value={m.height} onChange={e => updateMember(m.id, 'height', e.target.value)} placeholder={units === 'metric' ? '150' : '59'} min={1} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addMember} style={{
              width: '100%', padding: '0.875rem', borderRadius: '12px', border: '2px dashed var(--border)',
              background: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem',
            }}>+ Add family member</button>

            <NavButtons canNext={stepCanNext[4]} onNext={() => setStep(5)} onBack={() => setStep(3)} nextLabel="Review →" />
          </div>
        )}

        {/* STEP 5: Done */}
        {step === 5 && (
          <div>
            <h1 style={headingStyle}>You're all set!</h1>
            <p style={subStyle}>We've got everything we need to create your personalized family meal plan.</p>

            <div style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Row label="Name" value={name || user?.email} />
                <Row label="Gender" value={gender || 'Not set'} />
                <Row label="Weight" value={weight ? `${weight} ${units === 'metric' ? 'kg' : 'lbs'}` : 'Not set'} />
                <Row label="Height" value={height ? `${height} ${units === 'metric' ? 'cm' : 'in'}` : 'Not set'} />
                <Row label="Diet" value={dietaryType} />
                {allergies.length > 0 && <Row label="Allergies" value={allergies.join(', ')} />}
                <Row label="Units" value={units || 'metric'} />
                <Row label="Goal" value={GOALS.find(g => g.key === goal)?.label || goal} />
                {members.filter(m => m.name.trim()).length > 0 && (
                  <Row label="Family" value={`${members.filter(m => m.name.trim()).length} additional member(s)`} />
                )}
              </div>
            </div>

            {user ? (
              <button onClick={handleSave} disabled={saving} style={{
                display: 'block', width: '100%', padding: '1rem', borderRadius: '12px',
                background: saving ? 'var(--text-4)' : 'var(--primary)', color: '#fff', border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: '1.0625rem', fontWeight: 700,
                boxShadow: '0 4px 14px rgba(61,138,62,0.35)',
              }}>{saving ? 'Saving…' : 'Save & start planning →'}</button>
            ) : (
              <>
                <p style={{ textAlign: 'center', color: 'var(--text-3)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
                  Create a free account to save your data and start planning.
                </p>
                <button onClick={() => setAuthOpen(true)} style={{
                  display: 'block', width: '100%', padding: '1rem', borderRadius: '12px',
                  background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: '1.0625rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(61,138,62,0.35)',
                }}>Create free account →</button>
              </>
            )}

            <button onClick={() => setStep(4)} style={{
              display: 'block', width: '100%', padding: '1rem', borderRadius: '12px',
              border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)',
              cursor: 'pointer', fontWeight: 600, fontSize: '1rem', marginTop: '1rem',
            }}>← Back</button>
          </div>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} defaultTab="signup" />
    </div>
  )
}

function StepIndicator({ step, steps }) {
  const pct = Math.round((step / (steps.length - 1)) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>{step + 1}/{steps.length}</span>
      <div style={{ width: '80px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>{label}</span>
      <span style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>{value}</span>
    </div>
  )
}

function NavButtons({ canNext, onNext, onBack, showBack = true, nextLabel = 'Next →' }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
      {showBack && onBack && <button onClick={onBack} style={backBtnStyle}>← Back</button>}
      <button onClick={onNext} disabled={!canNext} style={{
        ...nextBtnStyle, flex: 1,
        background: canNext ? 'var(--primary)' : 'var(--border)',
        cursor: canNext ? 'pointer' : 'not-allowed',
        color: canNext ? '#fff' : 'var(--text-4)',
      }}>{nextLabel}</button>
    </div>
  )
}

const headingStyle = { fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 0.625rem', lineHeight: 1.2 }
const subStyle = { color: 'var(--text-3)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }
const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.375rem' }
const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '1rem', boxSizing: 'border-box' }
const cardStyle = { background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border)' }
const nextBtnStyle = { padding: '1rem', borderRadius: '12px', border: 'none', fontSize: '1rem', fontWeight: 700 }
const backBtnStyle = { padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }
