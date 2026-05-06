'use client'

import { useState, useEffect } from 'react'
import MeasurementForm from './MeasurementForm'

const CARD = {
  background: 'white', borderRadius: '16px', padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
}

function dbToDisplay(value, field, isMetric) {
  if (value == null) return '—'
  if (field === 'weight_kg') return isMetric ? `${Number(value).toFixed(1)} kg` : `${Number(value * 2.20462).toFixed(1)} lbs`
  if (field === 'height_cm') return isMetric ? `${Number(value).toFixed(1)} cm` : `${Number(value / 2.54).toFixed(1)} in`
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

function computeBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age) return null
  return gender === 'female'
    ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161)
    : Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5)
}

export default function MemberCard({ member, onUpdate, onDelete, addMeasurement, updateMeasurement, unitsPreference = 'metric' }) {
  const isMetric = unitsPreference === 'metric'
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(!!member.is_primary)
  const [editForm, setEditForm] = useState({
    name: member.name,
    gender: member.gender || '',
    date_of_birth: member.date_of_birth || '',
  })
  const [editingMeasurements, setEditingMeasurements] = useState(false)
  const [measForm, setMeasForm] = useState({ weight_kg: '', height_cm: '' })
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showMeasForm, setShowMeasForm] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editingAllergies, setEditingAllergies] = useState(false)
  const [allergyText, setAllergyText] = useState(member.allergies || '')
  const [allergySaving, setAllergySaving] = useState(false)

  useEffect(() => { if (!editingAllergies) setAllergyText(member.allergies || '') }, [member.allergies])

  const initials = member.name.slice(0, 2).toUpperCase()
  const latestMeas = member.measurements?.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0]

  const computeAge = (dob) => {
    if (!dob) return null
    return Math.max(1, Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000)))
  }
  const memberAge = computeAge(member.date_of_birth)
  const bmr = latestMeas ? computeBMR(latestMeas.weight_kg, latestMeas.height_cm, memberAge, member.gender || 'male') : null
  const tdee = bmr ? Math.round(bmr * 1.2) : null

  const handleSaveEdit = async () => {
    setSaveError('')
    const { error } = await onUpdate(member.id, editForm)
    if (error) { setSaveError(error.message || 'Save failed'); return }
    setEditing(false)
  }

  const startEdit = (id, field, currentVal) => {
    setEditingCell({ id, field })
    const raw = currentVal ?? ''
    setEditValue(field === 'weight_kg'
      ? (isMetric ? Number(raw).toFixed(1) : Number(raw * 2.20462).toFixed(1))
      : (isMetric ? Number(raw).toFixed(1) : Number(raw / 2.54).toFixed(1))
    )
  }

  const saveCell = async (measId) => {
    const db = editValue === '' ? null : displayToDb(parseFloat(editValue), editingCell.field, isMetric)
    await updateMeasurement(measId, { [editingCell.field]: db })
    setEditingCell(null)
    setEditValue('')
  }

  const cellInput = (m, field) => {
    const isEditing = editingCell?.id === m.id && editingCell?.field === field
    const raw = m[field]
    if (isEditing) {
      return (
        <input
          type="number" step="0.1" autoFocus value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => saveCell(m.id)}
          onKeyDown={e => e.key === 'Enter' && saveCell(m.id)}
          style={{ width: '64px', border: '1px solid #2d6e2e', borderRadius: '4px', padding: '1px 4px', fontSize: '14px', outline: 'none', textAlign: 'right' }}
        />
      )
    }
    const formatted = dbToDisplay(raw, field, isMetric)
    return (
      <span onClick={() => startEdit(m.id, field, raw)} style={{ cursor: 'text', borderBottom: '1px dashed #e5e7eb' }}>
        {formatted}
      </span>
    )
  }

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#2d6e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <p style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937', margin: 0 }}>{member.name}</p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{member.is_primary ? 'You' : (member.gender || 'Family member')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setEditing(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '6px', borderRadius: '8px' }}>
            <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          {!member.is_primary && (
            <button onClick={() => window.confirm(`Delete ${member.name}?`) && onDelete(member.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '6px', borderRadius: '8px' }}>
              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Edit member form */}
      {editing && (
        <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Name</label>
            <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Date of Birth</label>
            <input type="date" value={editForm.date_of_birth} onChange={e => setEditForm(p => ({ ...p, date_of_birth: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Gender</label>
            <select value={editForm.gender} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          {saveError && <p style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '8px' }}>{saveError}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSaveEdit} style={{ background: '#2d6e2e', color: 'white', padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}>Save</button>
            <button onClick={() => { setEditing(false); setSaveError('') }} style={{ background: 'transparent', color: '#6b7280', padding: '9px 12px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Latest measurement summary */}
      {latestMeas && (
        <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', position: 'relative' }}>
          <button onClick={() => {
            setMeasForm({
              weight_kg: isMetric ? Number(latestMeas?.weight_kg).toFixed(1) : Number(latestMeas?.weight_kg * 2.20462).toFixed(1),
              height_cm: isMetric ? Number(latestMeas?.height_cm).toFixed(1) : Number(latestMeas?.height_cm / 2.54).toFixed(1),
            })
            setEditingMeasurements(true)
          }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px' }}>
            ✏️
          </button>
          {editingMeasurements ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', marginBottom: '12px' }}>
                {[
                  ['weight_kg', 'Weight', isMetric ? 'kg' : 'lbs'],
                  ['height_cm', 'Height', isMetric ? 'cm' : 'in'],
                ].map(([key, label, unit]) => (
                  <div key={key}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>{label} ({unit})</div>
                    <input type="number" value={measForm[key]}
                      onChange={e => setMeasForm(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #2d6e2e', borderRadius: '6px', padding: '6px 8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={async () => {
                  await updateMeasurement(latestMeas.id, {
                    weight_kg: displayToDb(parseFloat(measForm.weight_kg), 'weight_kg', isMetric),
                    height_cm: displayToDb(parseFloat(measForm.height_cm), 'height_cm', isMetric),
                  })
                  setEditingMeasurements(false)
                }} style={{ background: '#2d6e2e', color: 'white', padding: '7px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingMeasurements(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: bmr ? 10 : 0 }}>
                {[
                  ['Weight', dbToDisplay(latestMeas?.weight_kg, 'weight_kg', isMetric)],
                  ['Height', dbToDisplay(latestMeas?.height_cm, 'height_cm', isMetric)],
                ].map(([label, formatted]) => (
                  <div key={label}>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>{label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#2d6e2e' }}>{formatted}</div>
                  </div>
                ))}
              </div>
              {bmr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #bbf7d0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>BMR</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#2d6e2e' }}>{bmr}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>kcal/day at rest</span>
                  <span style={{ fontSize: '14px', color: '#9ca3af', marginLeft: 'auto' }}>TDEE: {tdee} kcal</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setShowMeasForm(v => !v)}
          style={{ background: '#2d6e2e', color: 'white', padding: '7px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
          + Log Measurement
        </button>
        {member.measurements?.length > 0 && (
          <button onClick={() => setShowHistory(v => !v)} style={{ padding: '7px 6px', fontSize: '14px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
            History ({member.measurements.length})
          </button>
        )}
      </div>

      {/* New measurement form */}
      {showMeasForm && (
        <MeasurementForm
          gender={member.gender}
          age={memberAge}
          unitsPreference={unitsPreference}
          onSave={async (payload) => {
            await addMeasurement(member.id, payload)
            setShowMeasForm(false)
          }}
          onCancel={() => setShowMeasForm(false)}
        />
      )}

      {/* Measurement history */}
      {showHistory && member.measurements?.length > 0 && (
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ color: '#9ca3af', borderBottom: '1px solid #f0f0f0' }}>
              <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Date</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Weight</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Height</th>
              <th style={{ paddingBottom: '4px', width: '16px' }} />
            </tr></thead>
            <tbody>
              {[...member.measurements].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)).map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px 0', color: '#6b7280' }}>{new Date(m.recorded_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right', color: '#374151', padding: '4px 0' }}>{cellInput(m, 'weight_kg')}</td>
                  <td style={{ textAlign: 'right', color: '#374151', padding: '4px 0' }}>{cellInput(m, 'height_cm')}</td>
                  <td style={{ padding: '4px 0 4px 8px', color: '#9ca3af' }}>
                    <svg style={{ width: '11px', height: '11px', display: 'block' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px' }}>Click any value to edit, then press Enter or click away to save.</p>
        </div>
      )}

      {/* Allergies panel */}
      <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Allergies & Intolerances</span>
          {!editingAllergies && (
            <button onClick={() => setEditingAllergies(true)}
              style={{ fontSize: '14px', color: '#2d6e2e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontWeight: 600 }}>
              Edit
            </button>
          )}
        </div>

        {editingAllergies ? (
          <div>
            <textarea
              value={allergyText}
              onChange={e => setAllergyText(e.target.value)}
              placeholder={'One allergy per line, e.g.:\npeanuts\ngluten\ndairy'}
              rows={4}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={async () => {
                  setAllergySaving(true)
                  await onUpdate(member.id, { allergies: allergyText })
                  setAllergySaving(false)
                  setEditingAllergies(false)
                }}
                disabled={allergySaving}
                style={{ background: '#2d6e2e', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', opacity: allergySaving ? 0.6 : 1 }}>
                {allergySaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditingAllergies(false); setAllergyText(member.allergies || '') }}
                style={{ background: 'transparent', color: '#6b7280', padding: '6px 10px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {allergyText?.trim() ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allergyText.split('\n').map(a => a.trim()).filter(Boolean).map(a => (
                  <span key={a} style={{ background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', borderRadius: 20, padding: '3px 10px', fontSize: '14px', fontWeight: 600 }}>
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>No allergies recorded. <button onClick={() => setEditingAllergies(true)} style={{ background: 'none', border: 'none', color: '#2d6e2e', cursor: 'pointer', fontSize: '14px', padding: 0, fontWeight: 600 }}>Add one</button></p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
