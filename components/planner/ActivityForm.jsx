'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeBMR } from '@/lib/nutrition/portionCalc'

const ACTIVITY_TYPES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga',
  'Weight Training', 'HIIT', 'Pilates', 'Dancing', 'Sports',
  'Hiking', 'Stretching', 'Other',
]

// Standard MET values (Compendium of Physical Activities, moderate intensity)
const MET_VALUES = {
  'Walking': 3.5,
  'Running': 9.8,
  'Cycling': 7.5,
  'Swimming': 6.0,
  'Yoga': 2.5,
  'Weight Training': 5.0,
  'HIIT': 10.0,
  'Pilates': 3.0,
  'Dancing': 4.8,
  'Sports': 7.0,
  'Hiking': 6.0,
  'Stretching': 2.3,
  'Other': 3.5,
}

// Estimate a sensible body weight when the member has none on file, so
// kids/teens still get personalized numbers instead of the 70 kg default.
function estimateWeightKg(member) {
  const w = Number(member?.weight)
  if (w && w > 2) return w
  const age = Number(member?.age) || 30
  const male = String(member?.gender || '').toLowerCase() === 'male'
  if (age < 1) return 7
  if (age < 3) return 12
  if (age < 6) return 18
  if (age < 10) return 28
  if (age < 14) return 45
  if (age < 18) return male ? 62 : 55
  return male ? 75 : 62
}

// Personalized calorie burn using the member's own BMR (which encodes
// weight, height, age and sex via Mifflin–St Jeor). 1 MET ≈ resting energy,
// so kcal/min ≈ MET × (BMR / 1440). Falls back to weight-scaled MET formula
// when BMR can't be computed (e.g. adult with no height on file).
function estimateCalories(activityType, durationMinutes, member) {
  const met = MET_VALUES[activityType] ?? 3.5
  const minutes = Number(durationMinutes) || 0
  if (!minutes) return 0

  const bmr = member ? computeBMR(member.weight, member.height, member.age, member.gender) : null
  if (bmr && bmr > 0) {
    return Math.round((met * bmr / 1440) * minutes)
  }

  const weightKg = estimateWeightKg(member)
  return Math.round((met * 3.5 * weightKg / 200) * minutes)
}

export default function ActivityForm({ dateKey, userId, members, onSave, onClose }) {
  const [memberId, setMemberId] = useState(members[0]?.id || '')
  const [activityType, setActivityType] = useState('Walking')
  const [duration, setDuration] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedMember = members.find(m => m.id === memberId) || members[0]

  // Build default template chips from member's activity profiles for this day of week
  const dayOfWeek = new Date(dateKey + 'T12:00:00').getDay() // 0=Sun … 6=Sat
  const defaultTemplates = (selectedMember?.activityProfiles || []).filter(p =>
    p.day_of_week === dayOfWeek || p.day_of_week == null
  )

  function applyTemplate(tpl) {
    handleActivityTypeChange(tpl.activity_type || 'Walking')
    const dur = String(tpl.duration_minutes || 30)
    setDuration(dur)
    if (tpl.activity_type && tpl.duration_minutes) {
      setCaloriesBurned(String(estimateCalories(tpl.activity_type, tpl.duration_minutes, selectedMember)))
    }
  }

  function handleDurationChange(val) {
    setDuration(val)
    if (val && activityType) {
      setCaloriesBurned(String(estimateCalories(activityType, parseFloat(val), selectedMember)))
    }
  }

  function handleActivityTypeChange(val) {
    setActivityType(val)
    if (duration && val) {
      setCaloriesBurned(String(estimateCalories(val, parseFloat(duration), selectedMember)))
    }
  }

  async function handleSave() {
    if (!activityType || !duration) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      if (!supabase) return
      await supabase.from('daily_activities').insert({
        profile_id: userId,
        member_id: memberId || null,
        date: dateKey,
        activity_type: activityType,
        duration_minutes: parseFloat(duration),
        calories_burned: caloriesBurned ? parseFloat(caloriesBurned) : null,
        logged_at: new Date().toISOString(),
      })
      onSave()
    } catch {
      setError('Could not save activity. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', maxHeight: '80vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>Log activity</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-3)' }}>×</button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Default templates for today */}
          {defaultTemplates.length > 0 && (
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>
                📋 Today's usual
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {defaultTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => applyTemplate(tpl)}
                    style={{ padding: '0.375rem 0.875rem', borderRadius: '20px', border: '1.5px solid var(--primary)', background: 'rgba(61,138,62,0.08)', color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {tpl.activity_type || 'Activity'} {tpl.duration_minutes ? `· ${tpl.duration_minutes} min` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Member selector */}
          {members.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.375rem' }}>For</label>
              <select
                value={memberId}
                onChange={e => {
                  const newId = e.target.value
                  setMemberId(newId)
                  if (duration && activityType) {
                    const newMember = members.find(m => m.id === newId) || members[0]
                    setCaloriesBurned(String(estimateCalories(activityType, parseFloat(duration), newMember)))
                  }
                }}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem' }}
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name || m.first_name || m.name || m.full_name || 'Member'}</option>
                ))}
              </select>
            </div>
          )}

          {/* Activity type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Activity</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {ACTIVITY_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => handleActivityTypeChange(type)}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '20px', border: `1.5px solid ${activityType === type ? 'var(--primary)' : 'var(--border)'}`,
                    background: activityType === type ? 'rgba(61,138,62,0.1)' : 'transparent',
                    color: activityType === type ? 'var(--primary)' : 'var(--text-2)',
                    fontSize: '0.8125rem', fontWeight: activityType === type ? 600 : 400, cursor: 'pointer',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.375rem' }}>Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={e => handleDurationChange(e.target.value)}
              placeholder="e.g. 30"
              min="1"
              max="480"
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none' }}
            />
          </div>

          {/* Calories burned */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.375rem' }}>
              Calories burned
              <span style={{ fontWeight: 400, color: 'var(--text-4)', marginLeft: '0.375rem' }}>(auto-estimated, adjust if needed)</span>
            </label>
            <input
              type="number"
              value={caloriesBurned}
              onChange={e => setCaloriesBurned(e.target.value)}
              placeholder="kcal"
              min="0"
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none' }}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading || !activityType || !duration}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading || !activityType || !duration ? 0.7 : 1, fontSize: '0.9375rem' }}
          >
            {loading ? 'Saving…' : '⚡ Save activity'}
          </button>
        </div>
      </div>
    </div>
  )
}
