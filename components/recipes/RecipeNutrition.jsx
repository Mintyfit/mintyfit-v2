'use client'

import { useState } from 'react'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'

/**
 * Recipe nutrition sub-components — extracted from RecipeDetailClient.jsx
 * (NutritionDelta, IngredientAlternativesSheet, DonutChart, NutritionSection,
 * SidebarNutrition + their pure helpers estimateGI/estimateGL/getKeyNutrients/getNutrientColor).
 */
// ── NutritionDelta (small inline nutrition preview per alternative) ──────────
export function NutritionDelta({ nutrition }) {
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
          <span key={key} style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 600 }}>
            {label}: {Math.round(val)}{unit}
          </span>
        )
      })}
    </div>
  )
}

// ── IngredientAlternativesSheet ───────────────────────────────────────────────
export function IngredientAlternativesSheet({ ingredient, alternatives, loading, onSelect, onClose }) {
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
// Glycemic Index estimates per category (0–100 scale, food vs glucose).
// Used when the recipe stores only a low/medium/high category and we need a number.
const GI_BY_LABEL = { low: 35, medium: 55, high: 75 }
// Estimate Glycemic Load = GI × carbs(g) / 100 — scales with the displayed portion.
function estimateGI(recipe) {
  if (typeof recipe.glycemic_index === 'number') return Math.round(recipe.glycemic_index)
  return GI_BY_LABEL[recipe.glycemic_load] ?? null
}
function estimateGL(recipe, carbsGrams) {
  if (typeof recipe.glycemic_load_value === 'number') return Math.round(recipe.glycemic_load_value)
  const gi = estimateGI(recipe)
  if (gi == null || !carbsGrams) return null
  return Math.round((gi * carbsGrams) / 100)
}
export const MEAL_COLORS = {
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
export function DonutChart({ ps }) {
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
export function NutritionSection({ nutrition, memberMultiplier, memberGoal }) {
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
export function SidebarNutrition({ nutrition, memberMultiplier, memberGoal, memberDailyNeeds }) {
  const [showAll, setShowAll] = useState(false)

  if (!nutrition?.perServing) {
    return (
      <div className="rd-card" style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.875rem', padding: '1.5rem 1rem' }}>
        Nutrition data not available
      </div>
    )
  }

  // Scale per-serving data by member multiplier (calorie-need based)
  const ps = {}
  for (const [k, v] of Object.entries(nutrition.perServing)) {
    ps[k] = typeof v === 'number' ? v * (memberMultiplier || 1) : v
  }

  // Use personal daily needs for RDA denominator when available
  function getRda(f) {
    return (memberDailyNeeds && memberDailyNeeds[f.key] != null)
      ? memberDailyNeeds[f.key]
      : f.rda
  }

  const keyKeys = getKeyNutrients(memberGoal)
  const keyFields = NUTRITION_FIELDS.filter(f => keyKeys.includes(f.key) && ps[f.key] != null)
  const allFields = NUTRITION_FIELDS.filter(f => getRda(f) && f.key !== 'energy_kj' && ps[f.key] != null)

  return (
    <div className="rd-card">
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {memberDailyNeeds ? 'Your portion & % of daily needs' : 'Nutrition Information'}
      </div>

      {/* Key nutrients with personal RDA bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showAll ? 12 : 0 }}>
        {keyFields.map(f => {
          const val = ps[f.key]
          const rda = getRda(f)
          const pct = rda ? Math.min(100, (val / rda) * 100) : null
          const barColor = pct == null ? '#9ca3af'
            : pct >= 80 ? '#10B981'
            : pct >= 50 ? '#f59e0b'
            : '#9ca3af'
          return (
            <div key={f.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: 'var(--text-3, #666)' }}>{f.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-1, #111)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {val < 1 && val > 0 ? val.toFixed(2) : Math.round(val * 10) / 10}{' '}{f.unit}
                  {rda && (
                    <span style={{ color: '#bbb', fontWeight: 400, fontSize: '0.6875rem' }}>
                      {' '}· {Math.round((val / rda) * 100)}%
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
        {showAll ? '▲ Show less' : `▼ All ${allFields.length} nutrients`}
      </button>

      {showAll && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {allFields.map(f => {
            const val = ps[f.key]
            if (val == null) return null
            const rda = getRda(f)
            const pct = rda ? Math.min(100, (val / rda) * 100) : null
            const barColor = pct == null ? '#9ca3af'
              : pct >= 80 ? '#10B981'
              : pct >= 50 ? '#f59e0b'
              : '#9ca3af'
            return (
              <div key={f.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ color: 'var(--text-3, #666)' }}>{f.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-1, #111)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {val < 1 && val > 0 ? val.toFixed(2) : Math.round(val * 10) / 10}{' '}{f.unit}
                    {rda && (
                      <span style={{ color: '#bbb', fontWeight: 400, fontSize: '0.625rem' }}>
                        {' '}· {Math.round((val / rda) * 100)}%
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

