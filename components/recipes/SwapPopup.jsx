'use client'

import { useState, useEffect, useRef } from 'react'
import { getSwapSuggestions } from '@/lib/recipe/ingredientSwap'
import { lookupIngredientByName } from '@/lib/recipe/ingredientDatabase'

// ── Nutrition delta badge shown under each suggestion ─────────────────────────
function NutritionDelta({ original, replacement, amount }) {
  if (!original || !replacement) return null

  const scale = (n) => {
    if (!n) return {}
    const factor = (parseFloat(amount) || 100) / 100
    return {
      energy_kcal: (n.energy_kcal || 0) * factor,
      protein:     (n.protein     || 0) * factor,
      carbs_total: (n.carbs_total || 0) * factor,
      fat_total:   (n.fat_total   || 0) * factor,
    }
  }

  const orig = scale(original)
  const repl = scale(replacement)

  const fields = [
    { key: 'energy_kcal', label: 'kcal', lowerBetter: true  },
    { key: 'protein',     label: 'prot', lowerBetter: false },
    { key: 'carbs_total', label: 'carbs', lowerBetter: true  },
    { key: 'fat_total',   label: 'fat',  lowerBetter: true  },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
      {fields.map(({ key, label, lowerBetter }) => {
        const delta = (repl[key] || 0) - (orig[key] || 0)
        if (Math.abs(delta) < 0.5) return null
        const positive = lowerBetter ? delta < 0 : delta > 0
        const color = positive ? '#2d6e2e' : '#c0392b'
        return (
          <span key={key} style={{ fontSize: 11, color, fontWeight: 600 }}>
            {label}: {delta > 0 ? '+' : ''}{Math.round(delta)}
          </span>
        )
      })}
    </div>
  )
}

// ── SwapPopup ─────────────────────────────────────────────────────────────────
/**
 * Props:
 *   ingredient    { name, amount, unit }
 *   recipeContext { title, cuisine_type, meal_type, food_type, otherIngredients[] }
 *   onSwap(newIngredient)
 *   onClose()
 */
export default function SwapPopup({ ingredient, recipeContext, onSwap, onClose }) {
  const [phase, setPhase] = useState('loading') // loading | ready | error
  const [suggestions, setSuggestions] = useState([])
  const [origNutrition, setOrigNutrition] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const overlayRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getSwapSuggestions(ingredient, recipeContext),
      lookupIngredientByName(ingredient.name)
        .then(row => row?.nutrition_per_100g ?? null)
        .catch(() => null),
    ])
      .then(([results, origN]) => {
        if (!cancelled) {
          setSuggestions(results)
          setOrigNutrition(origN)
          setPhase('ready')
        }
      })
      .catch(err => {
        if (!cancelled) {
          setErrMsg(err.message || 'Failed to load suggestions')
          setPhase('error')
        }
      })

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 16,
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Swap ingredient
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>
              {ingredient.name}
            </div>
            {(ingredient.amount || ingredient.unit) && (
              <div style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 1 }}>
                {ingredient.amount} {ingredient.unit}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-3)', padding: 4, lineHeight: 1, marginTop: -2 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 14 }}>
            <div style={{
              width: 24, height: 24,
              border: '2px solid var(--primary)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'swapSpin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            Finding alternatives…
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div style={{ color: '#c0392b', fontSize: 14, padding: '12px 0', lineHeight: 1.5 }}>
            {errMsg || 'Could not load suggestions — please try again.'}
          </div>
        )}

        {/* Suggestions */}
        {phase === 'ready' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSwap(s)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)'
                  e.currentTarget.style.background = 'var(--bg-green-tint)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{s.name}</span>
                  {(s.amount || s.unit) && (
                    <span style={{ fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {s.amount} {s.unit}
                    </span>
                  )}
                </div>
                {s.reason && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>{s.reason}</div>
                )}
                {s.nutrition_per_100g && (
                  <NutritionDelta
                    original={origNutrition}
                    replacement={s.nutrition_per_100g}
                    amount={s.amount}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        <style>{`
          @keyframes swapSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
