'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVoice } from '@/hooks/useVoice'

const UNITS = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice', 'portion']

export default function JournalEntryForm({ mealType, dateKey, userId, members, onSave, onClose }) {
  const [tab, setTab] = useState('quick') // 'quick' | 'describe' | 'barcode'
  const [foodName, setFoodName] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('g')
  const [memberId, setMemberId] = useState(members[0]?.id || '')
  const [aiText, setAiText] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolved, setResolved] = useState(null) // parsed + nutrition data
  const [error, setError] = useState('')
  const barcodeRef = useRef(null)
  const [frequentFoods, setFrequentFoods] = useState([])

  // Fetch frequent foods (logged ≥2 times) on mount
  useEffect(() => {
    async function fetchFrequentFoods() {
      const supabase = createClient()
      if (!supabase) return
      const { data } = await supabase
        .from('journal_entries')
        .select('food_name, amount, unit')
        .eq('profile_id', userId)
        .order('logged_at', { ascending: false })
        .limit(200)
      if (!data) return
      // Count occurrences
      const counts = {}
      const meta = {}
      for (const row of data) {
        const key = row.food_name?.toLowerCase()
        if (!key) continue
        counts[key] = (counts[key] || 0) + 1
        if (!meta[key]) meta[key] = { food_name: row.food_name, amount: row.amount, unit: row.unit }
      }
      const frequent = Object.keys(counts)
        .filter(k => counts[k] >= 2)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 8)
        .map(k => meta[k])
      setFrequentFoods(frequent)
    }
    fetchFrequentFoods()
  }, [userId])

  const { isListening, startListening } = useVoice({
    onTranscript: text => {
      if (tab === 'quick') setFoodName(p => p ? `${p} ${text}` : text)
      if (tab === 'describe') setAiText(p => p ? `${p} ${text}` : text)
    },
  })

  async function lookupNutrition(name, amt, unitStr) {
    try {
      const res = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-3-fast',
          max_tokens: 800,
          messages: [
            { role: 'system', content: 'You are a dietitian. Return ONLY raw valid JSON with nutrition per serving. No markdown.' },
            { role: 'user', content: `Estimate nutrition for: ${amt} ${unitStr} of ${name}. Return JSON: {"energy_kcal":0,"protein":0,"carbs_total":0,"fat_total":0,"fiber":0}` },
          ],
        }),
      })
      const data = await res.json()
      const text = data.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
    } catch {}
    return null
  }

  async function handleQuickSave() {
    if (!foodName.trim() || !amount) return
    setLoading(true)
    setError('')
    try {
      const nutrition = await lookupNutrition(foodName, amount, unit)
      await saveEntry({
        food_name: foodName,
        amount: parseFloat(amount),
        unit,
        nutrition,
        nutrition_source: 'grok',
      })
    } catch {
      setError('Could not look up nutrition. Saved without nutrition data.')
      await saveEntry({ food_name: foodName, amount: parseFloat(amount), unit, nutrition: null, nutrition_source: 'manual' })
    }
    setLoading(false)
  }

  async function handleAIDescribe() {
    if (!aiText.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-3-fast',
          max_tokens: 1000,
          messages: [
            { role: 'system', content: 'You are a dietitian. Parse the food description and return ONLY raw JSON. No markdown.' },
            { role: 'user', content: `Parse this food log entry and estimate nutrition: "${aiText}"\n\nReturn JSON: {"food_name":"","amount":0,"unit":"g","energy_kcal":0,"protein":0,"carbs_total":0,"fat_total":0,"fiber":0}` },
          ],
        }),
      })
      const data = await res.json()
      const text = data.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('parse failed')
      const parsed = JSON.parse(match[0])
      setResolved(parsed)
    } catch {
      setError('Could not parse your description. Try the quick add instead.')
    }
    setLoading(false)
  }

  async function handleSaveResolved() {
    if (!resolved) return
    setLoading(true)
    await saveEntry({
      food_name: resolved.food_name || aiText,
      amount: resolved.amount,
      unit: resolved.unit || 'g',
      nutrition: {
        energy_kcal: resolved.energy_kcal,
        protein: resolved.protein,
        carbs_total: resolved.carbs_total,
        fat_total: resolved.fat_total,
        fiber: resolved.fiber,
      },
      nutrition_source: 'grok',
    })
    setLoading(false)
  }

  async function saveEntry({ food_name, amount, unit, nutrition, nutrition_source }) {
    const supabase = createClient()
    if (!supabase) return
    await supabase.from('journal_entries').insert({
      profile_id: userId,
      member_id: memberId || null,
      date: dateKey,
      meal_type: mealType,
      food_name,
      amount,
      unit,
      nutrition,
      nutrition_source,
      logged_at: new Date().toISOString(),
    })
    onSave()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', maxHeight: '80vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>
            Log food — {mealType?.replace('snack2', 'snack')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-3)' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'quick', label: '⚡ Quick add' },
            { id: 'describe', label: '🤖 AI describe' },
            { id: 'barcode', label: '📷 Barcode' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '0.625rem', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-3)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Member selector */}
          {members.length > 1 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.375rem' }}>For</label>
              <select
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem' }}
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name || m.first_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick add */}
          {tab === 'quick' && (
            <div>
              {/* Frequent foods chips */}
              {frequentFoods.length > 0 && (
                <div style={{ marginBottom: '0.875rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>🕐 Recent favourites</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {frequentFoods.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setFoodName(f.food_name)
                          if (f.amount) setAmount(String(f.amount))
                          if (f.unit) setUnit(f.unit)
                        }}
                        style={{ padding: '0.3rem 0.75rem', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-2)', fontSize: '0.8125rem', cursor: 'pointer' }}
                      >
                        {f.food_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
                <input
                  type="text"
                  value={foodName}
                  onChange={e => setFoodName(e.target.value)}
                  placeholder="Food name (e.g. Greek yogurt)"
                  style={{ flex: 1, padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none' }}
                />
                <button onClick={startListening} style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${isListening ? 'var(--primary)' : 'var(--border)'}`, background: isListening ? 'rgba(61,138,62,0.1)' : 'transparent', color: isListening ? 'var(--primary)' : 'var(--text-3)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎤</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Amount"
                  style={{ flex: 1, padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none' }}
                />
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  style={{ padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-2)', fontSize: '0.9375rem' }}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}
              <button
                onClick={handleQuickSave}
                disabled={loading || !foodName.trim() || !amount}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '0.9375rem' }}
              >
                {loading ? 'Looking up nutrition…' : 'Save entry'}
              </button>
            </div>
          )}

          {/* AI describe */}
          {tab === 'describe' && (
            <div>
              {!resolved ? (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <textarea
                      value={aiText}
                      onChange={e => setAiText(e.target.value)}
                      placeholder='Describe what you ate, e.g. "I had a medium bowl of oatmeal with blueberries and a tablespoon of honey"'
                      rows={3}
                      style={{ flex: 1, padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                    />
                    <button onClick={startListening} style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${isListening ? 'var(--primary)' : 'var(--border)'}`, background: isListening ? 'rgba(61,138,62,0.1)' : 'transparent', color: isListening ? 'var(--primary)' : 'var(--text-3)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-start' }}>🎤</button>
                  </div>
                  {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}
                  <button
                    onClick={handleAIDescribe}
                    disabled={loading || !aiText.trim()}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '0.9375rem' }}
                  >
                    {loading ? 'Analysing…' : '🤖 Parse & estimate nutrition'}
                  </button>
                </>
              ) : (
                <div>
                  <div style={{ background: 'var(--bg-page)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', fontSize: '0.9375rem', color: 'var(--text-2)' }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.5rem' }}>{resolved.food_name}</p>
                    <p style={{ margin: 0 }}>
                      {resolved.amount} {resolved.unit} · {resolved.energy_kcal} kcal · P: {resolved.protein}g · C: {resolved.carbs_total}g · F: {resolved.fat_total}g
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleSaveResolved} disabled={loading} style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9375rem' }}>
                      {loading ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setResolved(null)} style={{ padding: '0.75rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9375rem' }}>
                      Re-enter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barcode */}
          {tab === 'barcode' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
              <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                Point your camera at a product barcode to look up nutrition data via Open Food Facts.
              </p>
              <p style={{ color: 'var(--text-4)', fontSize: '0.8125rem' }}>
                Camera barcode scanning requires additional permissions. Use Quick Add for now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
