'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ACTIVITY_TYPES = [
  'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga',
  'Weight Training', 'HIIT', 'Pilates', 'Dancing', 'Sports',
  'Hiking', 'Stretching', 'Other',
]

// Rough MET-based calorie estimates per minute at 70kg
const MET_KCAL_PER_MIN = {
  'Walking': 4,
  'Running': 10,
  'Cycling': 8,
  'Swimming': 7,
  'Yoga': 3,
  'Weight Training': 5,
  'HIIT': 12,
  'Pilates': 4,
  'Dancing': 5,
  'Sports': 7,
  'Hiking': 6,
  'Stretching': 2,
  'Other': 4,
}

function estimateCalories(activityType, durationMinutes, weightKg) {
  const base = MET_KCAL_PER_MIN[activityType] || 4
  const weightFactor = (weightKg || 70) / 70
  return Math.round(base * durationMinutes * weightFactor)
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
      const weight = selectedMember?.weight_kg || 70
      setCaloriesBurned(String(estimateCalories(tpl.activity_type, tpl.duration_minutes, weight)))
    }
  }

  function handleDurationChange(val) {
    setDuration(val)
    if (val && activityType) {
      const weight = selectedMember?.weight_kg || 70
      setCaloriesBurned(String(estimateCalories(activityType, parseFloat(val), weight)))
    }
  }

  function handleActivityTypeChange(val) {
    setActivityType(val)
    if (duration && val) {
      const weight = selectedMember?.weight_kg || 70
      setCaloriesBurned(String(estimateCalories(val, parseFloat(duration), weight)))
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
                onChange={e => setMemberId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem' }}
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name || m.first_name}</option>
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
