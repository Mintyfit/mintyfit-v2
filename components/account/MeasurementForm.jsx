'use client'

import { useState } from 'react'

const LABEL_STYLE = { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }
const INPUT_STYLE = { width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }

function dbToDisplay(value, field, isMetric) {
  if (value == null) return ''
  if (field === 'weight_kg') return isMetric ? Number(value).toFixed(1) : Number(value * 2.20462).toFixed(1)
  if (field === 'height_cm') return isMetric ? Number(value).toFixed(1) : Number(value / 2.54).toFixed(1)
  return value
}

function displayToDb(value, field, isMetric) {
  if (value == null || value === '') return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  if (field === 'weight_kg') return isMetric ? num : num / 2.20462
  if (field === 'height_cm') return isMetric ? num : num * 2.54
  return num
}

function fieldLabel(field, isMetric) {
  if (field === 'weight_kg') return isMetric ? 'Weight (kg)' : 'Weight (lbs)'
  if (field === 'height_cm') return isMetric ? 'Height (cm)' : 'Height (in)'
  return field
}

export default function MeasurementForm({ onSave, onCancel, gender, age, initialValues, unitsPreference = 'metric' }) {
  const isMetric = unitsPreference === 'metric'

  const toDate = (v) => v ? String(v).slice(0, 10) : new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    weight_kg: dbToDisplay(initialValues?.weight_kg, 'weight_kg', isMetric) ?? '',
    height_cm: dbToDisplay(initialValues?.height_cm, 'height_cm', isMetric) ?? '',
    notes: initialValues?.notes ?? '',
    recorded_at: toDate(initialValues?.recorded_at),
  })
  const [isPregnant, setIsPregnant] = useState(initialValues?.is_pregnant ?? false)
  const [isBreastfeeding, setIsBreastfeeding] = useState(initialValues?.is_breastfeeding ?? false)
  const [saving, setSaving] = useState(false)

  // Live BMR — Mifflin-St Jeor, always computed in metric
  const weightKg = displayToDb(form.weight_kg, 'weight_kg', isMetric)
  const heightCm = displayToDb(form.height_cm, 'height_cm', isMetric)
  const bmr = weightKg && heightCm && age
    ? (gender === 'female'
        ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161)
        : Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5))
    : null
  const tdee = bmr ? Math.round(bmr * 1.2) : null

  const handleSubmit = async () => {
    setSaving(true)
    const payload = {
      recorded_at: form.recorded_at,
      notes: form.notes,
      is_pregnant: isPregnant,
      is_breastfeeding: isBreastfeeding,
    }
    ;[
      ['weight_kg', 'weight_kg'],
      ['height_cm', 'height_cm'],
    ].forEach(([formKey, dbField]) => {
      const db = displayToDb(form[formKey], dbField, isMetric)
      if (db != null) payload[dbField] = db
    })
    await onSave(payload)
    setSaving(false)
  }

  const isEdit = !!initialValues

  return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '20px', marginTop: '16px' }}>
      <h4 style={{ fontWeight: '600', fontSize: '14px', color: '#15803d', marginBottom: '16px' }}>
        {isEdit ? 'Edit Measurement' : 'New Measurement'}
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={LABEL_STYLE}>{fieldLabel('weight_kg', isMetric)}</label>
          <input type="number" step="0.1" value={form.weight_kg}
            onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))}
            style={INPUT_STYLE} placeholder="—" />
        </div>
        <div>
          <label style={LABEL_STYLE}>{fieldLabel('height_cm', isMetric)}</label>
          <input type="number" step={isMetric ? '0.5' : '0.1'} value={form.height_cm}
            onChange={e => setForm(p => ({ ...p, height_cm: e.target.value }))}
            style={INPUT_STYLE} placeholder="—" />
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={LABEL_STYLE}>Date</label>
        <input type="date" value={form.recorded_at}
          onChange={e => setForm(p => ({ ...p, recorded_at: e.target.value }))}
          style={INPUT_STYLE} />
      </div>

      {/* Live BMR */}
      {bmr && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>BMR: </span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#2d6e2e' }}>{bmr}</span>
          <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '4px' }}>kcal/day at rest</span>
          <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '12px' }}>TDEE (sedentary): {tdee} kcal/day</span>
        </div>
      )}

      {/* Pregnancy / breastfeeding — female members only */}
      {gender === 'female' && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={isPregnant} onChange={e => setIsPregnant(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#2d6e2e' }} />
          Pregnant <span style={{ color: '#6b7280', fontSize: '14px' }}>(+500 kcal/day to calorie target)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={isBreastfeeding} onChange={e => setIsBreastfeeding(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#2d6e2e' }} />
          Breastfeeding <span style={{ color: '#6b7280', fontSize: '14px' }}>(+500 kcal/day to calorie target)</span>
        </label>
        {(isPregnant || isBreastfeeding) && (
          <p style={{ fontSize: '14px', color: '#b45309', marginTop: '4px' }}>
            +500 kcal/day added to your calorie target
          </p>
        )}
      </div>}

      <div>
        <label style={LABEL_STYLE}>Notes (optional)</label>
        <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          style={{ ...INPUT_STYLE, marginBottom: '16px' }}
          placeholder="e.g. after morning workout" />
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={handleSubmit} disabled={saving}
          style={{ background: '#2d6e2e', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : isEdit ? 'Update Measurement' : 'Save Measurement'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'transparent', color: '#6b7280', padding: '8px 16px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
