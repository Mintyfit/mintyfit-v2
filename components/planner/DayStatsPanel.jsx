'use client'

import Link from 'next/link'
import { calculateDailyTotals, calculateMacroPercentages } from '@/lib/nutrition/dailyTotals'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']

function MacroDonut({ protein, carbs, fat }) {
  const { proteinPct, carbsPct, fatPct } = calculateMacroPercentages(protein, carbs, fat)
  const r = 44
  const circ = 2 * Math.PI * r
  const pArc = proteinPct * circ
  const cArc = carbsPct * circ
  const fArc = fatPct * circ
  const total = Math.round(protein * 4 + carbs * 4 + fat * 9)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <svg width="140" height="140" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        {total > 0 && <>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="12"
            strokeDasharray={`${pArc} ${circ}`} strokeDashoffset="0"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="12"
            strokeDasharray={`${cArc} ${circ}`} strokeDashoffset={-pArc}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#6366f1" strokeWidth="12"
            strokeDasharray={`${fArc} ${circ}`} strokeDashoffset={-(pArc + cArc)}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
        </>}
        <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text-1)">{total}</text>
        <text x="50" y="62" textAnchor="middle" fontSize="11" fill="var(--text-3)">kcal</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
        {[
          { label: 'Protein', val: protein, color: '#10b981' },
          { label: 'Carbs',   val: carbs,   color: '#f59e0b' },
          { label: 'Fat',     val: fat,     color: '#6366f1' },
        ].map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: m.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-2)', flex: 1 }}>{m.label}</span>
            <strong style={{ color: 'var(--text-1)' }}>{Math.round(m.val)}g</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DayStatsPanel({ date, dateKey, entries, activities, members }) {
  const totals = calculateDailyTotals(entries, activities, members)
  const { protein, carbs, fat } = totals.macros

  const memberSummaries = members.map(member => {
    const needs = computeMemberDailyNeeds(member)
    const baseTarget = needs?.energy_kcal || member.daily_calories_target || 2000
    const memberActs = activities[member.id] || []
    const activityKcal = memberActs.reduce((s, a) => s + (a.calories_burned || a.calories || 0), 0)
    const target = baseTarget + activityKcal
    let consumed = 0
    for (const mealType of MEAL_TYPES) {
      for (const entry of entries[mealType] || []) {
        const kcal = entry.recipes?.nutrition?.perServing?.energy_kcal || 0
        if (!entry.member_id || entry.member_id === member.id) {
          consumed += kcal / Math.max(1, members.length)
        }
        for (const je of entry.journal_entries || []) {
          if (!je.member_id || je.member_id === member.id) {
            consumed += je.nutrition?.energy_kcal || 0
          }
        }
      }
    }
    const ratio = target > 0 ? Math.min(1.2, consumed / target) : 0
    return { member, target, consumed: Math.round(consumed), activityKcal, ratio }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 0.75rem' }}>
          Day overview
        </h3>
        <MacroDonut protein={protein} carbs={carbs} fat={fat} />
        {totals.activityCalories > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.625rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', fontSize: '0.8125rem', color: '#4338ca', textAlign: 'center' }}>
            ⚡ {totals.activityCalories} kcal burned · Net {totals.netCalories} kcal
          </div>
        )}
      </div>

      {memberSummaries.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 0.75rem' }}>
            Per member
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {memberSummaries.map(({ member, target, consumed, activityKcal, ratio }) => (
              <div key={member.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    {member.display_name || member.first_name || member.name || 'Member'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {consumed} / {Math.round(target)}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-page)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, ratio * 100)}%`, height: '100%',
                    background: ratio >= 0.95 ? '#10b981' : ratio >= 0.6 ? '#f59e0b' : '#9ca3af',
                    transition: 'width 0.3s',
                  }} />
                </div>
                {activityKcal > 0 && (
                  <div style={{ fontSize: '0.6875rem', color: '#6366f1', marginTop: 2 }}>+{activityKcal} kcal active</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/statistics?date=${dateKey}`}
        style={{
          display: 'block', textAlign: 'center',
          padding: '0.625rem 1rem', borderRadius: '10px',
          background: 'var(--primary)', color: '#fff',
          fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
        }}
      >
        See full statistics →
      </Link>
    </div>
  )
}
