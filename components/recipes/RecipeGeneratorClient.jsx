'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { generateRecipe } from '@/lib/recipe/recipeGenerator'
import { useVoice } from '@/hooks/useVoice'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const SUGGESTIONS = [
  'High-protein breakfast with eggs',
  'Quick vegan lunch bowl',
  'Mediterranean chicken dinner',
  'Low-carb salmon with vegetables',
  'Keto-friendly snack',
  'Family-friendly pasta alternative',
]

const NON_FOOD_KEYWORDS = [
  'car', 'code', 'write', 'essay', 'help me', 'javascript', 'python', 'how to',
  'weather', 'news', 'stock', 'movie', 'music', 'game',
]

function isFoodRelated(text) {
  const lower = text.toLowerCase().trim()
  if (lower.length < 3) return false
  for (const kw of NON_FOOD_KEYWORDS) {
    if (lower.includes(kw)) return false
  }
  return true
}

// ── DonutChart ───────────────────────────────────────────────────────────────
function DonutChart({ calories, protein, carbs, fat }) {
  const total = (protein || 0) * 4 + (carbs || 0) * 4 + (fat || 0) * 9
  if (!total) return null

  const pPct = ((protein || 0) * 4) / total
  const cPct = ((carbs || 0) * 4) / total
  const fPct = ((fat || 0) * 9) / total

  const r = 40
  const circ = 2 * Math.PI * r
  const pArc = pPct * circ
  const cArc = cPct * circ
  const fArc = fPct * circ

  const pOff = 0
  const cOff = -(pArc)
  const fOff = -(pArc + cArc)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#10b981" strokeWidth="12"
          strokeDasharray={`${pArc} ${circ}`} strokeDashoffset={pOff}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px' }} />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
          strokeDasharray={`${cArc} ${circ}`} strokeDashoffset={cOff}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px' }} />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#6366f1" strokeWidth="12"
          strokeDasharray={`${fArc} ${circ}`} strokeDashoffset={fOff}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px' }} />
        <text x="48" y="44" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text-1)">{Math.round(calories)}</text>
        <text x="48" y="58" textAnchor="middle" fontSize="9" fill="var(--text-3)">kcal</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />
          <span style={{ color: 'var(--text-2)' }}>Protein</span>
          <strong style={{ color: 'var(--text-1)', marginLeft: 'auto' }}>{Math.round(protein || 0)}g</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
          <span style={{ color: 'var(--text-2)' }}>Carbs</span>
          <strong style={{ color: 'var(--text-1)', marginLeft: 'auto' }}>{Math.round(carbs || 0)}g</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#6366f1', display: 'inline-block' }} />
          <span style={{ color: 'var(--text-2)' }}>Fat</span>
          <strong style={{ color: 'var(--text-1)', marginLeft: 'auto' }}>{Math.round(fat || 0)}g</strong>
        </span>
      </div>
    </div>
  )
}

