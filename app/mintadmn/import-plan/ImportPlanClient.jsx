'use client'

import { useState } from 'react'

const STEPS = { idle: 'idle', parsing: 'parsing', parsed: 'parsed', importing: 'importing', done: 'done', error: 'error' }

export default function ImportPlanClient() {
  const [text, setText] = useState('')
  const [menuName, setMenuName] = useState('')
  const [parsed, setParsed] = useState(null)
  const [step, setStep] = useState(STEPS.idle)
  const [log, setLog] = useState([])
  const [error, setError] = useState('')

  async function handleParse() {
    if (!text.trim()) return
    setStep(STEPS.parsing)
    setError('')
    setParsed(null)

    try {
      const res = await fetch('/api/admin/import-plan/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      setParsed(data.plan)
      setMenuName(data.plan.menuName || '')
      setStep(STEPS.parsed)
    } catch (e) {
      setError(e.message)
      setStep(STEPS.error)
    }
  }

  async function handleImport() {
    if (!parsed) return
    setStep(STEPS.importing)
    setLog([])

    try {
      const res = await fetch('/api/admin/import-plan/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: parsed, menuName }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data:'))
        for (const line of lines) {
          try {
            const msg = JSON.parse(line.slice(5))
            setLog(prev => [...prev, msg])
          } catch {}
        }
      }

      setStep(STEPS.done)
    } catch (e) {
      setError(e.message)
      setStep(STEPS.error)
    }
  }

  function reset() {
    setText('')
    setMenuName('')
    setParsed(null)
    setStep(STEPS.idle)
    setLog([])
    setError('')
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Import Meal Plan</h2>
      <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>
        Paste a raw meal plan. AI extracts each meal, then generates full recipes with live progress before importing.
      </p>

      {step === STEPS.idle || step === STEPS.error ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Paste Meal Plan Text</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the full meal plan here — any format…"
              rows={10}
              style={{
                width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px',
                fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6,
              }}
            />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>{error}</p>}
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            style={{
              fontSize: 14, padding: '8px 18px', borderRadius: 10, fontWeight: 600,
              border: 'none', background: '#2d6e2e', color: '#fff', cursor: text.trim() ? 'pointer' : 'default',
              opacity: text.trim() ? 1 : 0.4,
            }}
          >
            Parse with AI
          </button>
        </div>
      ) : step === STEPS.parsing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 48, justifyContent: 'center' }}>
          <div style={{
            width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#2d6e2e',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 14, color: '#6b7280' }}>Parsing meal plan…</span>
        </div>
      ) : step === STEPS.parsed ? (
        <div>
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid #f0f0f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '18px 20px', marginBottom: 16,
          }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Menu Name</label>
              <input
                value={menuName}
                onChange={e => setMenuName(e.target.value)}
                placeholder="e.g. 7-Day Gut Reset"
                style={{
                  width: '100%', maxWidth: 420, border: '1px solid #e5e7eb', borderRadius: 10,
                  padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Recipes to import ({parsed.recipes?.length ?? 0})
              </p>
              <ul>
                {parsed.recipes?.map((r, i) => (
                  <li key={i} style={{
                    fontSize: 14, padding: '4px 0', color: '#374151',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d6e2e', flexShrink: 0 }} />
                    {r.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleImport}
              style={{
                fontSize: 14, padding: '8px 18px', borderRadius: 10, fontWeight: 600,
                border: 'none', background: '#2d6e2e', color: '#fff', cursor: 'pointer',
              }}
            >
              Import {parsed.recipes?.length} Recipes
            </button>
            <button
              onClick={reset}
              style={{
                fontSize: 14, padding: '8px 18px', borderRadius: 10, fontWeight: 500,
                border: '1.5px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer',
              }}
            >
              Start over
            </button>
          </div>
        </div>
      ) : step === STEPS.importing ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#2d6e2e',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 14, color: '#6b7280' }}>Generating recipes…</span>
          </div>
          <ul style={{
            maxHeight: 256, overflowY: 'auto', fontSize: 14, padding: 0, listStyle: 'none',
          }}>
            {log.map((entry, i) => (
              <li key={i} style={{
                padding: '4px 0', color: entry.ok ? '#2d6e2e' : '#dc2626',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>{entry.ok ? '✓' : '✗'}</span>
                <span>{entry.name}</span>
                {entry.error && <span style={{ fontSize: 12, opacity: 0.7 }}>— {entry.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : step === STEPS.done ? (
        <div>
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14,
            padding: '18px 20px', marginBottom: 16,
          }}>
            <p style={{ color: '#2d6e2e', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Import complete!</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {log.map((entry, i) => (
                <li key={i} style={{
                  fontSize: 14, padding: '3px 0', color: entry.ok ? '#2d6e2e' : '#dc2626',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>{entry.ok ? '✓' : '✗'}</span>
                  <span>{entry.name}</span>
                  {entry.error && <span style={{ fontSize: 12, opacity: 0.7 }}>— {entry.error}</span>}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={reset}
            style={{
              fontSize: 14, color: '#6b7280', background: 'none', border: 'none',
              cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Import another plan
          </button>
        </div>
      ) : null}
    </div>
  )
}
