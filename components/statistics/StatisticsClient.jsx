'use client'

import { useMemo, useState } from 'react'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']

const NUTRIENT_GROUPS = [
  { title: 'Energy', keys: ['energy_kcal', 'energy_kj'] },
  { title: 'Macronutrients', keys: ['protein', 'carbs_total', 'carbs_absorbed', 'fiber'] },
  { title: 'Sugars', keys: ['sucrose', 'glucose', 'fructose', 'galactose'] },
  { title: 'Fats', keys: ['fat_total', 'fat_saturated', 'fat_monounsaturated', 'fat_polyunsaturated', 'fat_trans', 'fat_linoleic', 'fat_linolenic', 'cholesterol'] },
  { title: 'Minerals', keys: ['sodium', 'salt_equiv', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chrome'] },
  { title: 'Vitamins', keys: ['vit_a', 'vit_d', 'vit_e', 'vit_k', 'vit_b1', 'vit_b2', 'niacin', 'pantothenic_acid', 'vit_b6', 'biotin', 'folates', 'vit_b12', 'vit_c'] },
  { title: 'Other', keys: ['water', 'ash'] },
]

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function parseDate(value) {
  return new Date(`${value}T12:00:00`)
}

function ageFromDob(dob) {
  if (!dob) return null
  const birth = new Date(`${dob}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

function addNutrition(target, source, factor = 1) {
  if (!source) return
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      target[key] = (target[key] || 0) + value * factor
    }
  }
}

function getRange(period, customStart, customEnd) {
  const today = new Date()
  const end = toDateKey(today)

  if (period === 'today') return { from: end, to: end }
  if (period === '7d') {
    const fromDate = new Date(today)
    fromDate.setDate(today.getDate() - 6)
    return { from: toDateKey(fromDate), to: end }
  }
  if (period === '30d') {
    const fromDate = new Date(today)
    fromDate.setDate(today.getDate() - 29)
    return { from: toDateKey(fromDate), to: end }
  }
  if (period === 'month') {
    const fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: toDateKey(fromDate), to: end }
  }

  const from = customStart || end
  const to = customEnd || from
  return from <= to ? { from, to } : { from: to, to: from }
}

function pct(value, target) {
  if (!target || target <= 0) return null
  return (value / target) * 100
}

function computeTDEE(weight, height, age, gender) {
  if (!weight || !height || !age) return 2000
  const bmr = gender === 'female'
    ? (10 * weight + 6.25 * height - 5 * age - 161)
    : (10 * weight + 6.25 * height - 5 * age + 5)
  return Math.round(bmr * 1.2)
}

export default function StatisticsClient({ initialData, nutritionFields }) {
  const [period, setPeriod] = useState('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedMeals, setSelectedMeals] = useState(new Set(MEAL_TYPES))
  const [selectedMembers, setSelectedMembers] = useState(new Set())
  const [expandedGroups, setExpandedGroups] = useState(new Set(['Energy', 'Macronutrients']))

  const members = initialData?.members || []
  const calendarEntries = initialData?.calendarEntries || []
  const journalEntries = initialData?.journalEntries || []

  const { from, to } = useMemo(() => getRange(period, customStart, customEnd), [period, customStart, customEnd])

  const filteredMembers = useMemo(() => {
    if (selectedMembers.size === 0) return members
    return members.filter(m => selectedMembers.has(m.id))
  }, [members, selectedMembers])

  const memberCountForShared = Math.max(filteredMembers.length, 1)

  const dailyTargets = useMemo(() => {
    const target = {}

    for (const member of filteredMembers) {
      const weight = Number(member.weight) || 70
      const height = Number(member.height) || 170
      const age = ageFromDob(member.date_of_birth) || 30
      const gender = member.gender || 'female'
      const baseDailyCalories = computeTDEE(weight, height, age, gender) || 2000

      const needs = computeMemberDailyNeeds({
        weight,
        age,
        gender,
        baseDailyCalories,
      })

      addNutrition(target, needs)
    }

    if (filteredMembers.length === 0) {
      for (const field of nutritionFields) {
        if (field.rda) target[field.key] = field.rda
      }
    }

    return target
  }, [filteredMembers, nutritionFields])

  const normalizedRows = useMemo(() => {
    const rows = []

    for (const entry of calendarEntries) {
      const dateStr = entry.date_str
      if (!dateStr || dateStr < from || dateStr > to) continue
      if (!selectedMeals.has(entry.meal_type)) continue

      let nutrition = entry.personal_nutrition
      if (!nutrition || typeof nutrition !== 'object' || Object.keys(nutrition).length === 0) {
        nutrition = entry.recipes?.nutrition?.perServing || null
      }
      if (!nutrition) continue

      rows.push({
        source: 'calendar',
        date: dateStr,
        mealType: entry.meal_type,
        memberId: entry.member_id || null,
        label: entry.recipe_name || entry.recipes?.title || 'Recipe',
        nutrition,
      })
    }

    for (const entry of journalEntries) {
      const dateStr = entry.logged_date
      if (!dateStr || dateStr < from || dateStr > to) continue
      if (entry.meal_type && !selectedMeals.has(entry.meal_type)) continue
      if (!entry.nutrition || typeof entry.nutrition !== 'object') continue

      rows.push({
        source: 'journal',
        date: dateStr,
        mealType: entry.meal_type || 'snack',
        memberId: entry.member_id || null,
        label: entry.food_name || 'Journal entry',
        nutrition: entry.nutrition,
      })
    }

    return rows
  }, [calendarEntries, journalEntries, from, to, selectedMeals])

  const visibleRows = useMemo(() => {
    if (selectedMembers.size === 0) return normalizedRows

    return normalizedRows.filter(row => {
      if (row.memberId) return selectedMembers.has(row.memberId)
      return true
    })
  }, [normalizedRows, selectedMembers])

  const totals = useMemo(() => {
    const result = {}

    for (const row of visibleRows) {
      if (row.memberId) {
        addNutrition(result, row.nutrition)
      } else {
        addNutrition(result, row.nutrition, 1 / memberCountForShared)
      }
    }

    return result
  }, [visibleRows, memberCountForShared])

  const loggedDays = useMemo(() => {
    const s = new Set(visibleRows.map(r => r.date))
    return Math.max(s.size, 1)
  }, [visibleRows])

  const avg = useMemo(() => {
    const result = {}
    for (const key of Object.keys(totals)) result[key] = totals[key] / loggedDays
    return result
  }, [totals, loggedDays])

  const memberCards = useMemo(() => {
    return members.map(member => {
      const mTotals = {}

      for (const row of normalizedRows) {
        if (row.memberId === member.id) {
          addNutrition(mTotals, row.nutrition)
        } else if (!row.memberId) {
          addNutrition(mTotals, row.nutrition, 1 / Math.max(members.length, 1))
        }
      }

      const required = nutritionFields.filter(f => f.rda)
      const met = required.filter(f => {
        const memberTarget = dailyTargets[f.key] ? dailyTargets[f.key] / Math.max(filteredMembers.length, 1) : f.rda
        const value = (mTotals[f.key] || 0) / loggedDays
        return value >= memberTarget * 0.7
      }).length

      const completeness = required.length ? Math.round((met / required.length) * 100) : 0

      return {
        ...member,
        completeness,
        totals: mTotals,
      }
    })
  }, [members, normalizedRows, nutritionFields, dailyTargets, filteredMembers.length, loggedDays])

  const notable = useMemo(() => {
    const lows = []
    const highs = []

    for (const field of nutritionFields) {
      const target = dailyTargets[field.key] || field.rda
      if (!target) continue

      const value = avg[field.key] || 0
      const ratio = pct(value, target)
      if (ratio == null) continue

      if (ratio < 70) lows.push({ field, ratio, value, target })
      else if (ratio > 150) highs.push({ field, ratio, value, target })
    }

    lows.sort((a, b) => a.ratio - b.ratio)
    highs.sort((a, b) => b.ratio - a.ratio)

    return {
      lows: lows.slice(0, 5),
      highs: highs.slice(0, 5),
    }
  }, [nutritionFields, dailyTargets, avg])

  const rowsByDate = useMemo(() => {
    const map = new Map()

    for (const row of visibleRows) {
      if (!map.has(row.date)) map.set(row.date, [])
      map.get(row.date).push(row)
    }

    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [visibleRows])

  function toggleMeal(meal) {
    setSelectedMeals(prev => {
      const next = new Set(prev)
      if (next.has(meal)) next.delete(meal)
      else next.add(meal)
      return next.size ? next : new Set(MEAL_TYPES)
    })
  }

  function toggleMember(memberId) {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }

  function toggleGroup(title) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px 90px' }}>
      <h1 style={{ fontSize: 42, lineHeight: 1.1, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
        Nutrition Statistics
      </h1>
      <p style={{ color: 'var(--text-3)', fontSize: 18, marginBottom: 22 }}>
        Rebuilt for Next.js App Router with family analytics, day breakdowns, and nutrient insight.
      </p>

      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Time Range
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {[
            { key: 'today', label: 'Today' },
            { key: '7d', label: 'Last 7 days' },
            { key: '30d', label: 'Last 30 days' },
            { key: 'month', label: 'This month' },
            { key: 'custom', label: 'Custom' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setPeriod(item.key)}
              style={{
                border: '1px solid var(--border)',
                background: period === item.key ? 'var(--primary)' : 'var(--bg-subtle)',
                color: period === item.key ? '#fff' : 'var(--text-2)',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', background: 'var(--bg-page)', color: 'var(--text-1)' }} />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', background: 'var(--bg-page)', color: 'var(--text-1)' }} />
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-3)' }}>
          Active range: {from} to {to}
        </div>
      </section>

      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Meal Types
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MEAL_TYPES.map(meal => (
            <button
              key={meal}
              onClick={() => toggleMeal(meal)}
              style={{
                border: '1px solid var(--border)',
                background: selectedMeals.has(meal) ? '#1f6b2a' : 'var(--bg-subtle)',
                color: selectedMeals.has(meal) ? '#fff' : 'var(--text-2)',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {meal}
            </button>
          ))}
        </div>

        {members.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 14, marginBottom: 8 }}>
              Family Members
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  style={{
                    border: '1px solid var(--border)',
                    background: selectedMembers.has(member.id) ? '#153f4f' : 'var(--bg-subtle)',
                    color: selectedMembers.has(member.id) ? '#fff' : 'var(--text-2)',
                    borderRadius: 999,
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {member.name}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Avg Calories', value: Math.round(avg.energy_kcal || 0), unit: 'kcal/day', color: '#1f6b2a' },
          { label: 'Avg Protein', value: Math.round(avg.protein || 0), unit: 'g/day', color: '#2563eb' },
          { label: 'Avg Carbs', value: Math.round(avg.carbs_total || 0), unit: 'g/day', color: '#c2410c' },
          { label: 'Avg Fat', value: Math.round(avg.fat_total || 0), unit: 'g/day', color: '#be185d' },
          { label: 'Logged Days', value: loggedDays, unit: 'days', color: '#334155' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{card.unit}</div>
          </div>
        ))}
      </section>

      {memberCards.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>Family Completeness</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {memberCards.map(member => {
              const color = member.completeness >= 80 ? '#15803d' : member.completeness >= 60 ? '#b45309' : '#dc2626'
              return (
                <div key={member.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{member.name}</div>
                    <div style={{ fontWeight: 800, color }}>{member.completeness}%</div>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${member.completeness}%`, height: '100%', background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {(notable.lows.length > 0 || notable.highs.length > 0) && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 16 }}>
          {notable.lows.length > 0 && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 8 }}>Potentially Low</div>
              {notable.lows.map(item => (
                <div key={item.field.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#7f1d1d', marginBottom: 5 }}>
                  <span>{item.field.label}</span>
                  <span>{Math.round(item.ratio)}%</span>
                </div>
              ))}
            </div>
          )}

          {notable.highs.length > 0 && (
            <div style={{ background: '#fffbea', border: '1px solid #fde68a', borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, color: '#b45309', marginBottom: 8 }}>Potentially High</div>
              {notable.highs.map(item => (
                <div key={item.field.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#92400e', marginBottom: 5 }}>
                  <span>{item.field.label}</span>
                  <span>{Math.round(item.ratio)}%</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>Nutrient Breakdown</h2>

        {NUTRIENT_GROUPS.map(group => {
          const isOpen = expandedGroups.has(group.title)
          return (
            <div key={group.title} style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, marginTop: 10 }}>
              <button onClick={() => toggleGroup(group.title)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{group.title}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{isOpen ? 'Hide' : 'Show'}</span>
              </button>

              {isOpen && (
                <div style={{ marginTop: 8 }}>
                  {group.keys.map(key => {
                    const field = nutritionFields.find(f => f.key === key)
                    if (!field) return null

                    const value = avg[key] || 0
                    const target = dailyTargets[key] || field.rda
                    const ratio = pct(value, target)
                    const width = ratio == null ? 0 : Math.min(ratio, 100)
                    const color = ratio == null ? '#64748b' : ratio >= 80 ? '#15803d' : ratio >= 50 ? '#b45309' : '#dc2626'

                    return (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                          <span style={{ color: 'var(--text-2)' }}>{field.label}</span>
                          <span style={{ color: 'var(--text-3)' }}>
                            {value ? `${Math.round(value * 10) / 10} ${field.unit}` : '-'}
                            {ratio != null ? ` (${Math.round(ratio)}%)` : ''}
                          </span>
                        </div>
                        <div style={{ height: 7, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${width}%`, height: '100%', background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </section>

      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>Day Breakdown</h2>
        {rowsByDate.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>No entries in selected range.</p>
        ) : (
          rowsByDate.slice(0, 20).map(([date, rows]) => {
            const dayTotals = {}
            for (const row of rows) {
              if (row.memberId) addNutrition(dayTotals, row.nutrition)
              else addNutrition(dayTotals, row.nutrition, 1 / memberCountForShared)
            }

            return (
              <div key={date} style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{parseDate(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{Math.round(dayTotals.energy_kcal || 0)} kcal</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {rows.length} entries - {rows.map(r => r.label).slice(0, 3).join(', ')}{rows.length > 3 ? '...' : ''}
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
