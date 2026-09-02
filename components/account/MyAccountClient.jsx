'use client'

import { useState } from 'react'
import Link from 'next/link'
import { computeBMR, explainBMR } from '@/lib/nutrition/portionCalc'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'
import { formatWeight, formatHeight, fieldLabel, dbToDisplay, lbsToKg, inToCm } from '@/lib/unitConversion'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'

const DIETARY_TYPES = ['none', 'omnivore', 'vegetarian', 'vegan', 'keto', 'paleo', 'pescatarian']
const ALLERGENS = ['none', 'gluten', 'dairy', 'nuts', 'shellfish', 'soy', 'eggs', 'fish', 'peanuts']
const GOALS = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'eat_healthier', label: 'Eat healthier' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'metabolic_health', label: 'Metabolic health' },
  { value: 'general_wellness', label: 'General wellness' },
]

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function WeightSparkline({ logs }) {
  if (logs.length < 2) return null
  const recent = logs.slice(0, 20).reverse()
  const weights = recent.map(l => l.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const W = 200
  const H = 50

  const points = recent.map((log, i) => {
    const x = (i / (recent.length - 1)) * W
    const y = H - ((log.weight - min) / range) * (H - 10) - 5
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {recent.map((log, i) => {
        const x = (i / (recent.length - 1)) * W
        const y = H - ((log.weight - min) / range) * (H - 10) - 5
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--primary)" />
      })}
    </svg>
  )
}

function age(profile) {
  if (profile.age) return Number(profile.age)
  if (profile.date_of_birth) {
    const dob = new Date(profile.date_of_birth)
    if (!isNaN(dob)) {
      const diff = Date.now() - dob.getTime()
      return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
    }
  }
  return null
}

function BMRBreakdown({ profile, weightLogs, isMetric }) {
  const a = age(profile)
  // Fall back to latest weight_log if profile.weight isn't set
  const latestLogged = weightLogs && weightLogs.length ? Number(weightLogs[0].weight) : null
  const weight = Number(profile.weight) || latestLogged || null
  const gender = profile.gender || profile.sex || null
  const user = {
    weight,
    height: profile.height,
    age: a,
    gender,
    body_fat_pct: profile.body_fat_pct,
    pregnancy: profile.pregnancy,
    lactation: profile.lactation,
  }
  const bmr = computeBMR(user)
  const explained = bmr ? explainBMR(user) : null
  const sedentaryTDEE = bmr ? Math.round(bmr * 1.2 / 10) * 10 : null
  const needs = bmr ? computeMemberDailyNeeds({ ...user, baseDailyCalories: sedentaryTDEE }) : null

  return (
    <Section title="Energy Needs (BMR)">
      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 14px', lineHeight: 1.5 }}>
        Your Basal Metabolic Rate is the foundation for every nutrition target on the
        Plan and Statistics pages. It's recalculated whenever you update weight,
        height, age, or gender.
      </p>

      {!bmr ? (
        <div style={{ padding: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
          We can't calculate your BMR yet — please fill in your weight, height, age,
          and gender above.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <Stat label="BMR (at rest)" value={`${bmr} kcal`} accent />
            <Stat label="Sedentary daily target" value={`${sedentaryTDEE} kcal`} />
          </div>

          <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Equation used
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
              {explained.branch}
            </div>
            {explained.steps && explained.steps.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {explained.steps.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '3px 0',
                    fontSize: '12px', color: s.isTotal ? 'var(--text-2)' : 'var(--text-3)',
                    borderTop: s.isTotal ? '1px dashed var(--border)' : 'none',
                    fontWeight: s.isTotal ? 600 : 400,
                    marginTop: s.isTotal ? 4 : 0, paddingTop: s.isTotal ? 7 : 3,
                  }}>
                    <span>{s.label}</span>
                    <span>{s.value.toLocaleString('en-US')} kcal</span>
                  </div>
                ))}
              </div>
            )}
            <code style={{ fontSize: '12px', color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>
              {explained.formula} = {bmr} kcal/day
            </code>
            {explained.additions.length > 0 && (
              <div style={{ marginTop: 8, fontSize: '12px', color: 'var(--text-2)' }}>
                {explained.additions.map((a, i) => (
                  <div key={i}>{a.op} {a.kcal} kcal — {a.label}</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              Inputs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '13px', color: 'var(--text-2)' }}>
              <span>Weight</span><strong style={{ color: 'var(--text-1)' }}>{user.weight ? formatWeight(user.weight, isMetric) : '—'}</strong>
              <span>Height</span><strong style={{ color: 'var(--text-1)' }}>{user.height ? formatHeight(user.height, isMetric) : '—'}</strong>
              <span>Age</span><strong style={{ color: 'var(--text-1)' }}>{a ?? '—'}</strong>
              <span>Sex</span><strong style={{ color: 'var(--text-1)' }}>{user.gender || '—'}</strong>
              {user.body_fat_pct ? (<><span>Body fat</span><strong style={{ color: 'var(--text-1)' }}>{user.body_fat_pct}%</strong></>) : null}
            </div>
          </div>

          {needs && (
            <div style={{ marginTop: 14, fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>
              At {sedentaryTDEE} kcal/day your daily targets work out to roughly{' '}
              <strong>{Math.round(needs.protein)}g protein</strong>,{' '}
              <strong>{Math.round(needs.carbs_total)}g carbs</strong>,{' '}
              <strong>{Math.round(needs.fat_total)}g fat</strong>, and{' '}
              <strong>{Math.round(needs.fiber)}g fibre</strong>. Activity logged on the
              Plan page increases this target proportionally.
            </div>
          )}
        </>
      )}
    </Section>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div style={{
      background: accent ? 'rgba(61,138,62,0.08)' : 'var(--bg-page)',
      border: `1px solid ${accent ? 'var(--primary)' : 'var(--border)'}`,
      borderRadius: '8px', padding: '12px 14px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: accent ? 'var(--primary)' : 'var(--text-1)' }}>
        {value}
      </div>
    </div>
  )
}

export default function MyAccountClient({ userId, userEmail, initialData }) {
  const { profile: initialProfile, weightLogs: initialWeightLogs, nutritionistLink } = initialData

  const [profile, setProfile] = useState(initialProfile || {})
  const [weightLogs, setWeightLogs] = useState(initialWeightLogs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  // Weight log form
  const [newWeight, setNewWeight] = useState('')
  const [weightNote, setWeightNote] = useState('')
  const [loggingWeight, setLoggingWeight] = useState(false)
  const [showWeightHistory, setShowWeightHistory] = useState(false)

  // Nutritionist connect
  const [nutritionistEmail, setNutritionistEmail] = useState('')
  const [connectingNutritionist, setConnectingNutritionist] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState(null)
  const toast = useToast()
  const confirmDialog = useConfirm()

  const currentWeight = weightLogs[0]?.weight || profile.weight
  const isMetric = profile.units_preference !== 'imperial'

  async function saveProfile() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.full_name,
          dietary_type: profile.dietary_type,
          allergies: profile.allergies,
          primary_goal: profile.primary_goal,
          units: profile.units_preference,
          date_of_birth: profile.date_of_birth,
          gender: profile.gender,
          height: profile.height,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function logWeight() {
    if (!newWeight) return
    setLoggingWeight(true)
    try {
      const weightKg = isMetric ? parseFloat(newWeight) : lbsToKg(parseFloat(newWeight))
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: Math.round(weightKg * 100) / 100, note: weightNote }),
      })
      if (!res.ok) throw new Error('Failed to log weight')
      const { log } = await res.json()
      setWeightLogs(prev => [log, ...prev.filter(l => l.logged_date !== log.logged_date)])
      setNewWeight('')
      setWeightNote('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoggingWeight(false)
    }
  }

  async function connectNutritionist() {
    if (!nutritionistEmail) return
    setConnectingNutritionist(true)
    setError(null)
    try {
      console.log('[connect-client] Fetching /api/nutritionist/connect with email:', nutritionistEmail)
      const res = await fetch('/api/nutritionist/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nutritionistEmail }),
      })
      const d = await res.json()
      if (!res.ok) {
        throw new Error(d.error || `Server returned ${res.status}`)
      }
      const nutritionistName = d.nutritionistName || 'your nutritionist'
      toast.success(`You are now connected to ${nutritionistName}'s account.`)
      window.location.reload()
    } catch (err) {
      console.error('[connect-client] Error:', err)
      setError(err.message || 'Unknown error')
    } finally {
      setConnectingNutritionist(false)
    }
  }

  async function disconnectNutritionist() {
    if (!(await confirmDialog({ title: 'Disconnect nutritionist?', body: 'They will no longer see your meal plans or nutrition data.', confirmLabel: 'Disconnect', destructive: true }))) return
    try {
      await fetch('/api/nutritionist/connect', { method: 'DELETE' })
      window.location.reload()
    } catch {}
  }

  function toggleAllergy(a) {
    const current = profile.allergies || []
    let next
    if (a === 'none') {
      next = current.includes('none') ? [] : ['none']
    } else {
      next = current.includes(a) ? current.filter(x => x !== a) : [...current.filter(x => x !== 'none'), a]
    }
    setProfile(prev => ({ ...prev, allergies: next }))
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--border)', borderRadius: '8px',
    background: 'var(--bg-page)', color: 'var(--text-1)',
    fontSize: '14px', outline: 'none',
  }

  const labelStyle = { display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '500' }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px 80px' }}>
      <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '24px' }}>
        My Profile
      </h1>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Weight & Measurements */}
      <Section title="Weight & Measurements">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', fontWeight: '800', color: 'var(--primary)' }}>
              {currentWeight ? formatWeight(currentWeight, isMetric).replace(/ (kg|lbs)/, '') : '—'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {isMetric ? 'kg' : 'lbs'} · current weight
            </div>
          </div>
          {weightLogs.length > 1 && <WeightSparkline logs={weightLogs} />}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            type="number" step="0.1" placeholder={fieldLabel('weight_kg', isMetric)}
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            style={{ ...inputStyle, width: '140px' }}
          />
          <input
            type="text" placeholder="Note (optional)"
            value={weightNote}
            onChange={e => setWeightNote(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={logWeight}
            disabled={loggingWeight || !newWeight}
            style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 18px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500', opacity: (loggingWeight || !newWeight) ? 0.6 : 1,
            }}
          >
            {loggingWeight ? 'Logging…' : 'Log weight'}
          </button>
        </div>

        {weightLogs.length > 0 && (
          <button
            onClick={() => setShowWeightHistory(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '13px', padding: '0' }}
          >
            {showWeightHistory ? 'Hide' : 'See full history'} ({weightLogs.length} entries)
          </button>
        )}

        {showWeightHistory && (
          <div style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
            {weightLogs.map(log => (
              <div key={log.id} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid var(--border)',
                fontSize: '13px',
              }}>
                <span style={{ color: 'var(--text-2)' }}>{log.logged_date}</span>
                <span style={{ fontWeight: '600', color: 'var(--text-1)' }}>{formatWeight(log.weight, isMetric)}</span>
                {log.note && <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{log.note}</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
          <div>
            <label style={labelStyle}>{fieldLabel('height_cm', isMetric)}</label>
            <input
              type="number"
              value={dbToDisplay(profile.height, 'height_cm', isMetric)}
              onChange={e => {
                const dv = e.target.value
                setProfile(prev => ({ ...prev, height: isMetric ? dv : dv ? inToCm(parseFloat(dv)) : dv }))
              }}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date of birth</label>
            <input
              type="date"
              value={profile.date_of_birth || ''}
              onChange={e => setProfile(prev => ({ ...prev, date_of_birth: e.target.value }))}
              style={inputStyle}
            />
          </div>
        </div>
      </Section>

      <BMRBreakdown profile={profile} weightLogs={weightLogs} isMetric={isMetric} />

      {/* Personal Info */}
      <Section title="Personal Info">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={profile.full_name || ''}
              onChange={e => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <select
              value={profile.gender || ''}
              onChange={e => setProfile(prev => ({ ...prev, gender: e.target.value }))}
              style={inputStyle}
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={userEmail} disabled style={{ ...inputStyle, opacity: 0.6 }} />
          </div>
        </div>
      </Section>

      {/* Dietary Preferences */}
      <Section title="Dietary Preferences">
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Dietary type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {DIETARY_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setProfile(prev => ({ ...prev, dietary_type: t }))}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: '1px solid',
                  borderColor: profile.dietary_type === t ? 'var(--primary)' : 'var(--border)',
                  background: profile.dietary_type === t ? 'var(--primary)' : 'transparent',
                  color: profile.dietary_type === t ? '#fff' : 'var(--text-2)',
                  cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Allergies & intolerances</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ALLERGENS.map(a => {
              const active = (profile.allergies || []).includes(a)
              return (
                <button
                  key={a}
                  onClick={() => toggleAllergy(a)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', border: '1px solid',
                    borderColor: active ? '#ef4444' : 'var(--border)',
                    background: active ? '#fef2f2' : 'transparent',
                    color: active ? '#ef4444' : 'var(--text-2)',
                    cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize',
                  }}
                >
                  {active ? '✕ ' : ''}{a}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Goals */}
      <Section title="Goals">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => setProfile(prev => ({ ...prev, primary_goal: g.value }))}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: '1px solid',
                borderColor: profile.primary_goal === g.value ? 'var(--primary)' : 'var(--border)',
                background: profile.primary_goal === g.value ? 'var(--primary)' : 'transparent',
                color: profile.primary_goal === g.value ? '#fff' : 'var(--text-2)',
                cursor: 'pointer', fontSize: '14px',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <div>
          <label style={labelStyle}>Units</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['metric', 'imperial'].map(u => (
              <button
                key={u}
                onClick={() => setProfile(prev => ({ ...prev, units_preference: u }))}
                style={{
                  padding: '8px 20px', borderRadius: '20px', border: '1px solid',
                  borderColor: profile.units_preference === u ? 'var(--primary)' : 'var(--border)',
                  background: profile.units_preference === u ? 'var(--primary)' : 'transparent',
                  color: profile.units_preference === u ? '#fff' : 'var(--text-2)',
                  cursor: 'pointer', fontSize: '14px', textTransform: 'capitalize',
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Subscription */}
      <Section title="Subscription">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text-1)', textTransform: 'capitalize', fontSize: '16px' }}>
              {profile.subscription_tier || 'Free'} Plan
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>
              {profile.subscription_tier === 'free' || !profile.subscription_tier
                ? '5 AI recipes/day · Up to 2 family members'
                : 'Unlimited AI recipes · Full features'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(profile.subscription_tier === 'free' || !profile.subscription_tier) && (
              <Link href="/pricing" style={{
                display: 'inline-block', background: 'var(--primary)', color: '#fff',
                padding: '10px 20px', borderRadius: '8px', textDecoration: 'none',
                fontSize: '14px', fontWeight: '500',
              }}>
                Upgrade
              </Link>
            )}
            {profile.stripe_customer_id && (
              <button
                onClick={async () => {
                  setPortalError(null)
                  setPortalLoading(true)
                  try {
                    const res = await fetch('/api/stripe/portal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to open billing portal')
                    if (data?.url) window.location.href = data.url
                    else throw new Error('No portal URL returned.')
                  } catch (err) {
                    setPortalError(err.message)
                  } finally {
                    setPortalLoading(false)
                  }
                }}
                disabled={portalLoading}
                style={{
                  display: 'inline-block', border: '1px solid var(--border)', color: 'var(--text-2)',
                  padding: '10px 20px', borderRadius: '8px', background: 'transparent',
                  fontSize: '14px', cursor: portalLoading ? 'wait' : 'pointer',
                  opacity: portalLoading ? 0.7 : 1,
                }}>
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </button>
            )}
          </div>
          {portalError && (
            <div style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px' }}>{portalError}</div>
          )}
        </div>
      </Section>

      {/* Nutritionist */}
      <Section title="Working with a nutritionist?">
        {nutritionistLink ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-1)' }}>
                {nutritionistLink.profiles?.full_name || 'Your nutritionist'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                Status: Active · Can view your meal plans, nutrition stats
              </div>
            </div>
            <button
              onClick={disconnectNutritionist}
              style={{
                background: 'none', border: '1px solid #fecaca', color: '#ef4444',
                borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <div style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '12px' }}>
              Share your nutrition data with a professional.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="Nutritionist's email"
                value={nutritionistEmail}
                onChange={e => setNutritionistEmail(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
              />
              <button
                onClick={connectNutritionist}
                disabled={connectingNutritionist || !nutritionistEmail}
                style={{
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '10px 18px', cursor: 'pointer',
                  fontSize: '14px', opacity: (connectingNutritionist || !nutritionistEmail) ? 0.6 : 1,
                }}
              >
                {connectingNutritionist ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Account */}
      <Section title="Account">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/api/gdpr/export" style={{
            border: '1px solid var(--border)', color: 'var(--text-2)',
            padding: '8px 16px', borderRadius: '8px', textDecoration: 'none',
            fontSize: '14px',
          }}>
            Export my data
          </a>
          <button
            onClick={() => {
              confirmDialog({
                title: 'Delete your account?',
                body: 'All your data — recipes, plans, journal entries, and family data — will be permanently deleted. This cannot be undone.',
                confirmLabel: 'Delete everything',
                destructive: true,
              }).then(ok => {
                if (ok) fetch('/api/gdpr/delete', { method: 'DELETE' }).then(() => window.location.href = '/')
              })
            }}
            style={{
              background: 'none', border: '1px solid #fecaca', color: '#ef4444',
              borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Delete account
          </button>
        </div>
      </Section>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          onClick={saveProfile}
          disabled={saving}
          style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '12px 32px', cursor: 'pointer',
            fontSize: '15px', fontWeight: '600', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
