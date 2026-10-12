'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'minty-text-scale'
const MIN = 0.85
const MAX = 1.4
const STEP = 0.05

function applyScale(scale) {
  document.documentElement.style.setProperty('--user-text-scale', String(scale))
}

/**
 * TextSizeSettings — manual text-size slider (My Account → Preferences).
 *
 * The whole app sizes text in rem off the root font-size (globals.css scales
 * `html { font-size }` by --user-text-scale), so this one CSS variable scales
 * ALL text — and rem-sized controls — proportionally. Persisted per-device in
 * localStorage; the inline boot script in app/layout.jsx applies it pre-paint
 * so returning visits never flash at the default size.
 */
export default function TextSizeSettings() {
  const [scale, setScale] = useState(1)

  // Read the persisted value after mount (server render must match client).
  useEffect(() => {
    try {
      const saved = parseFloat(localStorage.getItem(STORAGE_KEY))
      if (saved > 0) setScale(Math.min(MAX, Math.max(MIN, saved)))
    } catch {}
  }, [])

  function update(value) {
    const v = Math.min(MAX, Math.max(MIN, value))
    setScale(v)
    applyScale(v)
    try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
  }

  function reset() {
    setScale(1)
    applyScale(1)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const percent = Math.round(scale * 100)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <label htmlFor="text-size-slider" style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontWeight: 500 }}>
          Text size
        </label>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
          {percent}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span aria-hidden="true" style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>A</span>
        <input
          id="text-size-slider"
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={scale}
          onChange={e => update(parseFloat(e.target.value))}
          aria-valuetext={`${percent}%`}
          style={{
            flex: 1,
            minHeight: 'var(--tap-min)',
            accentColor: 'var(--primary)',
            cursor: 'pointer',
          }}
        />
        <span aria-hidden="true" style={{ fontSize: '1.25rem', color: 'var(--text-3)' }}>A</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', margin: 0 }}>
          Scales all text in the app on this device.
        </p>
        {scale !== 1 && (
          <button
            onClick={reset}
            style={{
              background: 'none', border: 'none', padding: '4px 0',
              color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
