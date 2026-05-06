'use client'

import { useState, useEffect } from 'react'

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  )
}

export default function VitaminD3Calculator() {
  const [age, setAge] = useState(35)
  const [skinTone, setSkinTone] = useState('medium')
  const [sunExposure, setSunExposure] = useState('limited')
  const [bmi, setBmi] = useState('normal')
  const [conditions, setConditions] = useState([])
  const [currentSupp, setCurrentSupp] = useState(0)
  const [result, setResult] = useState(null)

  const skinOptions = [
    { value: 'very_light', label: 'Very light (type I–II, burns easily)' },
    { value: 'light', label: 'Light (type III, tans with effort)' },
    { value: 'medium', label: 'Medium (type IV, tans easily)' },
    { value: 'dark', label: 'Dark (type V–VI, rarely burns)' },
  ]

  const sunOptions = [
    { value: 'none', label: 'Minimal / indoor lifestyle' },
    { value: 'limited', label: 'Limited (< 15 min/day outdoors)' },
    { value: 'moderate', label: 'Moderate (15–30 min/day outdoor)' },
    { value: 'good', label: 'Good (30–60 min/day in sun)' },
    { value: 'high', label: 'High (> 1 hr/day in strong sun)' },
  ]

  const bmiOptions = [
    { value: 'under', label: 'Underweight (BMI < 18.5)' },
    { value: 'normal', label: 'Normal weight (BMI 18.5–24.9)' },
    { value: 'over', label: 'Overweight (BMI 25–29.9)' },
    { value: 'obese', label: 'Obese (BMI ≥ 30)' },
  ]

  const conditionOptions = [
    { value: 'osteoporosis', label: 'Osteoporosis / low bone density' },
    { value: 'malabsorption', label: 'Malabsorption (Crohn\'s, coeliac, bariatric surgery)' },
    { value: 'kidney', label: 'Chronic kidney disease' },
    { value: 'liver', label: 'Liver disease' },
    { value: 'immune', label: 'Immune condition (MS, lupus, rheumatoid arthritis)' },
    { value: 'depression', label: 'Depression / low mood (possible link)' },
  ]

  const toggleCondition = (val) => {
    setConditions(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
    setResult(null)
  }

  const calculate = () => {
    const ageNum = parseInt(age)
    if (!ageNum || ageNum < 1) return

    // Base RDA by age
    let base = 600 // IU — general adult RDA (Endocrine Society)
    if (ageNum >= 70) base = 800
    if (ageNum < 1) base = 400
    if (ageNum < 12) base = 600

    // Skin tone: darker skin needs more sun / supplementation
    const skinAdd = { very_light: 0, light: 200, medium: 400, dark: 700 }
    base += skinAdd[skinTone] || 0

    // Sun exposure (less sun = more supplement needed)
    const sunAdd = { none: 1000, limited: 600, moderate: 300, good: 100, high: 0 }
    base += sunAdd[sunExposure] || 0

    // BMI: adipose tissue sequesters D3
    const bmiAdd = { under: -100, normal: 0, over: 300, obese: 600 }
    base += bmiAdd[bmi] || 0

    // Conditions
    const condAdd = { osteoporosis: 400, malabsorption: 600, kidney: 200, liver: 300, immune: 400, depression: 200 }
    conditions.forEach(c => { base += condAdd[c] || 0 })

    // Round to nearest 200
    base = Math.round(base / 200) * 200
    // Clamp to safe upper range (UL is 4000 IU for general population, 10000 for clinical)
    base = Math.min(base, 4000)
    base = Math.max(base, 400)

    // Subtract current supplement (floor at 0)
    const additionalNeeded = Math.max(0, base - parseInt(currentSupp || 0))

    // mcg equivalent (1 IU vit D = 0.025 mcg)
    const mcg = (base * 0.025).toFixed(1)

    let riskLevel = 'Low'
    let riskColor = 'green'
    if (base >= 2000) { riskLevel = 'Moderate–High'; riskColor = 'orange' }
    else if (base >= 1000) { riskLevel = 'Moderate'; riskColor = 'yellow' }

    setResult({ iu: base, mcg, additionalNeeded, riskLevel, riskColor })
  }

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
    border: '1px solid var(--border, #e5e7eb)',
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
      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
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
            background: '#fef3c7',
            marginBottom: 12,
            color: '#f59e0b',
          }}>
            <SunIcon />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1, #111)', marginBottom: 4 }}>
            Vitamin D3 Intake Calculator
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-3, #6b7280)' }}>
            Personalised supplementation estimate based on your profile
          </p>
        </div>

        {/* Card */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Age */}
            <div>
              <label style={labelStyle}>Age (years)</label>
              <input
                type="number"
                min="1"
                max="110"
                value={age}
                onChange={e => { setAge(e.target.value); setResult(null) }}
                style={inputStyle}
                placeholder="e.g. 35"
              />
            </div>

            {/* Skin tone */}
            <div>
              <label style={labelStyle}>Skin Tone (Fitzpatrick scale)</label>
              <select
                value={skinTone}
                onChange={e => { setSkinTone(e.target.value); setResult(null) }}
                style={inputStyle}
              >
                {skinOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Sun exposure */}
            <div>
              <label style={labelStyle}>Daily Sun Exposure</label>
              <select
                value={sunExposure}
                onChange={e => { setSunExposure(e.target.value); setResult(null) }}
                style={inputStyle}
              >
                {sunOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* BMI range */}
            <div>
              <label style={labelStyle}>Body Weight Range</label>
              <select
                value={bmi}
                onChange={e => { setBmi(e.target.value); setResult(null) }}
                style={inputStyle}
              >
                {bmiOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Health conditions */}
            <div>
              <label style={labelStyle}>Health Conditions (select all that apply)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {conditionOptions.map(o => (
                  <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={conditions.includes(o.value)}
                      onChange={() => toggleCondition(o.value)}
                      style={{ marginTop: 2, accentColor: '#f59e0b' }}
                    />
                    <span style={{ fontSize: 14, color: 'var(--text-2, #374151)' }}>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Current supplement */}
            <div>
              <label style={labelStyle}>Current Vitamin D3 Supplement (IU/day, 0 if none)</label>
              <input
                type="number"
                min="0"
                max="10000"
                step="200"
                value={currentSupp}
                onChange={e => { setCurrentSupp(e.target.value); setResult(null) }}
                style={inputStyle}
                placeholder="e.g. 1000"
              />
            </div>

            {/* Button */}
            <button
              onClick={calculate}
              style={{
                width: '100%',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Calculate My Vitamin D3 Needs
            </button>

            {/* Results */}
            {result && (
              <div style={{
                background: '#fffbeb',
                borderRadius: 12,
                padding: 20,
                marginTop: 8,
              }}>
                <h3 style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#92400e', marginBottom: 16 }}>
                  Your Estimated Daily Target
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div style={{
                    background: 'var(--bg-page, #fff)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    gridColumn: 'span 2',
                  }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b' }}>{result.iu.toLocaleString()}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3, #6b7280)', marginTop: 4, fontWeight: 500 }}>IU / day total intake</div>
                    <div style={{ fontSize: 12, color: 'var(--text-4, #9ca3af)', marginTop: 2 }}>({result.mcg} mcg)</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-page, #fff)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>{result.additionalNeeded.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3, #6b7280)', marginTop: 4, fontWeight: 500 }}>Additional IU from supplement</div>
                  </div>
                  <div style={{
                    background: result.riskColor === 'green' ? '#f0fdf4' : result.riskColor === 'yellow' ? '#fefce8' : '#fff7ed',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: result.riskColor === 'green' ? '#166534' : result.riskColor === 'yellow' ? '#854d0e' : '#c2410c' }}>
                      {result.riskLevel}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3, #6b7280)', marginTop: 4, fontWeight: 500 }}>Deficiency risk level</div>
                  </div>
                </div>
                {result.iu >= 2000 && (
                  <div style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 16,
                    fontSize: 12,
                    color: '#9a3412',
                  }}>
                    ⚠️ At doses above 2,000 IU/day, consult your doctor or get a blood test (25-OH-D) before starting or increasing supplementation.
                  </div>
                )}
                <p style={{ fontSize: 12, color: 'var(--text-3, #6b7280)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
                  Estimates are based on population guidelines. Blood level testing is the only way to confirm your actual Vitamin D status.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2, #374151)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Why Vitamin D3 Matters
          </h3>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {[
              'Supports calcium absorption and bone mineralisation.',
              'Regulates immune function — low levels linked to more frequent illness.',
              'Over 40% of adults worldwide are Vitamin D deficient.',
              'Darker skin requires significantly longer sun exposure to produce D3.',
              'Take D3 with a meal containing fat — it is fat-soluble.',
            ].map((tip, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: 'var(--text-2, #374151)' }}>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3, #9ca3af)', marginTop: 16 }}>
          Powered by <span style={{ fontWeight: 600, color: '#fbbf24' }}>MintyFit</span> · For informational purposes only · Not medical advice
        </p>
      </div>
    </div>
  )
}
