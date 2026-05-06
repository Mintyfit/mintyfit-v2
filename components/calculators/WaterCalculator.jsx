'use client'

import { useState, useEffect } from 'react'

function DropIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
    </svg>
  )
}

export default function WaterCalculator() {
  const [unit, setUnit] = useState('metric')
  const [weight, setWeight] = useState(70)
  const [activity, setActivity] = useState('moderate')
  const [climate, setClimate] = useState('temperate')
  const [condition, setCondition] = useState('none')
  const [result, setResult] = useState(null)

  const activityOptions = [
    { value: 'sedentary', label: 'Sedentary (desk job, little exercise)' },
    { value: 'light', label: 'Light (light exercise 1–3 days/week)' },
    { value: 'moderate', label: 'Moderate (exercise 3–5 days/week)' },
    { value: 'active', label: 'Active (intense exercise 6–7 days/week)' },
    { value: 'very_active', label: 'Very Active (physical job + daily training)' },
  ]

  const climateOptions = [
    { value: 'cold', label: 'Cold (below 10°C / 50°F)' },
    { value: 'temperate', label: 'Temperate (10–25°C / 50–77°F)' },
    { value: 'hot', label: 'Hot (25–35°C / 77–95°F)' },
    { value: 'very_hot', label: 'Very Hot / Humid (above 35°C / 95°F)' },
  ]

  const conditionOptions = [
    { value: 'none', label: 'None' },
    { value: 'pregnant', label: 'Pregnant' },
    { value: 'breastfeeding', label: 'Breastfeeding' },
    { value: 'athlete', label: 'Competitive athlete' },
    { value: 'illness', label: 'Illness / fever / diarrhoea' },
  ]

  const calculate = () => {
    const weightKg = unit === 'metric' ? parseFloat(weight) : parseFloat(weight) * 0.453592
    if (!weightKg || weightKg <= 0) return

    // Base: 35 ml per kg body weight
    let base = weightKg * 35

    // Activity multiplier
    const activityAdd = { sedentary: 0, light: 350, moderate: 600, active: 950, very_active: 1300 }
    base += activityAdd[activity] || 0

    // Climate adjustment
    const climateAdd = { cold: -200, temperate: 0, hot: 400, very_hot: 750 }
    base += climateAdd[climate] || 0

    // Special condition
    const conditionAdd = { none: 0, pregnant: 300, breastfeeding: 500, athlete: 800, illness: 500 }
    base += conditionAdd[condition] || 0

    const litres = base / 1000
    const ml = Math.round(base)
    const oz = Math.round(base * 0.033814)
    const glasses = Math.round(base / 240) // 8 oz glass = ~240 ml

    setResult({ litres: litres.toFixed(1), ml, oz, glasses })
  }

  const handleWeightChange = (e) => {
    setWeight(e.target.value)
    setResult(null)
  }

  // Notify parent of height for iframe resize
  useEffect(() => {
    const notify = () => {
      const h = document.documentElement.scrollHeight
      window.parent.postMessage({ type: 'resize', height: h }, '*')
    }
    setTimeout(notify, 100)
    setTimeout(notify, 500)
    setTimeout(notify, 1000)
    const observer = new MutationObserver(notify)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [result])

  const inputStyle = {
    width: '100%',
    border: '1px solid var(--border, #d1d5db)',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '16px',
    background: 'var(--bg-page, #fff)',
    color: 'var(--text-1, #111)',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--text-2, #374151)',
  }

  const cardStyle = {
    background: 'var(--bg-card, #fff)',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#dbeafe',
            marginBottom: 12,
            color: '#2563eb',
          }}>
            <DropIcon />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1, #111)', marginBottom: 4 }}>
            Daily Water Intake Calculator
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-3, #6b7280)' }}>
            Find your personalised hydration target
          </p>
        </div>

        {/* Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Unit toggle */}
            <div>
              <label style={labelStyle}>Unit System</label>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border, #e5e7eb)' }}>
                {['metric', 'imperial'].map(u => (
                  <button
                    key={u}
                    onClick={() => { setUnit(u); setResult(null) }}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      background: unit === u ? '#3b82f6' : 'var(--bg-page, #fff)',
                      color: unit === u ? '#fff' : 'var(--text-2, #374151)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {u === 'metric' ? 'Metric (kg)' : 'Imperial (lbs)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight */}
            <div>
              <label style={labelStyle}>Body Weight ({unit === 'metric' ? 'kg' : 'lbs'})</label>
              <input
                type="number"
                min="20"
                max={unit === 'metric' ? 250 : 550}
                value={weight}
                onChange={handleWeightChange}
                style={inputStyle}
                placeholder={unit === 'metric' ? 'e.g. 70' : 'e.g. 154'}
              />
            </div>

            {/* Activity */}
            <div>
              <label style={labelStyle}>Activity Level</label>
              <select
                value={activity}
                onChange={e => { setActivity(e.target.value); setResult(null) }}
                style={inputStyle}
              >
                {activityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Climate */}
            <div>
              <label style={labelStyle}>Climate / Environment</label>
              <select
                value={climate}
                onChange={e => { setClimate(e.target.value); setResult(null) }}
                style={inputStyle}
              >
                {climateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Special condition */}
            <div>
              <label style={labelStyle}>Special Condition</label>
              <select
                value={condition}
                onChange={e => { setCondition(e.target.value); setResult(null) }}
                style={inputStyle}
              >
                {conditionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Button */}
            <button
              onClick={calculate}
              style={{
                width: '100%',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Calculate My Water Intake
            </button>

            {/* Results */}
            {result && (
              <div style={{
                background: '#eff6ff',
                borderRadius: 12,
                padding: 20,
                marginTop: 8,
              }}>
                <h3 style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#1e40af', marginBottom: 16 }}>
                  Your Daily Hydration Target
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div style={{
                    background: 'var(--bg-page, #fff)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{result.litres}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3, #6b7280)', marginTop: 4, fontWeight: 500 }}>Litres / day</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-page, #fff)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#06b6d4' }}>{result.glasses}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3, #6b7280)', marginTop: 4, fontWeight: 500 }}>Glasses (8 oz)</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-page, #fff)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#6366f1' }}>{result.oz}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3, #6b7280)', marginTop: 4, fontWeight: 500 }}>Fluid ounces</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-page, #fff)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#14b8a6' }}>{result.ml}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3, #6b7280)', marginTop: 4, fontWeight: 500 }}>Millilitres</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-3, #6b7280)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
                  This estimate is based on body weight, activity, climate and health status.
                  Individual needs vary — listen to your body and drink when thirsty.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2, #374151)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Hydration Tips
          </h3>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {[
              'Start the day with a large glass of water before coffee or tea.',
              'Set hourly reminders until hydration becomes automatic.',
              'Pale yellow urine = well hydrated. Dark yellow = drink more.',
              'Fruits and vegetables count — they supply ~20% of daily water.',
              'Increase intake during illness, hot weather or intense exercise.',
            ].map((tip, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: 'var(--text-2, #374151)' }}>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3, #9ca3af)', marginTop: 16 }}>
          Powered by <span style={{ fontWeight: 600, color: '#60a5fa' }}>MintyFit</span> · For informational purposes only
        </p>
      </div>
    </div>
  )
}
