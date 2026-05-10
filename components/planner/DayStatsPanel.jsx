'use client'

import Link from 'next/link'
import { calculateMacroPercentages } from '@/lib/nutrition/dailyTotals'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'
import { computeFamilyBMI } from '@/lib/nutrition/portionCalc'

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

/**
 * Sum what each member actually consumed today, using:
 *   contribution = recipe.totals × (member's BMI fraction of family) × activity factor
 * Only entries where the member is in `consumer_member_ids` count toward that
 * member. Falls back to legacy per-member rows when consumer_member_ids is null.
 */
function computeDayBreakdown(entries, activities, members) {
  const { familyWithBMI, totalBMI } = computeFamilyBMI(members)
  const bmiFraction = (memberId) => {
    const e = familyWithBMI.find(x => x.id === memberId)
    return (e && totalBMI > 0) ? e.bmi / totalBMI : 1 / (members.length || 1)
  }
  const activityFactor = (memberId) => {
    const acts = activities[memberId] || []
    const burned = acts.reduce((s, a) => s + (a.calories_burned || a.calories || 0), 0)
    const member = members.find(m => m.id === memberId)
    if (burned > 0 && member?.baseDailyCalories) {
      return 1 + burned / member.baseDailyCalories
    }
    return 1
  }

  const perMember = {}
  for (const m of members) perMember[m.id] = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

  for (const meal of MEAL_TYPES) {
    for (const entry of entries[meal] || []) {
      const totals = entry.recipes?.nutrition?.totals
        || (entry.recipes?.nutrition?.perServing && {
              ...entry.recipes.nutrition.perServing,
            })
      if (!totals) continue

      // Backwards compatible: legacy rows used member_id; new rows use consumer_member_ids
      const consumers = entry.consumer_member_ids
        || (entry.member_id ? [entry.member_id] : members.map(m => m.id))

      for (const memberId of consumers) {
        if (!perMember[memberId]) continue
        const scale = bmiFraction(memberId) * activityFactor(memberId)
        perMember[memberId].kcal    += (totals.energy_kcal || 0) * scale
        perMember[memberId].protein += (totals.protein || 0) * scale
        perMember[memberId].carbs   += (totals.carbs_total || 0) * scale
        perMember[memberId].fat     += (totals.fat_total || 0) * scale
      }
    }
  }

  return perMember
}

export default function DayStatsPanel({ date, dateKey, entries, activities, members, selectedMemberIds, onToggleMember }) {
  const breakdown = computeDayBreakdown(entries, activities, members)
  const isChecked = (id) => selectedMemberIds ? selectedMemberIds.has(id) : true

  // Top donut = sum across CHECKED members only
  const donutTotals = members.reduce(
    (acc, m) => {
      if (!isChecked(m.id)) return acc
      const b = breakdown[m.id] || {}
      acc.protein += b.protein || 0
      acc.carbs   += b.carbs   || 0
      acc.fat     += b.fat     || 0
      acc.kcal    += b.kcal    || 0
      return acc
    },
    { protein: 0, carbs: 0, fat: 0, kcal: 0 },
  )

  let activityCalories = 0
  for (const m of members) {
    if (!isChecked(m.id)) continue
    for (const a of (activities[m.id] || [])) {
      activityCalories += a.calories_burned || a.calories || 0
    }
  }
  const netCalories = Math.round(donutTotals.kcal - activityCalories)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 0.75rem' }}>
          Day overview
        </h3>
        <MacroDonut protein={donutTotals.protein} carbs={donutTotals.carbs} fat={donutTotals.fat} />
        {activityCalories > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.625rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', fontSize: '0.8125rem', color: '#4338ca', textAlign: 'center' }}>
            ⚡ {Math.round(activityCalories)} kcal burned · Net {netCalories} kcal
          </div>
        )}
      </div>

      {members.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 0.5rem' }}>
            Per member
          </h3>
          {onToggleMember && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-4)', margin: '0 0 0.625rem' }}>
              Tick the members who ate. Affects this day's totals and statistics.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {members.map(member => {
              const needs = computeMemberDailyNeeds(member)
              const baseTarget = needs?.energy_kcal || member.baseDailyCalories || member.daily_calories_target || 2000
              const memberActs = activities[member.id] || []
              const activityKcal = memberActs.reduce((s, a) => s + (a.calories_burned || a.calories || 0), 0)
              const target = baseTarget + activityKcal
              const consumed = Math.round(breakdown[member.id]?.kcal || 0)
              const ratio = target > 0 ? Math.min(1.2, consumed / target) : 0
              const checked = isChecked(member.id)
              return (
                <div key={member.id} style={{ opacity: checked ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0, cursor: onToggleMember ? 'pointer' : 'default' }}>
                      {onToggleMember && (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleMember(member.id)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                      )}
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.display_name || member.first_name || member.name || member.full_name || 'Member'}
                      </span>
                    </label>
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
              )
            })}
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
