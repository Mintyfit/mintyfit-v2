'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'
import { getMemberBMIFraction } from '@/lib/nutrition/portionCalc'

// ── Helpers ───────────────────────────────────────────────────────────────────
const GL_LABELS = { low: '🟢 Low GL', medium: '🟡 Medium GL', high: '🔴 High GL' }
const MEAL_COLORS = {
  breakfast: { bg: '#fef3c7', color: '#92400e' },
  lunch:     { bg: '#d1fae5', color: '#065f46' },
  dinner:    { bg: '#dbeafe', color: '#1e40af' },
  snack:     { bg: '#fce7f3', color: '#9d174d' },
  snack2:    { bg: '#fce7f3', color: '#9d174d' },
}

// Key nutrients by goal — shown in Layer 2
const KEY_NUTRIENTS_BY_GOAL = {
  weight_loss:   ['energy_kcal', 'protein', 'fiber', 'fat_total', 'carbs_total', 'sodium'],
  muscle_gain:   ['energy_kcal', 'protein', 'carbs_total', 'fat_total', 'iron', 'zinc'],
  energy:        ['energy_kcal', 'vit_b1', 'vit_b2', 'niacin', 'vit_b6', 'iron'],
  heart_health:  ['fat_saturated', 'fat_total', 'sodium', 'potassium', 'fiber', 'cholesterol'],
  default:       ['energy_kcal', 'protein', 'carbs_total', 'fat_total', 'fiber', 'sodium'],
}

function getKeyNutrients(goal) {
  return KEY_NUTRIENTS_BY_GOAL[goal] || KEY_NUTRIENTS_BY_GOAL.default
}

function getNutrientColor(pct) {
  if (pct >= 70) return '#10b981'
  if (pct >= 40) return '#f59e0b'
  if (pct <= 0) return '#9ca3af'
  return '#ef4444'
}

// ── DonutChart ────────────────────────────────────────────────────────────────
function DonutChart({ ps }) {
  const cal = ps?.energy_kcal || 0
  const pro = ps?.protein || 0
  const car = ps?.carbs_total || 0
  const fat = ps?.fat_total || 0
  const total = pro * 4 + car * 4 + fat * 9
  if (!total) return null
  const r = 44
  const circ = 2 * Math.PI * r
  const pArc = (pro * 4 / total) * circ
  const cArc = (car * 4 / total) * circ
  const fArc = (fat * 9 / total) * circ

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="12"
          strokeDasharray={`${pArc} ${circ}`} strokeDashoffset="0"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
          strokeDasharray={`${cArc} ${circ}`} strokeDashoffset={-pArc}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#6366f1" strokeWidth="12"
          strokeDasharray={`${fArc} ${circ}`} strokeDashoffset={-(pArc + cArc)}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        <text x="50" y="46" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text-1)">{Math.round(cal)}</text>
        <text x="50" y="60" textAnchor="middle" fontSize="10" fill="var(--text-3)">kcal</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[
          { label: 'Protein', val: pro, color: '#10b981' },
          { label: 'Carbs', val: car, color: '#f59e0b' },
          { label: 'Fat', val: fat, color: '#6366f1' },
        ].map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: m.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-2)', minWidth: 48 }}>{m.label}</span>
            <strong style={{ color: 'var(--text-1)' }}>{Math.round(m.val)}g</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── NutritionSection (all 3 layers) ──────────────────────────────────────────
