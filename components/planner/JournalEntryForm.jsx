'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useVoice } from '@/hooks/useVoice'
import { useSubscription } from '@/hooks/useSubscription'
import { pickNutritionFields, sumNutrition } from '@/lib/nutrition/nutrition'
import { EMPTY_NUTRITION } from '@/lib/journal/grokFoodLookup'

const UNITS = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice', 'portion']

// Full nutrient template (same 53-field set as the ingredient DB) so logged
// food feeds every nutrient in the side panel + statistics, not just macros.
const NUTRITION_TEMPLATE = EMPTY_NUTRITION.slice(1, -1)

// Downscale phone photos (often 5-10 MB) to a size vision APIs accept happily.
// 1024px JPEG ≈ 150-400 KB — plenty for portion estimation.
async function fileToResizedDataUrl(file, maxDim = 1024, quality = 0.8) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = dataUrl
  })
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

export default function JournalEntryForm({ mealType, dateKey, userId, members, onSave, onClose }) {
  const [tab, setTab] = useState('quick') // 'quick' | 'describe' | 'photo' | 'barcode'
  const [foodName, setFoodName] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('g')
  const [memberId, setMemberId] = useState(members[0]?.id || '')
  const [aiText, setAiText] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolved, setResolved] = useState(null) // parsed + nutrition data
  const [error, setError] = useState('')
  const barcodeRef = useRef(null)
  const photoInputRef = useRef(null)
  const [photoPreview, setPhotoPreview] = useState(null) // dataURL for <img>
  const [photoBase64, setPhotoBase64] = useState(null)   // base64 payload for API
  const [photoDesc, setPhotoDesc] = useState('')
  // Photo result: { food_name, components: [{ name, grams, nutrition }] }.
  // Editing a component's grams rescales its nutrition linearly; totals are
  // always derived by summing components at render/save time.
  const [photoResult, setPhotoResult] = useState(null)
  const [frequentFoods, setFrequentFoods] = useState([])
  const { canUsePhotoLog } = useSubscription()

  // Fetch frequent foods (logged ≥2 times) on mount
  useEffect(() => {
    async function fetchFrequentFoods() {
      const supabase = createClient()
      if (!supabase) return
      const { data } = await supabase
        .from('food_journal')
        .select('food_name, amount, unit')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
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
          max_tokens: 2000,
          purpose: 'food-parse',
          messages: [
            { role: 'system', content: 'You are a registered dietitian with deep knowledge of food composition databases. Return ONLY raw valid JSON with nutrition for the exact quantity asked (not per 100g). energy_kj = energy_kcal × 4.184, salt_equiv = sodium_mg × 2.54 / 1000. No markdown.' },
            { role: 'user', content: `Estimate nutrition for: ${amt} ${unitStr} of ${name}. Return ONLY this JSON with every 0 replaced by a realistic value: {${NUTRITION_TEMPLATE}}` },
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
        nutrition: nutrition ? pickNutritionFields(nutrition) : null,
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
          max_tokens: 2000,
          purpose: 'food-parse',
          messages: [
            { role: 'system', content: 'You are a registered dietitian. Parse the food description and return ONLY raw JSON with nutrition for the exact total quantity described (not per 100g). energy_kj = energy_kcal × 4.184, salt_equiv = sodium_mg × 2.54 / 1000. No markdown.' },
            { role: 'user', content: `Parse this food log entry and estimate nutrition: "${aiText}"\n\nReturn ONLY this JSON with every 0 replaced by a realistic value: {"food_name":"","amount":0,"unit":"g",${NUTRITION_TEMPLATE}}` },
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
      nutrition: pickNutritionFields(resolved),
      nutrition_source: 'grok',
    })
    setLoading(false)
  }

  // ── Photo tab ────────────────────────────────────────────────────────────

  async function handlePhotoPicked(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      setPhotoPreview(dataUrl)
      setPhotoBase64(dataUrl.split(',')[1] || '')
      setPhotoResult(null)
    } catch {
      setError('Could not read that image. Try another photo.')
    }
  }

  async function handlePhotoAnalyse() {
    if (!photoBase64) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/food-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: photoBase64,
          mediaType: 'image/jpeg',
          description: photoDesc || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 403 || data.error === 'UPGRADE_REQUIRED') {
        setError('Photo logging is a Family plan feature.')
        return
      }
      if (res.status === 429) {
        setError('Daily limit reached. Try again tomorrow.')
        return
      }
      if (!res.ok || !Array.isArray(data.components) || data.components.length === 0) {
        throw new Error(data.error || 'parse failed')
      }
      setPhotoResult({ food_name: data.food_name, components: data.components })
    } catch {
      setError('Could not analyse the photo. Try a clearer shot or Quick add.')
    } finally {
      setLoading(false)
    }
  }

  // User corrects a component's grams → rescale that component's nutrition
  // linearly. Totals recompute from components automatically.
  function updateComponentGrams(index, newGrams) {
    setPhotoResult(prev => {
      if (!prev) return prev
      const components = prev.components.map((c, i) => {
        if (i !== index) return c
        const grams = Math.max(0, parseFloat(newGrams) || 0)
        const factor = c.grams > 0 ? grams / c.grams : 0
        const nutrition = {}
        for (const [k, v] of Object.entries(c.nutrition || {})) {
          nutrition[k] = typeof v === 'number' ? v * factor : v
        }
        return { ...c, grams, nutrition }
      })
      return { ...prev, components }
    })
  }

  async function handleSavePhoto() {
    if (!photoResult) return
    setLoading(true)
    const totals = sumNutrition(photoResult.components.map(c => c.nutrition))
    const totalGrams = Math.round(photoResult.components.reduce((s, c) => s + c.grams, 0))
    await saveEntry({
      food_name: photoResult.food_name,
      amount: totalGrams,
      unit: 'g',
      nutrition: pickNutritionFields(totals),
    })
    setLoading(false)
  }

  async function saveEntry({ food_name, amount, unit, nutrition }) {
    const supabase = createClient()
    if (!supabase) { setError('No connection.'); return }
    // Schema (migration 011): food_journal(profile_id, member_id, logged_date,
    // meal_type, food_name, amount, unit, nutrition, created_at).
    const { error: insertError } = await supabase.from('food_journal').insert({
      profile_id: userId,
      member_id: memberId || null,
      logged_date: dateKey,
      meal_type: mealType,
      food_name,
      amount,
      unit,
      nutrition,
    })
    if (insertError) {
      setError(insertError.message || 'Could not save entry.')
      return
    }
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
            { id: 'photo', label: '📸 Photo' },
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

          {/* Photo (Family tier) */}
          {tab === 'photo' && (
            <div>
              {!canUsePhotoLog ? (
                /* Paywall teaser — Family plan feature */
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📸🔒</div>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    Snap a photo. Get the full nutrition breakdown.
                  </p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.8125rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                    Photo logging sees your actual portion sizes and the rice-to-chicken ratio — far more accurate than describing a meal in words. Available on the Family plan.
                  </p>
                  <Link href="/pricing" style={{
                    display: 'inline-block', background: 'var(--primary)', color: '#fff',
                    padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none',
                    fontSize: '0.875rem', fontWeight: 600,
                  }}>
                    Unlock with Family →
                  </Link>
                </div>
              ) : !photoResult ? (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoPicked}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    style={{
                      width: '100%', padding: photoPreview ? '0.5rem' : '1.5rem', marginBottom: '0.875rem',
                      border: '2px dashed var(--border)', borderRadius: '10px', background: 'var(--bg-page)',
                      cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.875rem',
                    }}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Meal to analyse" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                    ) : (
                      <>📸 Tap to take a photo or choose from gallery</>
                    )}
                  </button>
                  <textarea
                    value={photoDesc}
                    onChange={e => setPhotoDesc(e.target.value)}
                    placeholder='Optional: help the AI, e.g. "Chinese chicken with red sauce and rice"'
                    rows={2}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  />
                  {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>}
                  <button
                    onClick={handlePhotoAnalyse}
                    disabled={loading || !photoBase64}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: loading || !photoBase64 ? 'default' : 'pointer', opacity: loading || !photoBase64 ? 0.7 : 1, fontSize: '0.9375rem' }}
                  >
                    {loading ? 'Analysing photo…' : '📸 Analyse photo'}
                  </button>
                </>
              ) : (
                /* Confirm + correct: editable per-component grams */
                (() => {
                  const totals = sumNutrition(photoResult.components.map(c => c.nutrition))
                  const totalGrams = Math.round(photoResult.components.reduce((s, c) => s + c.grams, 0))
                  return (
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '0.9375rem', margin: '0 0 0.25rem' }}>{photoResult.food_name}</p>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.8125rem', margin: '0 0 0.75rem' }}>
                        Adjust the grams if a portion looks wrong — totals update instantly.
                      </p>
                      <div style={{ background: 'var(--bg-page)', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                        {photoResult.components.map((c, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0', borderBottom: i < photoResult.components.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                            <input
                              type="number"
                              value={Math.round(c.grams)}
                              min="0"
                              onChange={e => updateComponentGrams(i, e.target.value)}
                              style={{ width: 72, padding: '0.3rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-1)', fontSize: '0.875rem', textAlign: 'right' }}
                            />
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', width: 14 }}>g</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: '0 0 1rem', fontSize: '0.9375rem', color: 'var(--text-2)' }}>
                        {totalGrams} g · {Math.round(totals.energy_kcal || 0)} kcal · P: {Math.round(totals.protein || 0)}g · C: {Math.round(totals.carbs_total || 0)}g · F: {Math.round(totals.fat_total || 0)}g
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleSavePhoto} disabled={loading || totalGrams === 0} style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9375rem', opacity: loading || totalGrams === 0 ? 0.7 : 1 }}>
                          {loading ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => { setPhotoResult(null); setPhotoPreview(null); setPhotoBase64(null) }} style={{ padding: '0.75rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9375rem' }}>
                          Retake
                        </button>
                      </div>
                    </div>
                  )
                })()
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
