'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'
import { computeBMR, SEDENTARY_MULTIPLIER, getMemberBMIFraction, computeMemberNutrition } from '@/lib/nutrition/portionCalc'
import { createClient } from '@/lib/supabase/client'

// ── NutritionDelta (small inline nutrition preview per alternative) ──────────
function NutritionDelta({ nutrition }) {
  if (!nutrition) return null
  const fields = [
    { key: 'energy_kcal', label: 'kcal', unit: '' },
    { key: 'protein', label: 'prot', unit: 'g' },
    { key: 'carbs_total', label: 'carbs', unit: 'g' },
    { key: 'fat_total', label: 'fat', unit: 'g' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {fields.map(({ key, label, unit }) => {
        const val = nutrition[key]
        if (val == null) return null
        return (
          <span key={key} style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
            {label}: {Math.round(val)}{unit}
          </span>
        )
      })}
    </div>
  )
}

// ── IngredientAlternativesSheet ───────────────────────────────────────────────
function IngredientAlternativesSheet({ ingredient, alternatives, loading, onSelect, onClose }) {
  if (!ingredient) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          zIndex: 1000, animation: 'fadeIn 0.15s ease',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        zIndex: 1001, padding: '1.25rem',
        maxHeight: '75vh', overflowY: 'auto',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 1rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
              Swap ingredient
            </p>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-1)', margin: 0, textTransform: 'capitalize' }}>
              {ingredient.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'var(--bg-page)', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', fontSize: '1.125rem',
              color: 'var(--text-3)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)' }}>
            <div style={{
              width: 24, height: 24, border: '2px solid var(--primary)',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 10px',
            }} />
            Finding alternatives…
          </div>
        )}

        {/* Empty */}
        {!loading && alternatives.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-4)', fontSize: '0.875rem' }}>
            No alternatives found for this ingredient.
          </div>
        )}

        {/* Suggestions */}
        {!loading && alternatives.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alternatives.map((alt, i) => (
              <button
                key={i}
                onClick={() => onSelect(ingredient, alt)}
                style={{
                  textAlign: 'left', width: '100%',
                  padding: '0.75rem 0.875rem', borderRadius: '10px',
                  background: 'var(--bg-page)', border: '1.5px solid var(--border)',
                  cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(61,138,62,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-page)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: alt.note ? 3 : 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.9375rem', textTransform: 'capitalize' }}>
                    {alt.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Use this →
                  </span>
                </div>
                {alt.note && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.4 }}>
                    {alt.note}
                  </div>
                )}
                {alt.nutrition_per_100g && (
                  <NutritionDelta nutrition={alt.nutrition_per_100g} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Restore original */}
        {ingredient._isSwapped && (
          <button
            onClick={() => onSelect(ingredient, null)}
            style={{
              marginTop: '1rem', width: '100%', padding: '0.75rem',
              borderRadius: '10px', border: '1.5px dashed var(--border)',
              background: 'transparent', cursor: 'pointer',
              fontSize: '0.875rem', color: 'var(--text-3)',
            }}
          >
            ↩ Restore original: <strong style={{ color: 'var(--text-1)' }}>{ingredient._originalName}</strong>
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}

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

// ── SidebarNutrition (sidebar-friendly, no accordion) ─────────────────────────
function SidebarNutrition({ nutrition, memberMultiplier, memberGoal }) {
  const [showAll, setShowAll] = useState(false)

  if (!nutrition?.perServing) {
    return (
      <div className="rd-card" style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.875rem', padding: '1.5rem 1rem' }}>
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
  const keyFields = NUTRITION_FIELDS.filter(f => keyKeys.includes(f.key) && ps[f.key] != null)
  const allFields = NUTRITION_FIELDS.filter(f => f.rda && f.key !== 'energy_kj' && ps[f.key] != null)

  return (
    <div className="rd-card">
      <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Nutrition Information
      </div>

      {/* Key nutrients with RDA bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showAll ? 12 : 0 }}>
        {keyFields.map(f => {
          const val = ps[f.key]
          const pct = f.rda ? Math.min(100, (val / f.rda) * 100) : null
          const barColor = pct == null ? '#9ca3af'
            : pct >= 80 ? '#10B981'
            : pct >= 50 ? '#f59e0b'
            : '#9ca3af'
          return (
            <div key={f.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: 'var(--text-3, #666)' }}>{f.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-1, #111)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {val < 1 && val > 0 ? val.toFixed(2) : Math.round(val * 10) / 10}{' '}{f.unit}
                  {f.rda && (
                    <span style={{ color: '#bbb', fontWeight: 400, fontSize: 11 }}>
                      {' '}· {Math.round((val / f.rda) * 100)}%
                    </span>
                  )}
                </span>
              </div>
              {pct != null && (
                <div className="rd-rda-bg">
                  <div className="rd-rda-fill" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Expand to show all nutrients */}
      <button
        onClick={() => setShowAll(v => !v)}
        style={{
          width: '100%', padding: '0.5rem 0', marginTop: 4,
          background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
          fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)',
        }}
      >
        {showAll ? '▲ Show less' : `▼ All ${NUTRITION_FIELDS.filter(f => f.rda && ps[f.key] != null).length} nutrients`}
      </button>

      {showAll && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {allFields.map(f => {
            const val = ps[f.key]
            if (val == null) return null
            const pct = f.rda ? Math.min(100, (val / f.rda) * 100) : null
            const barColor = pct == null ? '#9ca3af'
              : pct >= 80 ? '#10B981'
              : pct >= 50 ? '#f59e0b'
              : '#9ca3af'
            return (
              <div key={f.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'baseline', gap: 4 }}>
                  <span style={{ color: 'var(--text-3, #666)' }}>{f.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-1, #111)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {val < 1 && val > 0 ? val.toFixed(2) : Math.round(val * 10) / 10}{' '}{f.unit}
                    {f.rda && (
                      <span style={{ color: '#bbb', fontWeight: 400, fontSize: 10 }}>
                        {' '}· {Math.round((val / f.rda) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                {pct != null && (
                  <div className="rd-rda-bg">
                    <div className="rd-rda-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecipeDetailClient({ recipe, members: initialMembers }) {
  const [members, setMembers] = useState(initialMembers || [])
  const [selectedMemberId, setSelectedMemberId] = useState(initialMembers?.[0]?.id || null)
  const [addingToPlan, setAddingToPlan] = useState(false)
  const [addPlanMsg, setAddPlanMsg] = useState(null) // null | 'success' | 'error'
  const [shoppingState, setShoppingState] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [checkedIngredients, setCheckedIngredients] = useState(new Set())
  const [selectedShoppingState, setSelectedShoppingState] = useState('idle')

  // Raw / cooked nutrition toggle
  const [showRawNutrition, setShowRawNutrition] = useState(false)
  const [rawNutritionData, setRawNutritionData] = useState(null)
  const [isLoadingRaw, setIsLoadingRaw] = useState(false)

  // Reset raw nutrition state when recipe changes
  useEffect(() => {
    setShowRawNutrition(false)
    setRawNutritionData(null)
  }, [recipe.id])

  // ── Ingredient alternatives ────────────────────────────────────────────────
  // swappedIngredients: Map<originalNameLower, { name, note, amount_factor }>
  const [swappedIngredients, setSwappedIngredients] = useState(new Map())
  const [showAlternativesFor, setShowAlternativesFor] = useState(null) // ingredient object
  const [alternatives, setAlternatives] = useState([])
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedRecipe, setEditedRecipe] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [saveEditError, setSaveEditError] = useState(null)

  // Check ownership client-side.
  // Always fetch profile_id with the authenticated client — the ISR page uses
  // an anon client which may return a stale or masked profile_id.
  useEffect(() => {
    if (!recipe.id) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const { data } = await supabase
        .from('recipes')
        .select('profile_id')
        .eq('id', recipe.id)
        .maybeSingle()
      setIsOwner(data?.profile_id === user.id)
    })
  }, [recipe.id])

  // Load family members client-side — keeps the server route static (ISR-cacheable)
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: memberships } = await supabase
        .from('family_memberships')
        .select('family_id')
        .eq('profile_id', user.id)
        .limit(1)

      let loaded = []
      if (memberships?.length) {
        const familyId = memberships[0].family_id
        const [{ data: linked }, { data: managed }] = await Promise.all([
          supabase
            .from('family_memberships')
            .select('profile_id, profiles(id, full_name, display_name, first_name, weight, height, age, gender, goals)')
            .eq('family_id', familyId),
          supabase
            .from('managed_members')
            .select('id, name, date_of_birth, weight, height, age, gender, goals')
            .eq('family_id', familyId),
        ])
        loaded = [
          ...(linked || []).map(l => ({ ...l.profiles, type: 'linked' })),
          ...(managed || []).map(m => ({ ...m, display_name: m.name, type: 'managed' })),
        ].filter(Boolean)
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, display_name, first_name, weight, height, age, gender, goals')
          .eq('id', user.id)
          .maybeSingle()
        if (profile) loaded = [{ ...profile, type: 'linked' }]
      }
      // Enrich each member with computed baseDailyCalories from BMR
      loaded = loaded.map(m => {
        const age = m.age || 30
        const bmr = computeBMR(m.weight, m.height, age, m.gender)
        return {
          ...m,
          age,
          gender: m.gender || 'female',
          baseDailyCalories: bmr ? Math.round(bmr * SEDENTARY_MULTIPLIER) : null,
          display_name: m.display_name || m.first_name || m.name || 'Member',
        }
      })
      if (loaded.length) {
        setMembers(loaded)
        setSelectedMemberId(loaded[0]?.id || null)
      }
    })
  }, [])

  // Load saved swaps for this recipe from Supabase
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('recipe_ingredient_swaps')
        .select('original_name, replacement_name, replacement_note, amount_factor')
        .eq('profile_id', user.id)
        .eq('recipe_id', recipe.id)
      if (data?.length) {
        const map = new Map()
        for (const row of data) {
          map.set(row.original_name, {
            name: row.replacement_name,
            note: row.replacement_note,
            amount_factor: row.amount_factor ?? 1,
          })
        }
        setSwappedIngredients(map)
      }
    })
  }, [recipe.id])

  // Fetch alternatives when an ingredient is tapped
  useEffect(() => {
    if (!showAlternativesFor) return
    setLoadingAlternatives(true)
    setAlternatives([])

    // Build query with recipe context for smarter AI suggestions
    const params = new URLSearchParams({
      ingredient: showAlternativesFor.name,
      title: recipe.title || '',
      cuisine: recipe.cuisine_type || '',
      meal: recipe.meal_type || '',
      food: recipe.food_type || '',
    })
    const otherIngredients = (recipe.steps || [])
      .flatMap(s => (s.ingredients || []).map(i => i.name))
      .filter(n => n.toLowerCase() !== showAlternativesFor.name?.toLowerCase())
    if (otherIngredients.length) {
      params.set('others', otherIngredients.join(','))
    }

    fetch(`/api/ingredient-alternatives?${params}`)
      .then(r => r.json())
      .then(data => setAlternatives(data.alternatives || []))
      .catch(() => setAlternatives([]))
      .finally(() => setLoadingAlternatives(false))
  }, [showAlternativesFor?.name, recipe.id])

  const handleSelectAlternative = useCallback(async (ingredient, alt) => {
    const key = ingredient._originalName?.toLowerCase() || ingredient.name?.toLowerCase()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (alt === null) {
      // Restore original
      setSwappedIngredients(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      if (user) {
        await supabase
          .from('recipe_ingredient_swaps')
          .delete()
          .eq('profile_id', user.id)
          .eq('recipe_id', recipe.id)
          .eq('original_name', key)
      }
    } else {
      setSwappedIngredients(prev => new Map(prev).set(key, alt))
      if (user) {
        await supabase
          .from('recipe_ingredient_swaps')
          .upsert({
            profile_id: user.id,
            recipe_id: recipe.id,
            original_name: key,
            replacement_name: alt.name,
            replacement_note: alt.note,
            amount_factor: alt.amount_factor ?? 1,
          }, { onConflict: 'profile_id,recipe_id,original_name' })
      }
    }
    setShowAlternativesFor(null)
  }, [recipe.id])

  const selectedMember = members.find(m => m.id === selectedMemberId) || null

  // BMI fraction for portion scaling (1.0 = base serving)
  const memberMultiplier = selectedMember && members.length > 0
    ? getMemberBMIFraction(selectedMember, members) * members.length
    : 1

  const memberGoal = selectedMember?.goals?.[0] || 'default'
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const mealStyle = MEAL_COLORS[recipe.meal_type] || { bg: '#f3f4f6', color: '#374151' }

  async function handleAddToPlan() {
    const supabase = createClient()
    if (!supabase) return
    setAddingToPlan(true)
    setAddPlanMsg(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAddPlanMsg('error'); setAddingToPlan(false); return }

      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const mealType = recipe.meal_type || 'dinner'
      const recipeTotals = recipe.nutrition?.totals || null

      let rows
      if (members.length > 0) {
        rows = members.map(member => ({
          profile_id: user.id,
          date_str: dateStr,
          meal_type: mealType,
          recipe_id: recipe.id,
          member_id: member.id,
          personal_nutrition: computeMemberNutrition(member, members, recipeTotals, {}),
        }))
      } else {
        rows = [{
          profile_id: user.id,
          date_str: dateStr,
          meal_type: mealType,
          recipe_id: recipe.id,
          member_id: null,
          personal_nutrition: recipe.nutrition?.perServing || null,
        }]
      }

      await supabase.from('calendar_entries').upsert(rows, {
        onConflict: 'profile_id,date_str,meal_type,recipe_id,member_id',
      })

      setAddPlanMsg('success')
    } catch {
      setAddPlanMsg('error')
    } finally {
      setAddingToPlan(false)
    }
  }

  function startEditing() {
    setEditedRecipe(JSON.parse(JSON.stringify(recipe)))
    setSaveEditError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setEditedRecipe(null)
    setIsEditing(false)
    setSaveEditError(null)
  }

  function setEditField(field, value) {
    setEditedRecipe(prev => ({ ...prev, [field]: value }))
  }

  function setEditIngredient(stepIdx, ingIdx, field, value) {
    setEditedRecipe(prev => ({
      ...prev,
      steps: prev.steps.map((s, si) => si !== stepIdx ? s : {
        ...s,
        ingredients: s.ingredients.map((ing, ii) => ii !== ingIdx ? ing : { ...ing, [field]: value }),
      }),
    }))
  }

  function setEditStepInstruction(stepIdx, value) {
    setEditedRecipe(prev => ({
      ...prev,
      steps: prev.steps.map((s, si) => si !== stepIdx ? s : { ...s, instruction: value }),
    }))
  }

  async function saveEditing() {
    setIsSavingEdit(true)
    setSaveEditError(null)
    try {
      const res = await fetch('/api/recipe/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: recipe.id,
          title: editedRecipe.title,
          description: editedRecipe.description,
          meal_type: editedRecipe.meal_type,
          servings: editedRecipe.base_servings,
          prep_time_minutes: editedRecipe.prep_time,
          cook_time_minutes: editedRecipe.cook_time,
          steps: editedRecipe.steps,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSaveEditError(err.error || 'Failed to save')
        return
      }
      // Update the in-memory recipe so the page reflects changes without reload
      Object.assign(recipe, editedRecipe)
      setIsEditing(false)
      setEditedRecipe(null)
    } catch {
      setSaveEditError('Network error — please try again')
    } finally {
      setIsSavingEdit(false)
    }
  }

  function toggleIngredient(name) {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function addSelectedToShoppingList() {
    if (selectedShoppingState === 'loading') return
    const seen = new Set()
    const selected = []
    for (const step of (recipe.steps || [])) {
      for (const ing of (step.ingredients || [])) {
        const key = ing.name?.toLowerCase()
        if (!key || !checkedIngredients.has(key) || seen.has(key)) continue
        seen.add(key)
        selected.push({
          ingredient_name: ing.name,
          amount: ing.amount || null,
          unit: ing.unit || null,
        })
      }
    }
    if (!selected.length) return
    setSelectedShoppingState('loading')
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id, ingredients: selected }),
      })
      if (!res.ok) throw new Error('failed')
      setSelectedShoppingState('success')
      setTimeout(() => setSelectedShoppingState('idle'), 3000)
    } catch {
      setSelectedShoppingState('error')
      setTimeout(() => setSelectedShoppingState('idle'), 3000)
    }
  }

  function scaleAmount(amount) {
    if (!amount) return null
    const scaled = amount * memberMultiplier
    return scaled < 1 ? Math.round(scaled * 100) / 100 : Math.round(scaled * 10) / 10
  }

  // ── Raw / cooked nutrition toggle handler ────────────────────────────────────
  function handleToggleRawCooked(forceRefresh = false) {
    // Toggle off — synchronous, no fetch needed
    if (showRawNutrition && !forceRefresh) {
      setShowRawNutrition(false)
      return
    }

    // Toggle on — needs async fetch
    fetchRawNutrition(forceRefresh)
  }

  async function fetchRawNutrition(forceRefresh) {
    const { batchGetRawAndCooked, toGrams } = await import('@/lib/recipe/ingredientDatabase');

    if (forceRefresh || !rawNutritionData) {
      setIsLoadingRaw(true)
      if (forceRefresh) setShowRawNutrition(false)

      const allIngs = (recipe.steps || []).flatMap(step =>
        (step.ingredients || []).map(ing => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          cookingMethod: step.cooking_method || 'raw',
        }))
      )

      // Batch lookup — full cascade: DB → USDA → Haiku
      const rawResults = await batchGetRawAndCooked(allIngs)

      // Sum totals using raw per-100g nutrition
      const rawTotals = {}
      let missingCount = 0
      for (const item of rawResults) {
        const nutrition = item.rawNutrition
        if (!nutrition) { missingCount++; continue }
        const grams = toGrams(item.amount, item.unit, item.name)
        for (const [key, val] of Object.entries(nutrition)) {
          if (typeof val === 'number') rawTotals[key] = (rawTotals[key] || 0) + (val * grams / 100)
        }
      }

      const servings = recipe.base_servings || 1
      const rawPerServing = {}
      for (const [key, val] of Object.entries(rawTotals)) rawPerServing[key] = val / servings

      const totalCount = rawResults.length
      const foundCount = totalCount - missingCount
      const coveragePct = totalCount > 0 ? foundCount / totalCount : 0
      const allMissing = Object.keys(rawTotals).length === 0
      const tooIncomplete = coveragePct < 0.6

      setRawNutritionData({ totals: rawTotals, perServing: rawPerServing, missingCount, totalCount, allMissing, tooIncomplete })
      setIsLoadingRaw(false)

      // Not enough coverage — stay on Prepared
      if (allMissing || tooIncomplete) return
      setShowRawNutrition(true)
      return
    }

    // Using cached result — check coverage, then show
    if (rawNutritionData?.allMissing || rawNutritionData?.tooIncomplete) return
    setShowRawNutrition(true)
  }

  // Compute active nutrition (cooked vs raw)
  const activeNutrition = showRawNutrition && rawNutritionData
    ? rawNutritionData
    : recipe.nutrition

  return (
    <>
      <style>{`
        .rd-grid {
          display: grid;
          grid-template-columns: minmax(320px, 1fr) minmax(280px, 380px);
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 780px) {
          .rd-grid { grid-template-columns: 1fr; }
          .rd-right { order: 2; }
          .rd-left  { order: 1; }
        }
        .rd-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border-light, #e5e7eb);
          border-radius: 14px;
          padding: 1.125rem 1.25rem;
          margin-bottom: 0.75rem;
        }
        .rd-rda-bg {
          height: 5px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          flex: 1;
          margin-top: 2px;
        }
        .rd-rda-fill {
          height: 100%;
          border-radius: 3px;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>
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
      {isEditing ? (
        <input
          value={editedRecipe.title}
          onChange={e => setEditField('title', e.target.value)}
          style={{
            fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)',
            marginBottom: '0.625rem', lineHeight: 1.3, width: '100%',
            border: '2px solid var(--primary)', borderRadius: '8px',
            padding: '0.25rem 0.5rem', background: 'var(--bg-card)',
          }}
        />
      ) : (
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.625rem', lineHeight: 1.3 }}>
          {recipe.title}
        </h1>
      )}
      {isEditing ? (
        <textarea
          value={editedRecipe.description || ''}
          onChange={e => setEditField('description', e.target.value)}
          rows={3}
          placeholder="Description (optional)"
          style={{
            width: '100%', color: 'var(--text-3)', fontSize: '0.9375rem',
            lineHeight: 1.6, marginBottom: '1rem', border: '1.5px solid var(--border)',
            borderRadius: '8px', padding: '0.4rem 0.5rem',
            background: 'var(--bg-card)', resize: 'vertical',
          }}
        />
      ) : recipe.description ? (
        <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          {recipe.description}
        </p>
      ) : null}

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

      {/* Edit meta fields row — only shown in edit mode */}
      {isEditing && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.875rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>
            Meal type
            <select
              value={editedRecipe.meal_type || ''}
              onChange={e => setEditField('meal_type', e.target.value)}
              style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg-page)', fontSize: '0.875rem' }}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
              <option value="snack2">Snack 2</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>
            Servings
            <input type="number" min="1" max="20"
              value={editedRecipe.base_servings || ''}
              onChange={e => setEditField('base_servings', e.target.value)}
              style={{ width: 64, padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg-page)', fontSize: '0.875rem' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>
            Prep (min)
            <input type="number" min="0"
              value={editedRecipe.prep_time || ''}
              onChange={e => setEditField('prep_time', e.target.value)}
              style={{ width: 72, padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg-page)', fontSize: '0.875rem' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600 }}>
            Cook (min)
            <input type="number" min="0"
              value={editedRecipe.cook_time || ''}
              onChange={e => setEditField('cook_time', e.target.value)}
              style={{ width: 72, padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', background: 'var(--bg-page)', fontSize: '0.875rem' }}
            />
          </label>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {isOwner && !isEditing && (
          <button
            onClick={startEditing}
            style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer' }}
          >
            ✏️ Edit Recipe
          </button>
        )}
        {isEditing && (
          <>
            <button
              onClick={saveEditing}
              disabled={isSavingEdit}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.9375rem', cursor: isSavingEdit ? 'wait' : 'pointer', opacity: isSavingEdit ? 0.7 : 1 }}
            >
              {isSavingEdit ? '⏳ Saving…' : '✅ Save Changes'}
            </button>
            <button
              onClick={cancelEditing}
              disabled={isSavingEdit}
              style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            {saveEditError && (
              <span style={{ alignSelf: 'center', color: '#ef4444', fontSize: '0.875rem' }}>{saveEditError}</span>
            )}
          </>
        )}
        {!isEditing && (<>
          <button
            onClick={handleAddToPlan}
            disabled={addingToPlan}
            style={{ padding: '0.625rem 1.25rem', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.9375rem', cursor: addingToPlan ? 'wait' : 'pointer', opacity: addingToPlan ? 0.7 : 1 }}
          >
            {addingToPlan ? '⏳ Adding…' : '📅 Add to Plan'}
          </button>
          <button
            onClick={async () => {
              if (shoppingState === 'loading') return
              setShoppingState('loading')
              try {
                let body
                if (checkedIngredients.size > 0) {
                  const seen = new Set()
                  const selected = []
                  for (const step of (recipe.steps || [])) {
                    for (const ing of (step.ingredients || [])) {
                      const key = ing.name?.toLowerCase()
                      if (!key || !checkedIngredients.has(key) || seen.has(key)) continue
                      seen.add(key)
                      selected.push({
                        ingredient_name: ing.name,
                        amount: ing.amount || null,
                        unit: ing.unit || null,
                      })
                    }
                  }
                  body = JSON.stringify({ recipe_id: recipe.id, ingredients: selected })
                } else {
                  body = JSON.stringify({ recipe_id: recipe.id })
                }
                const res = await fetch('/api/shopping-list', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body,
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
        </>)}
      </div>

      {addPlanMsg === 'success' && (
        <div style={{ padding: '0.75rem 1rem', background: '#d1fae5', borderRadius: '10px', color: '#065f46', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
          ✅ Recipe added to today&apos;s plan! <Link href="/plan" style={{ color: '#065f46', textDecoration: 'underline', fontWeight: 700 }}>View Planner</Link>
        </div>
      )}
      {addPlanMsg === 'error' && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: '10px', color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
          ❌ Could not add to plan. Please try again.
        </div>
      )}

      <div className="rd-grid">
        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="rd-left">

          {/* Intro */}
          {recipe.intro && (
            <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
              {recipe.intro}
            </p>
          )}

          {/* Steps — each step shows its own ingredients inline with checkboxes */}
          <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            {isEditing ? '✏️ Edit Steps' : 'Instructions'}
          </h2>
          {!isEditing && checkedIngredients.size > 0 && (
            <button
              onClick={addSelectedToShoppingList}
              style={{
                padding: '0.4rem 0.875rem', borderRadius: '8px',
                background: selectedShoppingState === 'success' ? 'rgba(61,138,62,0.1)' : 'var(--primary)',
                border: selectedShoppingState === 'error' ? '2px solid #ef4444' : 'none',
                color: selectedShoppingState === 'success' ? 'var(--primary)' : selectedShoppingState === 'error' ? '#ef4444' : '#fff',
                fontWeight: 600, fontSize: '0.8125rem',
                cursor: selectedShoppingState === 'loading' ? 'wait' : 'pointer',
                opacity: selectedShoppingState === 'loading' ? 0.7 : 1,
              }}
            >
              {selectedShoppingState === 'loading' ? '⏳ Adding…' : selectedShoppingState === 'success' ? '✅ Added!' : selectedShoppingState === 'error' ? '❌ Failed' : `🛒 Add ${checkedIngredients.size} to list`}
            </button>
          )}
        </div>
        {(isEditing ? editedRecipe.steps : recipe.steps || []).map((step, i) => {
          const isside = step.component === 'side'
          const stepIngredients = step.ingredients || []

          // ── Edit mode view for a step ──────────────────────────────────────
          if (isEditing) {
            return (
              <div key={i} style={{ marginBottom: '1.25rem', padding: '0.875rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)' }}>{step.title || `Step ${i + 1}`}</span>
                </div>

                {/* Editable ingredients */}
                {stepIngredients.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ingredients</p>
                    {stepIngredients.map((ing, j) => (
                      <div key={j} style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem', alignItems: 'center' }}>
                        <input
                          type="number" min="0" step="0.01"
                          value={ing.amount || ''}
                          onChange={e => setEditIngredient(i, j, 'amount', e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="amt"
                          style={{ width: 60, padding: '0.25rem 0.375rem', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-page)' }}
                        />
                        <input
                          type="text"
                          value={ing.unit || ''}
                          onChange={e => setEditIngredient(i, j, 'unit', e.target.value)}
                          placeholder="unit"
                          style={{ width: 56, padding: '0.25rem 0.375rem', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-page)' }}
                        />
                        <input
                          type="text"
                          value={ing.name || ''}
                          onChange={e => setEditIngredient(i, j, 'name', e.target.value)}
                          placeholder="ingredient name"
                          style={{ flex: 1, padding: '0.25rem 0.375rem', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.8125rem', background: 'var(--bg-page)' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Editable instruction */}
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Instruction</p>
                  <textarea
                    value={step.instruction || ''}
                    onChange={e => setEditStepInstruction(i, e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '0.375rem 0.5rem', borderRadius: '6px', border: '1.5px solid var(--border)', fontSize: '0.875rem', lineHeight: 1.5, background: 'var(--bg-page)', resize: 'vertical' }}
                  />
                </div>
              </div>
            )
          }

          // ── Normal read view ───────────────────────────────────────────────
          return (
            <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isside ? '#e0e7ff' : 'var(--primary)',
                color: isside ? '#4338ca' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, marginTop: '0.125rem',
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                  {step.title && <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{step.title}</h3>}
                  {step.time_marker && <span style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>⏱ {step.time_marker}</span>}
                  {step.component && (
                    <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: isside ? '#e0e7ff' : '#d1fae5', color: isside ? '#4338ca' : '#065f46', textTransform: 'capitalize' }}>
                      {recipe[`${step.component}_component`] || step.component}
                    </span>
                  )}
                </div>

                {/* Ingredients for this step — with checkboxes + swap */}
                {stepIngredients.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.625rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {stepIngredients.map((ing, j) => {
                      const originalKey = ing.name?.toLowerCase()
                      const swap = swappedIngredients.get(originalKey)
                      const displayName = swap ? swap.name : ing.name
                      const displayAmount = swap
                        ? scaleAmount((ing.amount || 1) * (swap.amount_factor ?? 1))
                        : scaleAmount(ing.amount)
                      const checkKey = originalKey
                      const checked = checkedIngredients.has(checkKey)
                      const isSwapped = !!swap

                      return (
                        <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {/* Main pill */}
                          <button
                            onClick={() => toggleIngredient(checkKey)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.4rem',
                              fontSize: '0.8125rem',
                              background: checked ? 'var(--primary)' : isSwapped ? 'rgba(var(--primary-rgb, 61,138,62),0.08)' : 'var(--bg-card)',
                              border: `1px solid ${checked ? 'var(--primary)' : isSwapped ? 'var(--primary)' : 'var(--border)'}`,
                              borderRadius: isSwapped ? '20px 0 0 20px' : '20px',
                              padding: '0.2rem 0.65rem 0.2rem 0.45rem',
                              color: checked ? '#fff' : isSwapped ? 'var(--primary)' : 'var(--text-2)',
                              cursor: 'pointer',
                              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                              userSelect: 'none',
                            }}
                          >
                            <span style={{
                              width: 14, height: 14, borderRadius: '3px', flexShrink: 0,
                              border: `1.5px solid ${checked ? '#fff' : 'var(--border)'}`,
                              background: checked ? '#fff' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {checked && <span style={{ color: 'var(--primary)', fontSize: '0.625rem', lineHeight: 1, fontWeight: 700 }}>✓</span>}
                            </span>
                            {displayAmount ? <strong style={{ color: checked ? '#fff' : isSwapped ? 'var(--primary)' : 'var(--text-1)' }}>{displayAmount}{ing.unit ? ` ${ing.unit}` : ''} </strong> : ''}
                            <span style={{ textDecoration: isSwapped && !checked ? 'none' : 'none', textTransform: 'capitalize' }}>{displayName}</span>
                            {isSwapped && !checked && <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>✦</span>}
                          </button>

                          {/* Swap button */}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setShowAlternativesFor(
                                isSwapped
                                  ? { name: displayName, _isSwapped: true, _originalName: originalKey }
                                  : ing
                              )
                            }}
                            title={isSwapped ? `Swapped from ${ing.name} — tap to change` : 'Find alternatives'}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 22, height: 22,
                              borderRadius: isSwapped ? '0 20px 20px 0' : '50%',
                              border: `1px solid ${isSwapped ? 'var(--primary)' : 'var(--border)'}`,
                              borderLeft: isSwapped ? 'none' : undefined,
                              background: isSwapped ? 'var(--primary)' : 'var(--bg-card)',
                              color: isSwapped ? '#fff' : 'var(--text-4)',
                              cursor: 'pointer', fontSize: '0.625rem',
                              padding: 0, flexShrink: 0,
                              transition: 'background 0.15s',
                            }}
                          >
                            ⇄
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 0.375rem' }}>{step.instruction}</p>
                {step.tip && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-4)', fontStyle: 'italic', margin: 0 }}>
                    💡 {step.tip}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        {recipe.plating_note && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.875rem 1rem', fontSize: '0.9375rem', color: 'var(--text-2)', fontStyle: 'italic' }}>
            🍽️ {recipe.plating_note}
          </div>
        )}
      </section>

        </div>{/* end rd-left */}

        {/* ── RIGHT COLUMN (sidebar) ──────────────────────────────────── */}
        <div className="rd-right">

          {/* Member selector */}
          {members.length > 0 && (
            <div className="rd-card">
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.5rem' }}>Portions for</h3>
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

          {/* Prep / Cook time */}
          {(recipe.prep_time > 0 || recipe.cook_time > 0) && (
            <div className="rd-card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {recipe.prep_time > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Prep Time</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1, #111)' }}>
                      {recipe.prep_time}<span style={{ fontSize: 13, fontWeight: 500 }}> Min</span>
                    </div>
                  </div>
                )}
                {recipe.cook_time > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Cook Time</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1, #111)' }}>
                      {recipe.cook_time}<span style={{ fontSize: 13, fontWeight: 500 }}> Min</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Donut chart + Glycemic Load */}
          {activeNutrition?.perServing && (() => {
            const ps = {}
            const base = activeNutrition.perServing
            const scale = memberMultiplier || 1
            for (const [k, v] of Object.entries(base)) {
              ps[k] = typeof v === 'number' ? v * scale : v
            }
            return (
            <div className="rd-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                {showRawNutrition ? 'Raw Ingredients' : 'Per Serving'}
              </div>
              <DonutChart ps={ps} />
              {recipe.glycemic_load && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, color: '#999' }}>Glycemic Load</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
                    {GL_LABELS[recipe.glycemic_load] || recipe.glycemic_load}
                  </div>
                </div>
              )}
            </div>
            )
          })()}

          {/* Raw / Cooked nutrition toggle */}
          {recipe.nutrition?.perServing && (
            <div className="rd-card">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '4px 0',
              }}>
                <span style={{
                  fontSize: 13, fontWeight: showRawNutrition ? 400 : 700,
                  color: showRawNutrition ? '#9ca3af' : 'var(--primary)',
                  transition: 'color 0.2s',
                }}>
                  Prepared
                </span>
                <button
                  onClick={() => handleToggleRawCooked()}
                  disabled={isLoadingRaw}
                  style={{
                    width: 44, height: 24, borderRadius: 12, padding: 2,
                    backgroundColor: showRawNutrition ? 'var(--primary)' : '#d1d5db',
                    border: 'none', cursor: isLoadingRaw ? 'default' : 'pointer',
                    position: 'relative', transition: 'background-color 0.2s',
                    flexShrink: 0,
                  }}
                  aria-label="Toggle raw nutrition"
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
                    transform: showRawNutrition ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }} />
                </button>
                <span style={{
                  fontSize: 13, fontWeight: showRawNutrition ? 700 : 400,
                  color: showRawNutrition ? 'var(--primary)' : '#9ca3af',
                  transition: 'color 0.2s',
                }}>
                  Raw ingredients
                </span>
                {isLoadingRaw && (
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid #d1d5db', borderTopColor: 'var(--primary)',
                    animation: 'spin 0.8s linear infinite',
                    marginLeft: 4,
                  }} />
                )}
              </div>

              {/* Coverage warning */}
              {rawNutritionData && (rawNutritionData.allMissing || rawNutritionData.tooIncomplete) && (
                <div style={{
                  marginTop: 8, padding: '6px 10px',
                  background: '#fffbeb', borderRadius: 8,
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 12, color: '#92400e' }}>
                    {rawNutritionData.missingCount}/{rawNutritionData.totalCount} ingredients not found
                  </span>
                  <button
                    onClick={() => handleToggleRawCooked(true)}
                    disabled={isLoadingRaw}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                      background: isLoadingRaw ? 'var(--bg-subtle)' : 'var(--primary)',
                      color: isLoadingRaw ? 'var(--text-4)' : '#fff',
                      border: 'none', cursor: isLoadingRaw ? 'default' : 'pointer',
                      opacity: isLoadingRaw ? 0.5 : 1,
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Partial coverage note */}
              {showRawNutrition && rawNutritionData && !rawNutritionData.allMissing && !rawNutritionData.tooIncomplete && rawNutritionData.missingCount > 0 && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                  ({rawNutritionData.missingCount} ingredient{rawNutritionData.missingCount !== 1 ? 's' : ''} unavailable)
                </div>
              )}
            </div>
          )}

          {/* Sidebar nutrition with RDA bars */}
          <SidebarNutrition
            nutrition={activeNutrition}
            memberMultiplier={memberMultiplier}
            memberGoal={memberGoal}
          />

        </div>{/* end rd-right */}
      </div>{/* end rd-grid */}

      {/* Ingredient alternatives sheet */}
      <IngredientAlternativesSheet
        ingredient={showAlternativesFor}
        alternatives={alternatives}
        loading={loadingAlternatives}
        onSelect={handleSelectAlternative}
        onClose={() => setShowAlternativesFor(null)}
      />
    </div>
    </>
  )
}
