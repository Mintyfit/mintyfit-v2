'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { calculateMacroPercentages } from '@/lib/nutrition/dailyTotals'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'
import { computeFamilyBMI } from '@/lib/nutrition/portionCalc'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']

const NUTRIENT_GROUPS = [
  { label: 'Energy',         color: '#5BB830', keys: ['energy_kcal', 'energy_kj'] },
  { label: 'Macronutrients', color: '#3B82F6', keys: ['protein', 'carbs_total', 'carbs_absorbed', 'fiber'] },
  { label: 'Sugars',         color: '#14B8A6', keys: ['sucrose', 'glucose', 'fructose'] },
  { label: 'Fats',           color: '#6B7280', keys: ['fat_total', 'fat_saturated', 'fat_monounsaturated', 'fat_polyunsaturated', 'fat_trans', 'fat_palmitic', 'fat_stearic', 'fat_linoleic', 'fat_linolenic', 'cholesterol'] },
  { label: 'Minerals',       color: '#6d28d9', keys: ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chrome', 'salt_equiv'] },
  { label: 'Vitamins',       color: '#EC4899', keys: ['vit_a', 'retinol', 'vit_d', 'vit_d3', 'vit_e', 'vit_k', 'vit_b1', 'vit_b2', 'niacin', 'niacin_tryptophan', 'pantothenic_acid', 'vit_b6', 'biotin', 'folates', 'vit_b12', 'vit_c'] },
  { label: 'Other',          color: '#6b7280', keys: ['water'] },
]

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
 * Sum what each member actually consumed today.
 *
 * Each member's contribution = recipe.totals × their BMI fraction × activity
 * factor. Uses RAW recipe totals (from joined recipes table) so per-member
 * values are independent — unchecking a member removes only THEIR share,
 * others stay the same (matches single recipe view behavior).
 *
 * personal_nutrition is a fallback for legacy rows without recipe join data.
 */
function computeDayBreakdown(entries, activities, members, enabledMealTypes) {
  const meals = enabledMealTypes && enabledMealTypes.length ? enabledMealTypes : MEAL_TYPES
  const { familyWithBMI, totalBMI } = computeFamilyBMI(members)
  const bmiFraction = (memberId) => {
    const e = familyWithBMI.find(x => x.id === memberId)
    const n = members.length || 1
    if (e && totalBMI > 0) {
      const nBmi = familyWithBMI.length
      if (nBmi === n) return e.bmi / totalBMI
      return (e.bmi / totalBMI) * (nBmi / n)
    }
    return 1 / n
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
      // Per-member scaling uses RAW recipe totals (from joined recipes table)
      // so each member's contribution = totals_raw × bmiFraction — independent
      // of which other members are checked (same behavior as single recipe view).
      // personal_nutrition (pre-scaled at write time) is a fallback for legacy
      // rows where the recipe join is missing.
      const rawTotals = entry.recipes?.nutrition?.totals
        || (entry.recipes?.nutrition?.perServing && {
              ...entry.recipes.nutrition.perServing,
            })
        || entry.personal_nutrition
      if (!rawTotals) continue

      const consumers = entry.consumer_member_ids
        || (entry.member_id ? [entry.member_id] : members.map(m => m.id))

      for (const memberId of consumers) {
        if (!perMember[memberId]) continue
        const scale = bmiFraction(memberId) * activityFactor(memberId)
        perMember[memberId].kcal    += (rawTotals.energy_kcal || 0) * scale
        perMember[memberId].protein += (rawTotals.protein || 0) * scale
        perMember[memberId].carbs   += (rawTotals.carbs_total || 0) * scale
        perMember[memberId].fat     += (rawTotals.fat_total || 0) * scale
      }
    }
  }

  return perMember
}

