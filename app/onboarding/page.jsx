'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { computeBMR, computeTDEE } from '@/lib/nutrition/portionCalc'
import AuthModal from '@/components/landing/AuthModal'

const STORAGE_KEY = 'mintyfit-onboarding'

const DIETARY_OPTIONS = [
  { key: 'no_restrictions', label: 'No restrictions', icon: '🍽️' },
  { key: 'vegetarian', label: 'Vegetarian', icon: '🥦' },
  { key: 'vegan', label: 'Vegan', icon: '🌱' },
  { key: 'gluten_free', label: 'Gluten-free', icon: '🌾' },
  { key: 'dairy_free', label: 'Dairy-free', icon: '🥛' },
  { key: 'nut_allergy', label: 'Nut allergy', icon: '🥜' },
  { key: 'keto', label: 'Keto', icon: '🥓' },
  { key: 'paleo', label: 'Paleo', icon: '🍖' },
  { key: 'pescatarian', label: 'Pescatarian', icon: '🐟' },
]

const GOALS = [
  { key: 'lose_weight', label: 'Lose weight', icon: '⚖️' },
  { key: 'eat_healthier', label: 'Eat healthier', icon: '🥗' },
  { key: 'build_muscle', label: 'Build muscle', icon: '💪' },
  { key: 'manage_condition', label: 'Manage a health condition', icon: '🩺' },
  { key: 'family_wellness', label: 'Feed my family better', icon: '👨‍👩‍👧‍👦' },
]

// Example recipe for the payoff screen
const SAMPLE_RECIPE = {
  name: 'Mediterranean Chicken Bowl',
  emoji: '🫙',
  baseCalories: 620,
  nutrition: { protein: 42, carbs: 55, fat: 18, fiber: 8 },
}