// ── ProgressIndicator ────────────────────────────────────────────────────────
function ProgressIndicator({ step, label }) {
  const steps = [
    { id: 1, icon: '📝', label: 'Creating recipe' },
    { id: 2, icon: '🔬', label: 'Nutrition + photo' },
    { id: 3, icon: '✅', label: 'Finalizing' },
  ]
  return (
    <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>✨</div>
      <p style={{ color: 'var(--text-2)', fontWeight: 600, marginBottom: '2rem', fontSize: '1rem' }}>{label}</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {steps.map(s => {
          const done = s.id < step
          const active = s.id === step
          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              background: done ? 'rgba(16,185,129,0.1)' : active ? 'rgba(61,138,62,0.1)' : 'var(--bg-card)',
              border: `1px solid ${done ? '#10b981' : active ? 'var(--primary)' : 'var(--border)'}`,
              color: done ? '#10b981' : active ? 'var(--primary)' : 'var(--text-4)',
              fontSize: '0.875rem',
              fontWeight: active ? 600 : 400,
            }}>
              <span>{s.icon}</span>
              <span>{done ? '✓' : ''} {s.label}</span>
              {active && <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>}
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecipeGeneratorClient() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [mealType, setMealType] = useState('')
  const [step, setStep] = useState(0) // 0 = idle, 1-3 = progress
  const [progressLabel, setProgressLabel] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const promptRef = useRef(null)

  const { isListening, startListening } = useVoice({
    onTranscript: text => setPrompt(p => (p ? p + ' ' + text : text)),
  })

  function handleProgress(stepNum, label) {
    setStep(stepNum)
    setProgressLabel(label)
  }

  async function handleGenerate() {
    const trimmed = prompt.trim()
    if (!trimmed) return
    if (!isFoodRelated(trimmed)) {
      setError('Please describe a food or meal you want to cook. 🍽️')
      return
    }
    setError('')
    setResult(null)
    setStep(1)
    setProgressLabel('Building recipe…')

    const fullPrompt = mealType ? `${trimmed} (${mealType})` : trimmed

    try {
      const recipe = await generateRecipe(fullPrompt, null, handleProgress)
      setResult(recipe)
      setStep(0)
    } catch (err) {
      console.error('Generation error:', err)
      if (err.message?.startsWith('LIMIT_REACHED')) {
        setError('You have reached your recipe generation limit. Upgrade to Pro for unlimited recipes.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setStep(0)
    }
  }

  function handleRegenerate() {
    setResult(null)
    handleGenerate()
  }

  function handleDiscard() {
    setResult(null)
    setPrompt('')
    setMealType('')
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    try {
      if (result.id && !result.id.toString().includes('Date.now')) {
        // Already saved during generation
        router.push(`/recipes/${result.slug || result.id}`)
      } else {
        router.push('/recipes')
      }
    } finally {
      setSaving(false)
    }
  }

  // Nutrition keys from NUTRITION_FIELDS: energy_kcal, protein, carbs_total, fat_total
  const ps = result?.nutrition?.perServing

  // ── Progress state ────────────────────────────────────────────────────────
  if (step > 0) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        <ProgressIndicator step={step} label={progressLabel} />
      </div>
    )
  }

  // ── Preview state ─────────────────────────────────────────────────────────
  if (result) {
    const totalTime = (result.prep_time || 0) + (result.cook_time || 0)
    const visibleSteps = result.steps?.slice(0, 3) || []
    const hiddenCount = (result.steps?.length || 0) - 3

    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>
        {/* Back link */}
        <button
          onClick={handleDiscard}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          ← New recipe
        </button>

        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Image */}
          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#f3f4f6' }}>
            {result.image ? (
              <Image src={result.image} alt={result.title} fill style={{ objectFit: 'cover' }} sizes="680px" priority />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', color: 'var(--text-4)' }}>🍽️</div>
            )}
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* Title + meta */}
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
              {result.title}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              {result.description}
            </p>

            {/* Meta pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {result.meal_type && (
                <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', background: '#dbeafe', color: '#1e40af', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  {result.meal_type}
                </span>
              )}
              {result.base_servings && (
                <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                  👥 {result.base_servings} servings
                </span>
              )}
              {totalTime > 0 && (
                <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                  ⏱ {totalTime} min
                </span>
              )}
              {result.cuisine_type && (
                <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                  🌍 {result.cuisine_type}
                </span>
              )}
            </div>

            {/* Nutrition donut */}
            {ps && (
              <div style={{ background: 'var(--bg-page)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                <DonutChart
                  calories={ps.energy_kcal}
                  protein={ps.protein}
                  carbs={ps.carbs_total}
                  fat={ps.fat_total}
                />
              </div>
            )}

            {/* Ingredients summary */}
            {result.steps && result.steps.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.75rem' }}>Ingredients</h3>
                {result.main_component && (
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{result.main_component}</p>
                )}
                {result.steps
                  .filter(s => s.component === 'main')
                  .flatMap(s => s.ingredients || [])
                  .filter((ing, i, arr) => arr.findIndex(x => x.name === ing.name) === i)
                  .map((ing, i) => (
                    <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-2)', padding: '0.2rem 0', display: 'flex', gap: '0.5rem' }}>
                      <span>•</span>
                      <span>{ing.amount ? `${ing.amount} ${ing.unit} ` : ''}{ing.name}</span>
                    </div>
                  ))
                }
                {result.side_component && (
                  <>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: '0.375rem', marginTop: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{result.side_component}</p>
                    {result.steps
                      .filter(s => s.component === 'side')
                      .flatMap(s => s.ingredients || [])
                      .filter((ing, i, arr) => arr.findIndex(x => x.name === ing.name) === i)
                      .map((ing, i) => (
                        <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-2)', padding: '0.2rem 0', display: 'flex', gap: '0.5rem' }}>
                          <span>•</span>
                          <span>{ing.amount ? `${ing.amount} ${ing.unit} ` : ''}{ing.name}</span>
                        </div>
                      ))
                    }
                  </>
                )}
              </div>
            )}

            {/* First 3 steps */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.75rem' }}>Instructions</h3>
              {visibleSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: '0.125rem' }}>
                    {i + 1}
                  </div>
                  <div>
                    {s.title && <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.2rem' }}>{s.title}</p>}
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{s.instruction}</p>
                  </div>
                </div>
              ))}
              {hiddenCount > 0 && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-4)', fontStyle: 'italic' }}>+{hiddenCount} more steps (visible after saving)</p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: '1', minWidth: '120px',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--primary)', color: '#fff',
                  border: 'none', borderRadius: '10px',
                  fontWeight: 700, fontSize: '1rem', cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : '✅ Save Recipe'}
              </button>
              <button
                onClick={handleRegenerate}
                style={{
                  flex: '1', minWidth: '120px',
                  padding: '0.75rem 1.25rem',
                  background: 'transparent',
                  border: '2px solid var(--primary)', color: 'var(--primary)',
                  borderRadius: '10px', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer',
                }}
              >
                🔄 Regenerate
              </button>
              <button
                onClick={handleDiscard}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border)', color: 'var(--text-3)',
                  borderRadius: '10px', fontWeight: 500, fontSize: '0.9375rem', cursor: 'pointer',
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Describe state (initial) ─────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '0.5rem' }}>
        <Link href="/recipes" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9375rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          ← Recipes
        </Link>
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.5rem' }}>Generate a Recipe</h1>
      <p style={{ color: 'var(--text-3)', marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: 1.5 }}>
        Describe what you want to eat. AI creates a complete meal with ingredients, steps, and full nutrition.
      </p>

      {/* Input */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.625rem' }}>
          What do you want to eat?
        </label>
        <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() } }}
            placeholder="e.g. Spicy Thai noodles with tofu, or a quick salmon dinner for 2..."
            rows={3}
            style={{
              flex: 1,
              resize: 'vertical',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              background: 'var(--bg-page)',
              color: 'var(--text-1)',
              fontSize: '0.9375rem',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              outline: 'none',
            }}
          />
          <button
            onClick={startListening}
            title="Voice input"
            style={{
              width: 40, height: 40,
              border: `2px solid ${isListening ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: '50%',
              background: isListening ? 'rgba(61,138,62,0.1)' : 'transparent',
              color: isListening ? 'var(--primary)' : 'var(--text-3)',
              cursor: 'pointer',
              fontSize: '1.125rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              alignSelf: 'flex-start',
              flexShrink: 0,
            }}
          >
            🎤
          </button>
        </div>

        {/* Meal type selector */}
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: '0.5rem' }}>Meal type (optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['', ...MEAL_TYPES].map(m => (
              <button
                key={m || 'any'}
                onClick={() => setMealType(m)}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px',
                  border: `1px solid ${mealType === m ? 'var(--primary)' : 'var(--border)'}`,
                  background: mealType === m ? 'var(--primary)' : 'transparent',
                  color: mealType === m ? '#fff' : 'var(--text-2)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m || 'Any'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#dc2626', fontSize: '0.9375rem' }}>
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim()}
        style={{
          width: '100%',
          padding: '0.875rem',
          background: prompt.trim() ? 'var(--primary)' : 'var(--border)',
          color: prompt.trim() ? '#fff' : 'var(--text-4)',
          border: 'none', borderRadius: '12px',
          fontWeight: 700, fontSize: '1rem', cursor: prompt.trim() ? 'pointer' : 'default',
          marginBottom: '2rem',
          transition: 'background 0.2s',
        }}
      >
        ✨ Generate Recipe
      </button>

      {/* Suggestions */}
      <div>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Try these</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setPrompt(s); promptRef.current?.focus() }}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-2)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
