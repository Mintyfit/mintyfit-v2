'use client'

import Link from 'next/link'
import { calculateMacroPercentages } from '@/lib/nutrition/dailyTotals'
import { getNutrientLossSummary, formatNutrientValue } from '@/lib/nutrition/activityNutrientLoss'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']
const MEAL_ICONS = { breakfast: '🌅', snack: '🍎', lunch: '☀️', snack2: '🍊', dinner: '🌙' }
const MEAL_LABELS = { breakfast: 'Breakfast', snack: 'Morning Snack', lunch: 'Lunch', snack2: 'Afternoon Snack', dinner: 'Dinner' }

// Macro Donut Chart Component
function MacroDonut({ protein, carbs, fat }) {
  const { proteinPct, carbsPct, fatPct } = calculateMacroPercentages(protein, carbs, fat)
  
  const r = 44
  const circ = 2 * Math.PI * r
  const pArc = proteinPct * circ
  const cArc = carbsPct * circ
  const fArc = fatPct * circ
  
  const totalCalories = Math.round(protein * 4 + carbs * 4 + fat * 9)
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width="120" height="120" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        {/* Protein - Green */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="12"
          strokeDasharray={`${pArc} ${circ}`} strokeDashoffset="0"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        {/* Carbs - Orange */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
          strokeDasharray={`${cArc} ${circ}`} strokeDashoffset={-pArc}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        {/* Fat - Indigo */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#6366f1" strokeWidth="12"
          strokeDasharray={`${fArc} ${circ}`} strokeDashoffset={-(pArc + cArc)}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        {/* Center text - calories */}
        <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text-1)">{totalCalories}</text>
        <text x="50" y="62" textAnchor="middle" fontSize="12" fill="var(--text-3)">kcal</text>
      </svg>
      
      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[
          { label: 'Protein', val: protein, color: '#10b981', cal: Math.round(protein * 4) },
          { label: 'Carbs', val: carbs, color: '#f59e0b', cal: Math.round(carbs * 4) },
          { label: 'Fat', val: fat, color: '#6366f1', cal: Math.round(fat * 9) },
        ].map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '15px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: m.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-2)', minWidth: 48 }}>{m.label}</span>
            <strong style={{ color: 'var(--text-1)', minWidth: 45 }}>{Math.round(m.val)}g</strong>
            <span style={{ color: 'var(--text-4)', fontSize: '13px' }}>({m.cal} kcal)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Meal Type Filter Checkbox
function MealTypeFilter({ mealType, enabled, onToggle, entryCount }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.5rem 0.75rem', borderRadius: '8px',
      background: enabled ? 'rgba(61,138,62,0.08)' : 'transparent',
      border: `1px solid ${enabled ? 'var(--primary)' : 'var(--border)'}`,
      cursor: 'pointer', fontSize: '15px', userSelect: 'none',
    }}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={() => onToggle(mealType)}
        style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
      />
      <span style={{ color: enabled ? 'var(--text-1)' : 'var(--text-3)' }}>
        {MEAL_ICONS[mealType]} {MEAL_LABELS[mealType]}
      </span>
      {entryCount > 0 && (
        <span style={{ color: 'var(--text-4)', fontSize: '13px' }}>({entryCount})</span>
      )}
    </label>
  )
}

export default function DayMacroBreakdown({
  date,
  dateKey,
  entries,
  activities,
  members,
  dailyTotals,
  enabledMealTypes,
  onToggleMealType,
}) {
  const { macros, calories, netCalories, activityCalories, activityNutrientLoss } = dailyTotals
  
  // Count entries per meal type
  const entryCounts = {}
  for (const mealType of MEAL_TYPES) {
    const mealEntries = entries[mealType] || []
    entryCounts[mealType] = mealEntries.filter(e => e.recipes || e.journal_entries).length
  }
  
  const dayLabel = date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
  
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '16px',
      padding: '1.25rem',
      border: '1px solid var(--border)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
          📊 {dayLabel} Macro Breakdown
        </h3>
        <Link
          href="/statistics"
          style={{
            fontSize: '15px', fontWeight: 600, color: 'var(--primary)',
            textDecoration: 'none', padding: '0.5rem 0.75rem',
            borderRadius: '8px', border: '1px solid var(--primary)',
            background: 'rgba(61,138,62,0.08)',
          }}
        >
          Go to Stats →
        </Link>
      </div>
      
      {/* Meal type filters */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.375rem',
        marginBottom: '1rem', paddingBottom: '1rem',
        borderBottom: '1px solid var(--border)',
      }}>
        {MEAL_TYPES.map(mt => (
          <MealTypeFilter
            key={mt}
            mealType={mt}
            enabled={enabledMealTypes.has(mt)}
            onToggle={onToggleMealType}
            entryCount={entryCounts[mt]}
          />
        ))}
      </div>
      
      {/* Macro donut chart */}
      <div style={{ marginBottom: '1.25rem' }}>
        <MacroDonut
          protein={macros.protein}
          carbs={macros.carbs}
          fat={macros.fat}
        />
      </div>
      
      {/* Calorie summary */}
      <div style={{
        background: 'var(--bg-page)',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '15px', color: 'var(--text-2)' }}>Total consumed</span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>{calories} kcal</span>
        </div>
        {activityCalories > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '15px', color: 'var(--text-2)' }}>Activity burned</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#6366f1' }}>−{activityCalories} kcal</span>
          </div>
        )}
        <div style={{
          height: 1, background: 'var(--border)', margin: '0.5rem 0',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '15px', color: 'var(--text-2)' }}>Net calories</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: netCalories >= 0 ? '#10b981' : '#ef4444' }}>
            {netCalories} kcal
          </span>
        </div>
      </div>
      
      {/* Activity nutrient expenditure */}
      {activityCalories > 0 && activityNutrientLoss && Object.keys(activityNutrientLoss).length > 0 && (
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.75rem' }}>
            ⚡ Nutrients depleted by activity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {getNutrientLossSummary(activityNutrientLoss)
              .slice(0, 8)
              .map(n => (
                <div key={n.key} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-page)',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '15px', color: 'var(--text-2)' }}>{n.label}</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#6366f1' }}>
                    {formatNutrientValue(n.value, n.unit)}
                  </span>
                </div>
              ))}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '0.75rem', fontStyle: 'italic', margin: 0 }}>
            Estimates based on average sweat rates; individual variation is significant.
          </p>
        </div>
      )}
    </div>
  )
}