function NutritionSection({ nutrition, memberMultiplier, memberGoal }) {
  const [showKey, setShowKey] = useState(false)
  const [showAll, setShowAll] = useState(false)

  if (!nutrition?.perServing) {
    return (
      <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-4)', fontSize: '0.875rem' }}>
        Nutrition data not available
      </div>
    )
  }

  // Scale per-serving data by member multiplier
  const ps = {}
  for (const [k, v] of Object.entries(nutrition.perServing)) {
    ps[k] = typeof v === 'number' ? v * (memberMultiplier || 1) : v
  }

  const keyKeys = getKeyNutrients(memberGoal)
  const keyFields = NUTRITION_FIELDS.filter(f => keyKeys.includes(f.key))
  const allFields = NUTRITION_FIELDS.filter(f => f.rda && f.key !== 'energy_kj' && ps[f.key] != null)

  return (
    <div>
      {/* Layer 1: Big 4 + donut */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '1.25rem', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1rem' }}>Nutrition per serving</h3>
        <DonutChart ps={ps} />
      </div>

      {/* Layer 2: Key nutrients */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '0.75rem' }}>
        <button
          onClick={() => setShowKey(v => !v)}
          style={{
            width: '100%', padding: '0.875rem 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)',
          }}
        >
          <span>Key nutrients</span>
          <span style={{ color: 'var(--text-3)' }}>{showKey ? '▲' : '▼'}</span>
        </button>
        {showKey && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {keyFields.map(f => {
              const val = ps[f.key]
              const pct = f.rda ? Math.min(150, (val / f.rda) * 100) : null
              return (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)', width: 140, flexShrink: 0 }}>{f.label}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-1)', fontWeight: 600, width: 60 }}>
                    {val != null ? `${Math.round(val * 10) / 10}${f.unit}` : '—'}
                  </span>
                  {pct != null && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-page)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: getNutrientColor(pct), borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', width: 36 }}>{Math.round(pct)}%</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Layer 3: All 47 nutrients */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            width: '100%', padding: '0.875rem 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)',
          }}
        >
          <span>All 47 nutrients</span>
          <span style={{ color: 'var(--text-3)' }}>{showAll ? '▲' : '▼'}</span>
        </button>
        {showAll && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {allFields.map(f => {
              const val = ps[f.key]
              if (val == null) return null
              const pct = f.rda ? Math.min(200, (val / f.rda) * 100) : null
              const barColor = pct == null ? '#9ca3af'
                : pct > 150 ? '#dc2626'
                : pct >= 70 ? '#10b981'
                : pct >= 40 ? '#f59e0b'
                : '#ef4444'
              return (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', width: 140, flexShrink: 0 }}>{f.label}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-1)', width: 56, textAlign: 'right', flexShrink: 0 }}>
                    {Math.round(val * 10) / 10}{f.unit}
                  </span>
                  {pct != null ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg-page)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-4)', width: 32 }}>{Math.round(pct)}%</span>
                    </div>
                  ) : <div style={{ flex: 1 }} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecipeDetailClient({ recipe, members }) {
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || null)
  const [showAddPlanMsg, setShowAddPlanMsg] = useState(false)
  const [shoppingState, setShoppingState] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'

  const selectedMember = members.find(m => m.id === selectedMemberId) || null

  // BMI fraction for portion scaling (1.0 = base serving)
  const memberMultiplier = selectedMember && members.length > 0
    ? getMemberBMIFraction(selectedMember, members) * members.length
    : 1

  const memberGoal = selectedMember?.goals?.[0] || 'default'
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const mealStyle = MEAL_COLORS[recipe.meal_type] || { bg: '#f3f4f6', color: '#374151' }

  function scaleAmount(amount) {
    if (!amount) return null
    const scaled = amount * memberMultiplier
    return scaled < 1 ? Math.round(scaled * 100) / 100 : Math.round(scaled * 10) / 10
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-3)' }}>
        <Link href="/recipes" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Recipes</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-2)' }}>{recipe.title}</span>
      </div>

      {/* Hero image */}
      {recipe.image && (
        <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem', background: '#f3f4f6' }}>
          <Image src={recipe.image} alt={recipe.title} fill style={{ objectFit: 'cover' }} sizes="800px" priority />
        </div>
      )}

      {/* Title & meta */}
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.625rem', lineHeight: 1.3 }}>
        {recipe.title}
      </h1>
      {recipe.description && (
        <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          {recipe.description}
        </p>
      )}

      {/* Meta pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {recipe.meal_type && (
          <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', background: mealStyle.bg, color: mealStyle.color, fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>
            {recipe.meal_type.replace('snack2', 'snack')}
          </span>
        )}
        {recipe.base_servings && (
          <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            👥 {recipe.base_servings} servings
          </span>
        )}
        {recipe.prep_time > 0 && (
          <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            Prep: {recipe.prep_time} min
          </span>
        )}
        {recipe.cook_time > 0 && (
          <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            Cook: {recipe.cook_time} min
          </span>
        )}
        {totalTime > 0 && (
          <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            ⏱ {totalTime} min total
          </span>
        )}
        {recipe.cuisine_type && (
          <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            🌍 {recipe.cuisine_type}
          </span>
        )}
        {recipe.glycemic_load && (
          <span style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
            {GL_LABELS[recipe.glycemic_load]}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button
          onClick={() => { setShowAddPlanMsg(true); setTimeout(() => setShowAddPlanMsg(false), 2000) }}
          style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer' }}
        >
          📅 Add to Plan
        </button>
        <button
          onClick={async () => {
            if (shoppingState === 'loading') return
            setShoppingState('loading')
            try {
              const res = await fetch('/api/shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipe_id: recipe.id }),
              })
              if (!res.ok) throw new Error('failed')
              setShoppingState('success')
              setTimeout(() => setShoppingState('idle'), 3000)
            } catch {
              setShoppingState('error')
              setTimeout(() => setShoppingState('idle'), 3000)
            }
          }}
          style={{
            padding: '0.625rem 1.25rem', borderRadius: '10px',
            background: shoppingState === 'success' ? 'rgba(61,138,62,0.1)' : 'transparent',
            border: `2px solid ${shoppingState === 'error' ? '#ef4444' : 'var(--primary)'}`,
            color: shoppingState === 'error' ? '#ef4444' : 'var(--primary)',
            fontWeight: 600, fontSize: '0.9375rem',
            cursor: shoppingState === 'loading' ? 'wait' : 'pointer',
            opacity: shoppingState === 'loading' ? 0.7 : 1,
          }}
        >
          {shoppingState === 'loading' ? '⏳ Adding…' : shoppingState === 'success' ? '✅ Added!' : shoppingState === 'error' ? '❌ Failed' : '🛒 Add to Shopping List'}
        </button>
        <button
          onClick={() => navigator?.share?.({ title: recipe.title, url: window.location.href })}
          style={{ padding: '0.625rem 1rem', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '0.9375rem', cursor: 'pointer' }}
        >
          ↗ Share
        </button>
      </div>

      {showAddPlanMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#d1fae5', borderRadius: '10px', color: '#065f46', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
          ✅ Go to your Planner to schedule this recipe!
        </div>
      )}

      {/* Member selector */}
      {members.length > 1 && (
        <div style={{ marginBottom: '2rem', background: 'var(--bg-card)', borderRadius: '14px', padding: '1rem 1.25rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portions for</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedMemberId(null)}
              style={{
                padding: '0.35rem 0.875rem', borderRadius: '20px',
                border: `1px solid ${selectedMemberId === null ? 'var(--primary)' : 'var(--border)'}`,
                background: selectedMemberId === null ? 'var(--primary)' : 'transparent',
                color: selectedMemberId === null ? '#fff' : 'var(--text-2)',
                fontSize: '0.8125rem', cursor: 'pointer',
              }}
            >
              Base recipe
            </button>
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                style={{
                  padding: '0.35rem 0.875rem', borderRadius: '20px',
                  border: `1px solid ${selectedMemberId === m.id ? 'var(--primary)' : 'var(--border)'}`,
                  background: selectedMemberId === m.id ? 'var(--primary)' : 'transparent',
                  color: selectedMemberId === m.id ? '#fff' : 'var(--text-2)',
                  fontSize: '0.8125rem', cursor: 'pointer',
                }}
              >
                {m.display_name || m.first_name || 'Member'}
              </button>
            ))}
          </div>
          {selectedMember && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '0.5rem' }}>
              Amounts scaled {memberMultiplier > 1 ? 'up' : 'down'} {Math.abs(Math.round((memberMultiplier - 1) * 100))}% for {selectedMember.display_name || 'this member'}
            </p>
          )}
        </div>
      )}

      {/* Ingredients */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1rem' }}>Ingredients</h2>

        {recipe.intro && (
          <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.25rem', fontStyle: 'italic' }}>
            {recipe.intro}
          </p>
        )}

        {/* Main component */}
        {recipe.steps?.filter(s => s.component === 'main').flatMap(s => s.ingredients || []).length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            {recipe.main_component && (
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>
                {recipe.main_component}
              </h3>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recipe.steps
                .filter(s => s.component === 'main')
                .flatMap(s => s.ingredients || [])
                .filter((ing, i, arr) => arr.findIndex(x => x.name === ing.name) === i)
                .map((ing, i) => {
                  const scaled = scaleAmount(ing.amount)
                  return (
                    <li key={i} style={{ padding: '0.375rem 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', fontSize: '0.9375rem', color: 'var(--text-2)' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>•</span>
                      <span>
                        {scaled ? <strong style={{ color: 'var(--text-1)' }}>{scaled} {ing.unit} </strong> : ''}
                        {ing.name}
                      </span>
                    </li>
                  )
                })
              }
            </ul>
          </div>
        )}

        {/* Side component */}
        {recipe.side_component && recipe.steps?.filter(s => s.component === 'side').flatMap(s => s.ingredients || []).length > 0 && (
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>
              {recipe.side_component}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recipe.steps
                .filter(s => s.component === 'side')
                .flatMap(s => s.ingredients || [])
                .filter((ing, i, arr) => arr.findIndex(x => x.name === ing.name) === i)
                .map((ing, i) => {
                  const scaled = scaleAmount(ing.amount)
                  return (
                    <li key={i} style={{ padding: '0.375rem 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', fontSize: '0.9375rem', color: 'var(--text-2)' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>•</span>
                      <span>
                        {scaled ? <strong style={{ color: 'var(--text-1)' }}>{scaled} {ing.unit} </strong> : ''}
                        {ing.name}
                      </span>
                    </li>
                  )
                })
              }
            </ul>
          </div>
        )}
      </section>

      {/* Instructions */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1rem' }}>Instructions</h2>
        {(recipe.steps || []).map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: step.component === 'side' ? '#e0e7ff' : 'var(--primary)',
              color: step.component === 'side' ? '#4338ca' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, marginTop: '0.125rem',
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.375rem' }}>
                {step.title && <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{step.title}</h3>}
                {step.time_marker && <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>⏱ {step.time_marker}</span>}
                {step.component && (
                  <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: step.component === 'side' ? '#e0e7ff' : '#d1fae5', color: step.component === 'side' ? '#4338ca' : '#065f46', textTransform: 'capitalize' }}>
                    {recipe[`${step.component}_component`] || step.component}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 0.375rem' }}>{step.instruction}</p>
              {step.tip && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-4)', fontStyle: 'italic', margin: 0 }}>
                  💡 {step.tip}
                </p>
              )}
            </div>
          </div>
        ))}
        {recipe.plating_note && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.875rem 1rem', fontSize: '0.9375rem', color: 'var(--text-2)', fontStyle: 'italic' }}>
            🍽️ {recipe.plating_note}
          </div>
        )}
      </section>

      {/* Nutrition */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1rem' }}>Nutrition</h2>
        <NutritionSection
          nutrition={recipe.nutrition}
          memberMultiplier={memberMultiplier}
          memberGoal={memberGoal}
        />
      </section>
    </div>
  )
}