function emptyMember(primary = false) {
  return {
    id: Date.now() + Math.random(),
    name: primary ? '' : '',
    dob: '',
    gender: 'male',
    weight: '',
    weightUnit: 'kg',
    height: '',
    heightUnit: 'cm',
    isPrimary: primary,
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [members, setMembers] = useState([emptyMember(true)])
  const [dietary, setDietary] = useState({}) // { memberId: Set of keys }
  const [goals, setGoals] = useState({})     // { memberId: key }
  const [authOpen, setAuthOpen] = useState(false)

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.members?.length) setMembers(data.members)
        if (data.dietary) setDietary(data.dietary)
        if (data.goals) setGoals(data.goals)
        if (data.step) setStep(data.step)
      }
    } catch {}
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, dietary, goals, step }))
    } catch {}
  }, [members, dietary, goals, step])

  function updateMember(id, field, value) {
    setMembers(ms => ms.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  function addMember() {
    setMembers(ms => [...ms, emptyMember(false)])
  }

  function removeMember(id) {
    setMembers(ms => ms.filter(m => m.id !== id))
  }

  function toggleDietary(memberId, key) {
    setDietary(d => {
      const current = new Set(d[memberId] || [])
      if (key === 'no_restrictions') return { ...d, [memberId]: ['no_restrictions'] }
      current.delete('no_restrictions')
      if (current.has(key)) current.delete(key)
      else current.add(key)
      return { ...d, [memberId]: Array.from(current) }
    })
  }

  function setGoal(memberId, key) {
    setGoals(g => ({ ...g, [memberId]: key }))
  }

  function getMemberAge(dob) {
    if (!dob) return null
    const today = new Date()
    const birth = new Date(dob)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  function getMemberKg(member) {
    const w = parseFloat(member.weight)
    if (!w) return null
    return member.weightUnit === 'lbs' ? Math.round(w * 0.453592) : w
  }

  function getMemberCm(member) {
    const h = parseFloat(member.height)
    if (!h) return null
    return member.heightUnit === 'ft' ? Math.round(h * 30.48) : h
  }

  function computeMemberTDEE(member) {
    const age = getMemberAge(member.dob)
    const kg = getMemberKg(member)
    const cm = getMemberCm(member)
    if (!age || !kg || !cm) return null
    return computeTDEE(kg, cm, age, member.gender)
  }

  // Portion scale relative to first member
  function getPortionScale(member, allMembers) {
    const tdeeSelf = computeMemberTDEE(member)
    if (!tdeeSelf) return 1
    const totalTDEE = allMembers.reduce((s, m) => s + (computeMemberTDEE(m) || 0), 0)
    if (totalTDEE === 0) return 1
    const equalShare = totalTDEE / allMembers.length
    return tdeeSelf / equalShare
  }

  const step1Valid = members.every(m => m.name.trim() && m.dob && m.weight && m.height)
  const step2Valid = true // dietary is optional
  const step3Valid = members.every(m => goals[m.id])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{
        padding: '1rem 1.5rem',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' }}>
          🌿 MintyFit
        </Link>
        <ProgressBar step={step} />
        <Link href="/" style={{ color: 'var(--text-3)', fontSize: '0.875rem', textDecoration: 'none' }}>
          Back to home
        </Link>
      </header>

      <div style={{ flex: 1, padding: '2rem 1.25rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        {/* STEP 1 — Family members */}
        {step === 1 && (
          <div>
            <h1 style={headingStyle}>Who's at your table?</h1>
            <p style={subStyle}>Tell us about each person so we can calculate their exact nutrition needs.</p>

            {members.map((member, idx) => (
              <MemberForm
                key={member.id}
                member={member}
                label={idx === 0 ? 'You' : `Family member ${idx + 1}`}
                onUpdate={(field, val) => updateMember(member.id, field, val)}
                onRemove={idx > 0 ? () => removeMember(member.id) : null}
              />
            ))}

            <button onClick={addMember} style={addMemberStyle}>
              + Add another family member
            </button>

            <NavButtons
              canNext={step1Valid}
              onNext={() => setStep(2)}
              showBack={false}
            />
          </div>
        )}

        {/* STEP 2 — Dietary needs */}
        {step === 2 && (
          <div>
            <h1 style={headingStyle}>Any dietary needs?</h1>
            <p style={subStyle}>Select all that apply. Each family member can have different restrictions.</p>

            {members.map((member, idx) => (
              <div key={member.id} style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>
                  {idx === 0 ? 'You' : member.name || `Family member ${idx + 1}`}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                  {DIETARY_OPTIONS.map(opt => {
                    const selected = (dietary[member.id] || []).includes(opt.key)
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleDietary(member.id, opt.key)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                          padding: '0.5rem 0.875rem', borderRadius: '20px',
                          border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          background: selected ? '#f0fdf4' : 'var(--bg-card)',
                          color: selected ? 'var(--primary)' : 'var(--text-2)',
                          cursor: 'pointer', fontWeight: selected ? 600 : 400,
                          fontSize: '0.875rem',
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <NavButtons
              canNext={step2Valid}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          </div>
        )}

        {/* STEP 3 — Goals */}
        {step === 3 && (
          <div>
            <h1 style={headingStyle}>What's your goal?</h1>
            <p style={subStyle}>MintyFit uses this to tailor recipe suggestions and nutrient targets.</p>

            {members.map((member, idx) => (
              <div key={member.id} style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>
                  {idx === 0 ? 'You' : member.name || `Family member ${idx + 1}`}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {GOALS.map(g => {
                    const selected = goals[member.id] === g.key
                    return (
                      <button
                        key={g.key}
                        onClick={() => setGoal(member.id, g.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.875rem',
                          padding: '0.875rem 1.25rem', borderRadius: '12px',
                          border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          background: selected ? '#f0fdf4' : 'var(--bg-card)',
                          color: selected ? 'var(--primary)' : 'var(--text-1)',
                          cursor: 'pointer', textAlign: 'left', fontWeight: selected ? 600 : 400,
                          fontSize: '0.9375rem',
                        }}
                      >
                        <span style={{ fontSize: '1.375rem' }}>{g.icon}</span>
                        {g.label}
                        {selected && <span style={{ marginLeft: 'auto', fontSize: '1rem' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <NavButtons
              canNext={step3Valid}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
              nextLabel="See your plan →"
            />
          </div>
        )}

        {/* STEP 4 — Payoff */}
        {step === 4 && (
          <PayoffScreen
            members={members}
            computeMemberTDEE={computeMemberTDEE}
            getPortionScale={getPortionScale}
            onBack={() => setStep(3)}
            onOpenAuth={() => setAuthOpen(true)}
          />
        )}
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
        defaultTab="signup"
      />
    </div>
  )
}

// ---- Sub-components ----

function ProgressBar({ step }) {
  const steps = ['Family', 'Diet', 'Goals', 'Your plan']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: i + 1 <= step ? 'var(--primary)' : 'var(--border)',
            color: i + 1 <= step ? '#fff' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
          }}>
            {i + 1 < step ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: '20px', height: '2px', background: i + 1 < step ? 'var(--primary)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function MemberForm({ member, label, onUpdate, onRemove }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem',
      border: '1px solid var(--border)', marginBottom: '1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{label}</h3>
        {onRemove && (
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1.25rem' }}>×</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Name</label>
          <input
            value={member.name}
            onChange={e => onUpdate('name', e.target.value)}
            placeholder="First name"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Date of birth</label>
          <input
            type="date"
            value={member.dob}
            onChange={e => onUpdate('dob', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['male', 'female'].map(g => (
              <button
                key={g}
                onClick={() => onUpdate('gender', g)}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: '8px',
                  border: `2px solid ${member.gender === g ? 'var(--primary)' : 'var(--border)'}`,
                  background: member.gender === g ? '#f0fdf4' : 'var(--bg-page)',
                  color: member.gender === g ? 'var(--primary)' : 'var(--text-2)',
                  cursor: 'pointer', fontWeight: member.gender === g ? 600 : 400,
                  fontSize: '0.875rem', textTransform: 'capitalize',
                }}
              >
                {g === 'male' ? '♂' : '♀'} {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Weight</label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <input
              type="number"
              value={member.weight}
              onChange={e => onUpdate('weight', e.target.value)}
              placeholder={member.weightUnit === 'kg' ? '70' : '154'}
              min={1}
              style={{ ...inputStyle, flex: 1 }}
            />
            <UnitToggle
              value={member.weightUnit}
              options={['kg', 'lbs']}
              onChange={v => onUpdate('weightUnit', v)}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Height</label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <input
              type="number"
              value={member.height}
              onChange={e => onUpdate('height', e.target.value)}
              placeholder={member.heightUnit === 'cm' ? '175' : '5.9'}
              min={1}
              style={{ ...inputStyle, flex: 1 }}
            />
            <UnitToggle
              value={member.heightUnit}
              options={['cm', 'ft']}
              onChange={v => onUpdate('heightUnit', v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function UnitToggle({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '0 0.625rem',
            background: value === opt ? 'var(--primary)' : 'var(--bg-page)',
            color: value === opt ? '#fff' : 'var(--text-3)',
            border: 'none', cursor: 'pointer',
            fontSize: '0.8125rem', fontWeight: 600,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function NavButtons({ canNext, onNext, onBack, showBack = true, nextLabel = 'Next →' }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
      {showBack && onBack && (
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
      )}
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          ...nextBtnStyle,
          background: canNext ? 'var(--primary)' : 'var(--border)',
          cursor: canNext ? 'pointer' : 'not-allowed',
          color: canNext ? '#fff' : 'var(--text-4)',
          flex: 1,
        }}
      >
        {nextLabel}
      </button>
    </div>
  )
}

function PayoffScreen({ members, computeMemberTDEE, getPortionScale, onBack, onOpenAuth }) {
  const recipe = SAMPLE_RECIPE
  const baseTDEE = computeMemberTDEE(members[0]) || 2000
  // Scale recipe so primary member gets ~one full serving
  const recipeServingRatio = baseTDEE / 2000

  return (
    <div>
      <h1 style={headingStyle}>Here's what dinner looks like for your family</h1>
      <p style={subStyle}>Based on your metabolic data, here's how one recipe divides for your family.</p>

      {/* Sample recipe card */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem',
        border: '1px solid var(--border)', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '12px',
            background: '#f0fdf4', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '2rem', flexShrink: 0,
          }}>
            {recipe.emoji}
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 0.25rem' }}>
              {recipe.name}
            </h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.8125rem', margin: 0 }}>
              AI-generated example recipe
            </p>
          </div>
        </div>

        {/* Per-member portion rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {members.map((member, idx) => {
            const tdee = computeMemberTDEE(member)
            const scale = getPortionScale(member, members)
            const kcal = tdee ? Math.round((recipe.baseCalories * recipeServingRatio) * scale) : null
            const portionLabel = scale >= 1.4 ? 'Large portion' : scale >= 0.9 ? 'Standard portion' : 'Smaller portion'
            const portionMultiplier = scale.toFixed(1) + '×'
            const name = idx === 0 ? (member.name || 'You') : (member.name || `Member ${idx + 1}`)

            return (
              <div key={member.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.875rem', borderRadius: '10px',
                background: idx === 0 ? '#f0fdf4' : 'var(--bg-page)',
                border: `1px solid ${idx === 0 ? '#86efac' : 'var(--border)'}`,
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                }}>
                  {name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-1)' }}>{name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                    {portionLabel} · {portionMultiplier} portion
                  </div>
                </div>
                {kcal && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{kcal} kcal</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      P {Math.round(recipe.nutrition.protein * scale)}g · C {Math.round(recipe.nutrition.carbs * scale)}g · F {Math.round(recipe.nutrition.fat * scale)}g
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* How it was calculated */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: '12px', padding: '1rem 1.25rem',
        border: '1px solid var(--border)', marginBottom: '2rem', fontSize: '0.8125rem',
        color: 'var(--text-3)', lineHeight: 1.6,
      }}>
        💡 Portions are calculated using the Mifflin-St Jeor formula for each person's basal metabolic rate.
        This is the same science used by registered dietitians.
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--text-1)' }}>
          Ready to plan your full week?
        </h3>
        <p style={{ color: 'var(--text-3)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Create a free account to save your family's data and start planning.
        </p>
        <button
          onClick={onOpenAuth}
          style={{
            display: 'block', width: '100%', padding: '1rem',
            borderRadius: '12px', background: 'var(--primary)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: '1.0625rem', fontWeight: 700,
            boxShadow: '0 4px 14px rgba(61,138,62,0.35)',
          }}
        >
          Create a free account to plan your full week →
        </button>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-4)', marginTop: '0.75rem' }}>
          No credit card required · Takes 30 seconds
        </p>
      </div>

      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: '1.5rem', width: '100%' }}>
        ← Back to goals
      </button>
    </div>
  )
}

// ---- Shared styles ----

const headingStyle = {
  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
  fontWeight: 800,
  color: 'var(--text-1)',
  marginBottom: '0.625rem',
  lineHeight: 1.2,
}

const subStyle = {
  color: 'var(--text-3)',
  fontSize: '1rem',
  marginBottom: '2rem',
  lineHeight: 1.6,
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--text-2)',
  marginBottom: '0.375rem',
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg-page)',
  color: 'var(--text-1)',
  fontSize: '1rem',
  outline: 'none',
}

const addMemberStyle = {
  width: '100%',
  padding: '0.875rem',
  borderRadius: '12px',
  border: '2px dashed var(--border)',
  background: 'none',
  color: 'var(--primary)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9375rem',
  marginBottom: '1rem',
}

const nextBtnStyle = {
  padding: '1rem',
  borderRadius: '12px',
  border: 'none',
  fontSize: '1rem',
  fontWeight: 700,
}

const backBtnStyle = {
  padding: '1rem 1.5rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-2)',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '1rem',
}
