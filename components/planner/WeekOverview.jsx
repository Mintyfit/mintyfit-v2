'use client'

import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']
const MEAL_ICONS = { breakfast: '🌅', snack: '🍎', lunch: '☀️', snack2: '🍊', dinner: '🌙' }
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateKey(date) {
  return date.toISOString().split('T')[0]
}

// Calculate total consumed calories for a day's entries across all members
function getDayCalories(dayEntries) {
  let total = 0
  for (const mealType of MEAL_TYPES) {
    for (const entry of dayEntries[mealType] || []) {
      const kcal = entry.recipes?.nutrition?.perServing?.energy_kcal || 0
      total += kcal
    }
  }
  return Math.round(total)
}

// Nutrition completeness ring — ratio 0–1
function NutritionRing({ ratio, size = 32, color = 'var(--primary)' }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const arc = Math.min(1, Math.max(0, ratio)) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-page)" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={ratio >= 0.8 ? '#10b981' : ratio >= 0.5 ? '#f59e0b' : color}
        strokeWidth="5"
        strokeDasharray={`${arc} ${circ}`}
        strokeDashoffset="0"
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      />
    </svg>
  )
}

export default function WeekOverview({ weekDates, entries, activities, members, today, onSelectDay }) {
  const todayKey = toDateKey(today)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '0.5rem',
    }}>
      {weekDates.map((date, idx) => {
        const dk = toDateKey(date)
        const isToday = dk === todayKey
        const isPast = date < today && !isToday
        const dayEntries = entries[dk] || {}
        const dayActivities = activities[dk] || {}
        const totalCal = getDayCalories(dayEntries)
        const filledSlots = MEAL_TYPES.filter(m => (dayEntries[m]?.length || 0) > 0)
        const hasActivity = Object.keys(dayActivities).length > 0

        // Per-member nutrition completeness
        const memberRatios = members.slice(0, 3).map(member => {
          const needs = computeMemberDailyNeeds(member)
          const target = needs?.energy_kcal || member.daily_calories_target || 2000
          // Sum calories attributed to this member across the day
          let consumed = 0
          for (const mealType of MEAL_TYPES) {
            for (const entry of dayEntries[mealType] || []) {
              const kcal = entry.recipes?.nutrition?.perServing?.energy_kcal || 0
              // If entry has member_id, only count if matches
              if (!entry.member_id || entry.member_id === member.id) {
                consumed += kcal / Math.max(1, members.length)
              }
            }
          }
          return { member, ratio: target > 0 ? consumed / target : 0 }
        })

        return (
          <button
            key={dk}
            onClick={() => onSelectDay(date)}
            style={{
              background: isToday ? 'rgba(61,138,62,0.06)' : 'var(--bg-card)',
              border: `2px solid ${isToday ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '0.75rem 0.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.1s, box-shadow 0.1s',
              opacity: isPast ? 0.75 : 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Day header */}
            <div style={{ textAlign: 'center', marginBottom: '0.625rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: isToday ? 'var(--primary)' : 'var(--text-3)', letterSpacing: '0.05em' }}>
                {DAY_NAMES[idx]}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--text-1)', lineHeight: 1.2 }}>
                {date.getDate()}
              </div>
              {isToday && <div style={{ fontSize: '0.625rem', color: 'var(--primary)', fontWeight: 600 }}>TODAY</div>}
            </div>

            {/* Member nutrition rings */}
            {memberRatios.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '0.5rem' }}>
                {memberRatios.map(({ member, ratio }) => (
                  <NutritionRing key={member.id} ratio={ratio} size={28} />
                ))}
              </div>
            )}

            {/* Meal slot dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '0.375rem' }}>
              {MEAL_TYPES.map(m => (
                <span
                  key={m}
                  title={m}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: (dayEntries[m]?.length || 0) > 0 ? 'var(--primary)' : 'var(--border)',
                    display: 'inline-block',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>

            {/* Calorie badge */}
            {totalCal > 0 && (
              <div style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
                🔥 {totalCal} kcal
              </div>
            )}

            {/* Activity badge */}
            {hasActivity && (
              <div style={{ textAlign: 'center', fontSize: '0.6875rem', color: '#6366f1' }}>⚡ Active</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
