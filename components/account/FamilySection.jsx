'use client'

import { useState } from 'react'
import MemberCard from './MemberCard'

export default function FamilySection({ members, loading, addMember, updateMember, deleteMember, addMeasurement, updateMeasurement, unitsPreference = 'metric' }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', gender: '', date_of_birth: '' })
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!newMember.name.trim()) return
    setSaving(true)
    await addMember(newMember)
    setNewMember({ name: '', gender: '', date_of_birth: '' })
    setShowAdd(false)
    setSaving(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>Loading family members…</div>

  return (
    <div style={{ padding: '0' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 2px' }}>Family Members</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Track measurements for everyone in your household.</p>
      </div>

      {/* Members grid */}
      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
          <svg style={{ width: '48px', height: '48px', color: '#d1d5db', display: 'block', margin: '0 auto 12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p style={{ fontSize: '14px' }}>No family members yet. Add one to start tracking!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map(m => (
            <MemberCard key={m.id} member={m} onUpdate={updateMember} onDelete={deleteMember} addMeasurement={addMeasurement} updateMeasurement={updateMeasurement} unitsPreference={unitsPreference} />
          ))}
        </div>
      )}

      {/* Add member form */}
      {showAdd && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '20px', marginTop: 16 }}>
          <h3 style={{ fontWeight: '600', color: '#15803d', marginBottom: '12px', fontSize: '14px' }}>New Family Member</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Name *</label>
              <input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} placeholder="Name" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Gender</label>
              <select value={newMember.gender} onChange={e => setNewMember(p => ({ ...p, gender: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Date of Birth</label>
              <input type="date" value={newMember.date_of_birth} onChange={e => setNewMember(p => ({ ...p, date_of_birth: e.target.value }))}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 16 }}>
            <button onClick={handleAdd} disabled={saving || !newMember.name.trim()}
              style={{ background: '#2d6e2e', color: 'white', padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', opacity: (saving || !newMember.name.trim()) ? 0.6 : 1 }}>
              {saving ? 'Adding…' : 'Add Member'}
            </button>
            <button onClick={() => setShowAdd(false)}
              style={{ background: 'transparent', color: '#6b7280', padding: '8px 20px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Member button */}
      <button
        onClick={() => setShowAdd(v => !v)}
        style={{ marginTop: 16, width: '100%', background: '#2d6e2e', color: 'white', padding: '10px 0', borderRadius: '12px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        {showAdd ? 'Cancel' : 'Add Member'}
      </button>
    </div>
  )
}