export default function DayStatsPanel({ date, dateKey, entries, activities, members, enabledMealTypes, selectedMemberIds, onToggleMember }) {
  const breakdown = computeDayBreakdown(entries, activities, members, enabledMealTypes)
  const isChecked = (id) => selectedMemberIds ? selectedMemberIds.has(id) : true
  const mealCount = (enabledMealTypes && enabledMealTypes.length) || MEAL_TYPES.length

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
  const [showAllNutrients, setShowAllNutrients] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(new Set(['Energy', 'Macronutrients']))

  // Daily nutrition totals across all 47 nutrients for checked members
  const dayNutrition = useMemo(() => {
    const meals = enabledMealTypes && enabledMealTypes.length ? enabledMealTypes : MEAL_TYPES
    const { familyWithBMI, totalBMI } = computeFamilyBMI(members)
    const bmi = (id) => {
      const e = familyWithBMI.find(x => x.id === id)
      const n = members.length || 1
      if (e && totalBMI > 0) {
        const nBmi = familyWithBMI.length
        if (nBmi === n) return e.bmi / totalBMI
        return (e.bmi / totalBMI) * (nBmi / n)
      }
      return 1 / n
    }
    const act = (id) => {
      const acts = activities[id] || []
      const burned = acts.reduce((s, a) => s + (a.calories_burned || a.calories || 0), 0)
      const m = members.find(x => x.id === id)
      if (burned > 0 && m?.baseDailyCalories) return 1 + burned / m.baseDailyCalories
      return 1
    }

    const consumed = {}
    const targets = {}

    for (const m of members) {
      if (!isChecked(m.id)) continue
      const needs = computeMemberDailyNeeds(m)
      if (!needs) continue
      for (const [k, v] of Object.entries(needs)) {
        if (typeof v === 'number') targets[k] = (targets[k] || 0) + v
      }
    }

  for (const meal of meals) {
      for (const entry of entries[meal] || []) {
        const rawTotals = entry.recipes?.nutrition?.totals
          || entry.personal_nutrition
        if (!rawTotals) continue
        const consumers = entry.consumer_member_ids
          || (entry.member_id ? [entry.member_id] : members.map(m => m.id))
        for (const memberId of consumers) {
          if (!isChecked(memberId)) continue
          const scale = bmi(memberId) * act(memberId)
          for (const [k, v] of Object.entries(rawTotals)) {
            if (typeof v === 'number') consumed[k] = (consumed[k] || 0) + v * scale
          }
        }
      }
    }

    return { consumed, targets }
  }, [entries, members, activities, selectedMemberIds])

  const KEY_KEYS = ['energy_kcal', 'protein', 'carbs_total', 'fat_total', 'fiber']
  const keyFields = NUTRITION_FIELDS.filter(f => KEY_KEYS.includes(f.key))
  const allNutrientFields = NUTRITION_FIELDS.filter(f => f.rda && f.key !== 'energy_kj' && dayNutrition.consumed[f.key] != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 0.75rem' }}>
          Day overview
        </h3>
        <MacroDonut protein={donutTotals.protein} carbs={donutTotals.carbs} fat={donutTotals.fat} />
        {activityCalories > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.625rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', fontSize: '0.8125rem', color: '#4338ca', textAlign: 'center' }}>
            {Math.round(activityCalories)} kcal burned - Net {netCalories} kcal
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

      {/* Day nutrition breakdown */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Nutrition & % of daily needs
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showAllNutrients ? 12 : 0 }}>
          {keyFields.map(f => {
            const val = dayNutrition.consumed[f.key] || 0
            const rawTarget = dayNutrition.targets[f.key] || f.rda
            const target = mealCount > 0 ? rawTarget / mealCount : rawTarget
            if (!target) return null
            const pct = target ? Math.min(100, (val / target) * 100) : null
            const barColor = pct == null ? '#9ca3af'
              : pct >= 80 ? '#10B981'
              : pct >= 50 ? '#f59e0b'
              : '#9ca3af'
            return (
              <div key={f.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'baseline', gap: 4 }}>
                  <span style={{ color: 'var(--text-3, #666)' }}>{f.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-1, #111)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {val < 1 && val > 0 ? val.toFixed(2) : Math.round(val * 10) / 10}{' '}{f.unit}
                    {target && (
                      <span style={{ color: '#bbb', fontWeight: 400, fontSize: 11 }}>
                        {' '}· {Math.round((val / target) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                {pct != null && (
                  <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', flex: 1, marginTop: 2 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button
          onClick={() => setShowAllNutrients(v => !v)}
          style={{
            width: '100%', padding: '0.5rem 0', marginTop: 4,
            background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
            fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)',
          }}
        >
          {showAllNutrients ? '▲ Show less' : `▼ All ${allNutrientFields.length} nutrients`}
        </button>
        {showAllNutrients && (
          <div style={{ marginTop: 8 }}>
            {NUTRIENT_GROUPS.map(group => {
              const groupFields = group.keys
                .map(k => NUTRITION_FIELDS.find(f => f.key === k))
                .filter(f => f && dayNutrition.consumed[f.key] != null)
              if (groupFields.length === 0) return null
              const isExpanded = expandedGroups.has(group.label)
              return (
                <div key={group.label} style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => {
                      const next = new Set(expandedGroups)
                      if (next.has(group.label)) next.delete(group.label)
                      else next.add(group.label)
                      setExpandedGroups(next)
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', borderBottom: `2px solid ${group.color}30`, fontSize: 13, fontWeight: 700, color: group.color }}
                  >
                    <span>{group.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div style={{ paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {groupFields.map(f => {
                        const val = dayNutrition.consumed[f.key] || 0
                        const rawTarget = dayNutrition.targets[f.key] || f.rda
                        const target = mealCount > 0 ? rawTarget / mealCount : rawTarget
                        if (!target) return null
                        const pct = target ? Math.min(100, (val / target) * 100) : null
                        const barColor = pct == null ? '#9ca3af'
                          : pct >= 80 ? '#10B981'
                          : pct >= 50 ? '#f59e0b'
                          : '#9ca3af'
                        return (
                          <div key={f.key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'baseline', gap: 4 }}>
                              <span style={{ color: 'var(--text-3, #666)' }}>{f.label}</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-1, #111)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                {val < 1 && val > 0 ? val.toFixed(2) : Math.round(val * 10) / 10}{' '}{f.unit}
                                {target && (
                                  <span style={{ color: '#bbb', fontWeight: 400, fontSize: 10 }}>
                                    {' '}· {Math.round((val / target) * 100)}%
                                  </span>
                                )}
                              </span>
                            </div>
                            {pct != null && (
                              <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', flex: 1, marginTop: 2 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Link
        href={`/statistics?date=${dateKey}`}
        style={{
          display: 'block', textAlign: 'center',
          padding: '0.625rem 1rem', borderRadius: '10px',
          background: 'var(--primary)', color: '#fff',
          fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
        }}
      >
        See full statistics -
      </Link>
    </div>
  )
}
