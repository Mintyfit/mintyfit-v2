'use client'

import { toDateKey } from '@/lib/utils/dateKey'
import { MEAL_TYPES } from '@/lib/nutrition/mealBudget'

const MEAL_ICONS = { breakfast: '🌅', snack: '🍎', lunch: '☀️', snack2: '🍊', dinner: '🌙' }
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


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

export default function WeekOverview({ weekDates, entries, activities, members, today, dayEnabledMeals, onSelectDay, onDropRecipe, dragActive }) {
  const todayKey = toDateKey(today)

  return (
    <div className="week-overview-grid">
      <style>{`
        .week-overview-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }
        @media (max-width: 700px) {
          .week-overview-grid {
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
          }
          .week-overview-grid > button {
            padding: 6px 2px !important;
            border-radius: 8px !important;
            border-width: 1px !important;
            min-width: 0;
          }
          .week-overview-grid .wo-day-name { font-size: 0.5625rem !important; }
          .week-overview-grid .wo-day-num { font-size: 0.9375rem !important; }
          .week-overview-grid .wo-today { display: none !important; }
          .week-overview-grid .wo-kcal { display: none !important; }
          .week-overview-grid .wo-active { font-size: 0.5rem !important; }
          .week-overview-grid .wo-dots { gap: 2px !important; margin-bottom: 0 !important; }
          .week-overview-grid .wo-dots > span { width: 5px !important; height: 5px !important; }
        }
      `}</style>
      {weekDates.map((date, idx) => {
        const dk = toDateKey(date)
        const isToday = dk === todayKey
        const isPast = date < today && !isToday
        const dayEntries = entries[dk] || {}
        const dayActivities = activities[dk] || {}
        const totalCal = getDayCalories(dayEntries)
        const filledSlots = MEAL_TYPES.filter(m => (dayEntries[m]?.length || 0) > 0)
        const hasActivity = Object.keys(dayActivities).length > 0

        return (
          <button
            key={dk}
            onClick={() => onSelectDay(date)}
            onDragOver={dragActive ? e => e.preventDefault() : undefined}
            onDrop={dragActive && onDropRecipe ? e => { e.preventDefault(); onDropRecipe(date, dk) } : undefined}
            style={{
              background: isToday ? 'rgba(61,138,62,0.06)' : 'var(--bg-card)',
              border: `2px solid ${isToday ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '0.75rem 0.5rem',
              cursor: dragActive ? 'copy' : 'pointer',
              textAlign: 'left',
              transition: 'transform 0.1s, box-shadow 0.1s, border-color 0.1s',
              opacity: isPast ? 0.75 : 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = dragActive ? '0 0 0 3px rgba(61,138,62,0.35)' : '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Day header */}
            <div style={{ textAlign: 'center', marginBottom: '0.625rem' }}>
              <div className="wo-day-name" style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: isToday ? 'var(--primary)' : 'var(--text-3)', letterSpacing: '0.05em' }}>
                {DAY_NAMES[idx]}
              </div>
              <div className="wo-day-num" style={{ fontSize: '1.25rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--text-1)', lineHeight: 1.2 }}>
                {date.getDate()}
              </div>
              {isToday && <div className="wo-today" style={{ fontSize: '0.625rem', color: 'var(--primary)', fontWeight: 600 }}>TODAY</div>}
            </div>

            {/* Meal slot dots */}
            <div className="wo-dots" style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '0.375rem' }}>
              {MEAL_TYPES.map(m => {
                const enabled = (dayEnabledMeals?.[dk] || MEAL_TYPES).includes(m)
                return (
                  <span
                    key={m}
                    title={m}
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: (dayEntries[m]?.length || 0) > 0 ? 'var(--primary)' : 'var(--border)',
                      display: 'inline-block',
                      transition: 'background 0.2s',
                      opacity: enabled ? 1 : 0.25,
                    }}
                  />
                )
              })}
            </div>

            {/* Calorie badge */}
            {totalCal > 0 && (
              <div className="wo-kcal" style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
                🔥 {totalCal} kcal
              </div>
            )}

            {/* Activity badge */}
            {hasActivity && (
              <div className="wo-active" style={{ textAlign: 'center', fontSize: '0.6875rem', color: '#6366f1' }}>⚡ Active</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
