'use client'

import { toDateKey } from '@/lib/utils/dateKey'
import { MEAL_TYPES, computeMealBudget } from '@/lib/nutrition/mealBudget'
import { extractJSON } from '@/lib/utils/extractJSON'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'
import { enrichMember } from '@/lib/member/enrichMember'
import { useSubscription } from '@/hooks/useSubscription'
import { Sparkles } from 'lucide-react'



const NUTRIENT_GROUPS = [
  { title: 'Energy', keys: ['energy_kcal', 'energy_kj'] },
  { title: 'Macronutrients', keys: ['protein', 'carbs_total', 'carbs_absorbed', 'fiber'] },
  { title: 'Sugars', keys: ['sucrose', 'glucose', 'fructose', 'galactose'] },
  { title: 'Fats', keys: ['fat_total', 'fat_saturated', 'fat_monounsaturated', 'fat_polyunsaturated', 'fat_trans', 'fat_linoleic', 'fat_linolenic', 'cholesterol'] },
  { title: 'Minerals', keys: ['sodium', 'salt_equiv', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chrome'] },
  { title: 'Vitamins', keys: ['vit_a', 'vit_d', 'vit_e', 'vit_k', 'vit_b1', 'vit_b2', 'niacin', 'pantothenic_acid', 'vit_b6', 'biotin', 'folates', 'vit_b12', 'vit_c'] },
  { title: 'Other', keys: ['water', 'ash'] },
]


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


// NOTE: member enrichment (BMR/TDEE, fallbacks) goes through
// lib/member/enrichMember — never re-implement it locally.

export default function StatisticsClient({ userId, initialData, nutritionFields }) {
  const { isPro } = useSubscription()
  const [period, setPeriod] = useState('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedMeals, setSelectedMeals] = useState(() => new Set(MEAL_TYPES))
  const [selectedMembers, setSelectedMembers] = useState(() => new Set())
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(['Energy', 'Macronutrients']))
  const [recipeCatalogue, setRecipeCatalogue] = useState(null) // lazy — loaded on first AI analysis
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  const members = initialData?.members || []
  const calendarEntries = initialData?.calendarEntries || []
  const journalEntries = initialData?.journalEntries || []

  const nutritionFieldByKey = useMemo(
    () => new Map(nutritionFields.map(f => [f.key, f])),
    [nutritionFields]
  )

  const recipeById = useMemo(
    () => new Map((recipeCatalogue || []).map(r => [r.id, r])),
    [recipeCatalogue]
  )

  const { from, to } = useMemo(() => getRange(period, customStart, customEnd), [period, customStart, customEnd])

  const filteredMembers = useMemo(() => {
    if (selectedMembers.size === 0) return members
    return members.filter(m => selectedMembers.has(m.id))
  }, [members, selectedMembers])

  const memberCountForShared = Math.max(filteredMembers.length, 1)

  const dailyTargets = useMemo(() => {
    const target = {}

    for (const member of filteredMembers) {
      // Shared enrichment (lib/member/enrichMember.js) — single source of
      // truth for baseDailyCalories and age/gender weight/height fallbacks.
      const enriched = enrichMember({ ...member, age: ageFromDob(member.date_of_birth) })

      const needs = computeMemberDailyNeeds({
        weight: enriched.weight,
        age: enriched.age,
        gender: enriched.gender,
        baseDailyCalories: enriched.baseDailyCalories,
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
        consumerMemberIds: entry.consumer_member_ids || null,
        recipeTotals: entry.recipes?.nutrition?.totals || null,
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
        // Legacy per-member row — assign directly
        addNutrition(result, row.nutrition)
      } else if (row.consumerMemberIds?.length) {
        // Pre-scaled personal_nutrition (totals × sum of BMI fractions) — use
        // directly. The value already reflects the eating members' combined share.
        addNutrition(result, row.nutrition)
      } else {
        // No consumer info — legacy fallback: divide by member count
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
          // Legacy per-member row — assign directly to this member
          addNutrition(mTotals, row.nutrition)
        } else if (row.consumerMemberIds?.includes(member.id)) {
          // Calorie-budgeted per-member share — the same model the planner
          // (computeMealBudgetDayBreakdown) uses, so /statistics and /plan agree.
          // Each member's share = their calorie-target share of the meal.
          if (row.recipeTotals) {
            const consumers = members.filter(m => row.consumerMemberIds.includes(m.id))
            const budget = computeMealBudget(consumers, row.recipeTotals, row.mealType, null, 3)
            const me = budget.eaters.find(e => e.member.id === member.id)
            if (me?.personNutrition) addNutrition(mTotals, me.personNutrition)
          } else {
            // No recipe totals (legacy / journal-style row): the stored
            // personal_nutrition is the combined share — split by calorie-target
            // share (NOT equally, which over-counts kids / under-counts adults).
            const consumers = members.filter(m => row.consumerMemberIds.includes(m.id))
            const totalTarget = consumers.reduce((s, m) => s + (m.baseDailyCalories || 2000), 0)
            const share = totalTarget > 0 ? (member.baseDailyCalories || 2000) / totalTarget : 1 / row.consumerMemberIds.length
            addNutrition(mTotals, row.nutrition, share)
          }
        } else if (!row.memberId && !row.consumerMemberIds?.length) {
          // Legacy row with no consumer info — split across all members
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
      if (!map.has(row.date)) map.set(row.date, { rows: [], totals: {} })
      const day = map.get(row.date)
      day.rows.push(row)
      if (row.memberId) addNutrition(day.totals, row.nutrition)
      else addNutrition(day.totals, row.nutrition, 1 / memberCountForShared)
    }

    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [visibleRows, memberCountForShared])

  async function runAnalysis() {
    setAnalysisLoading(true)
    setAnalysisError(null)
    setAnalysisResult(null)

    // Recipe catalogue is fetched lazily — it carries 47-nutrient JSONB per row
    // and is only needed when the user explicitly runs AI analysis.
    let catalogue = recipeCatalogue
    if (!catalogue) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase
          .from('recipes')
          .select('id, title, slug, image_url, image_thumb_url, nutrition, meal_type')
          .or(`is_public.eq.true,profile_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(50)
        catalogue = data || []
        setRecipeCatalogue(catalogue)
      } catch {
        catalogue = []
      }
    }

    const recipeList = (catalogue || []).slice(0, 50).map(r => {
      const n = r.nutrition?.perServing || {}
      return `${r.id}|${r.title}|${r.meal_type || 'any'}|` +
        `${Math.round(n.energy_kcal||0)}kcal|${Math.round(n.protein||0)}g prot|` +
        `${Math.round(n.carbs_total||0)}g carbs|${Math.round(n.fat_total||0)}g fat|` +
        `${Math.round(n.fiber||0)}g fiber|${Math.round((n.vit_d||0)*10)/10}µg VitD|` +
        `${Math.round(n.iron||0)}mg Fe|${Math.round(n.calcium||0)}mg Ca|` +
        `${Math.round(n.vit_c||0)}mg VitC`
    }).join('\n')

    const nutrientLines = nutritionFields
      .filter(f => (dailyTargets[f.key] || f.rda) && (avg[f.key] || 0) > 0)
      .map(f => {
        const target = dailyTargets[f.key] || f.rda
        const value = avg[f.key] || 0
        const pctVal = Math.round((value / target) * 100)
        return `${f.label}: ${Math.round(value * 10) / 10}${f.unit} (${pctVal}% of ${Math.round(target * 10) / 10}${f.unit} RDA)`
      }).join('\n')

    const memberInfo = filteredMembers.length > 0
      ? filteredMembers.map(m =>
          `${m.name}${m.date_of_birth ? `, age ${ageFromDob(m.date_of_birth)}` : ''}${m.gender ? `, ${m.gender}` : ''}`
        ).join('; ')
      : 'Not specified'

    try {
      const response = await fetch('/api/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-3-fast',
          max_tokens: 2500,
          purpose: 'insights',
          messages: [
            {
              role: 'system',
              content: `You are an expert nutritionist AI. Analyze dietary data and give evidence-based, practical recommendations. Always suggest specific recipes from the provided catalogue. Output valid JSON only — no markdown, no explanation outside JSON.`,
            },
            {
              role: 'user',
              content: `Analyze this dietary data and provide personalized nutrition recommendations.

PERIOD: ${loggedDays} days with logged food data
MEAL TYPES INCLUDED: ${Array.from(selectedMeals).join(', ')}
FAMILY MEMBERS: ${memberInfo}

AVERAGE DAILY NUTRIENT INTAKE:
${nutrientLines || 'No nutrient data available'}

AVAILABLE RECIPES IN CATALOGUE (id|title|mealType|kcal|protein|carbs|fat|fiber|VitD|Iron|Calcium|VitC):
${recipeList || 'No recipes in catalogue'}

Respond with ONLY this JSON structure:
{
  "summary": "2-3 sentence overall diet quality assessment mentioning standout positives and concerns",
  "score": 75,
  "deficiencies": [
    {"nutrient": "Vitamin D", "pct": 15, "advice": "Specific actionable advice", "foods": ["salmon", "egg yolks", "fortified milk"]}
  ],
  "excesses": [
    {"nutrient": "Sodium", "pct": 185, "advice": "Specific advice to reduce"}
  ],
  "recipeSuggestions": [
    {"id": "exact-recipe-uuid-from-list", "title": "Exact Recipe Title", "reason": "High in vitamin D and omega-3, addresses deficiency"}
  ],
  "generalAdvice": "2-3 sentence practical daily eating advice tailored to the specific gaps identified"
}

Rules:
- deficiencies: only nutrients below 70% RDA (sort by worst first, max 6)
- excesses: only nutrients above 150% RDA (max 4)
- recipeSuggestions: pick 3-5 recipes from the catalogue that best address the identified deficiencies; use exact IDs from the list
- score: 0-100 overall diet quality (consider variety, macro balance, micronutrient coverage)`,
            },
          ],
        }),
      })

      if (!response.ok) throw new Error(`API error ${response.status}`)
      const data = await response.json()
      setAnalysisResult(extractJSON(data.text || ''))
    } catch (err) {
      setAnalysisError(err.message)
    } finally {
      setAnalysisLoading(false)
    }
  }

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
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
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
                padding: '8px 16px',
                fontSize: 14,
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
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: 14 }} />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: 14 }} />
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-3)' }}>
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

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Avg Calories', value: Math.round(avg.energy_kcal || 0), unit: 'kcal/day', color: '#1f6b2a' },
          { label: 'Avg Protein', value: Math.round(avg.protein || 0), unit: 'g/day', color: '#2563eb' },
          { label: 'Avg Carbs', value: Math.round(avg.carbs_total || 0), unit: 'g/day', color: '#c2410c' },
          { label: 'Avg Fat', value: Math.round(avg.fat_total || 0), unit: 'g/day', color: '#be185d' },
          { label: 'Logged Days', value: loggedDays, unit: 'days', color: '#334155' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 10, fontWeight: 600 }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{card.unit}</div>
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

      {/* AI Analysis */}
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: analysisResult || analysisError ? 20 : 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>Nutrition Analysis</div>
            <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 3 }}>
              Identifies nutrient gaps and suggests recipes from your catalogue
            </div>
          </div>
          {isPro ? (
            <button
              onClick={runAnalysis}
              disabled={analysisLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                background: analysisLoading ? '#6b7280' : 'var(--primary)',
                color: 'white', border: 'none', borderRadius: 10,
                padding: '9px 16px', fontSize: 14, fontWeight: 600,
                cursor: analysisLoading ? 'default' : 'pointer',
              }}
            >
              <Sparkles size={14} />
              {analysisLoading ? 'Analysing…' : analysisResult ? 'Re-analyse' : 'Analyse'}
            </button>
          ) : (
            <div style={{
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '9px 14px', fontSize: 14, color: 'var(--text-3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>🔒</span> Premium feature — <Link href="/pricing" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Upgrade</Link>
            </div>
          )}
        </div>

        {analysisError && (
          <div style={{ background: '#FEF2F2', borderRadius: 8, padding: 12, fontSize: 14, color: '#DC2626' }}>
            Analysis failed: {analysisError}
          </div>
        )}

        {analysisLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[80, 100, 60].map((w, i) => (
              <div key={i} style={{ height: 14, borderRadius: 7, background: 'var(--bg-subtle)', width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {analysisResult && !analysisLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {analysisResult.score != null && (
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: '50%', border: '3px solid',
                    borderColor: analysisResult.score >= 70 ? 'var(--primary)' : analysisResult.score >= 50 ? '#b45309' : '#b91c1c',
                    background: analysisResult.score >= 70 ? '#f0fdf4' : analysisResult.score >= 50 ? '#FFFBEB' : '#FEF2F2',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: analysisResult.score >= 70 ? 'var(--primary)' : analysisResult.score >= 50 ? '#b45309' : '#b91c1c', lineHeight: 1 }}>
                      {analysisResult.score}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>Diet Score</div>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
                  {analysisResult.summary}
                </p>
              </div>
            )}

            {analysisResult.deficiencies?.length > 0 && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Nutrient Gaps</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analysisResult.deficiencies.map((d, i) => (
                    <div key={i} style={{ background: '#FEF2F2', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>{d.nutrient}</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{d.pct}% of RDA</span>
                      </div>
                      <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.55 }}>{d.advice}</p>
                      {d.foods?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {d.foods.map(f => (
                            <span key={f} style={{ background: '#FECACA', color: '#991B1B', padding: '2px 9px', borderRadius: 100, fontSize: 13, fontWeight: 500 }}>{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.excesses?.length > 0 && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#B45309', marginBottom: 8 }}>Consuming Too Much</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analysisResult.excesses.map((e, i) => (
                    <div key={i} style={{ background: '#FFFBEB', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#B45309' }}>{e.nutrient}</span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{e.pct}% of RDA</span>
                      </div>
                      <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.55 }}>{e.advice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.recipeSuggestions?.length > 0 && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                  Recommended Recipes From Your Catalogue
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analysisResult.recipeSuggestions.map((s, i) => {
                    const recipe = recipeById.get(s.id)
                    return (
                      <div key={i} style={{
                        background: '#F0FDF4', border: '1px solid #BBF7D0',
                        borderRadius: 10, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {(recipe?.image_thumb_url || recipe?.image_url) && (
                            <img src={recipe.image_thumb_url || recipe.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>{s.title}</div>
                            <div style={{ fontSize: 13, color: '#374151', marginTop: 2, lineHeight: 1.4 }}>{s.reason}</div>
                          </div>
                        </div>
                        {recipe?.nutrition?.perServing && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 13, color: 'var(--text-4)', flexWrap: 'wrap' }}>
                            <span>{Math.round(recipe.nutrition.perServing.energy_kcal || 0)} kcal</span>
                            <span>{Math.round(recipe.nutrition.perServing.protein || 0)}g protein</span>
                            <span>{Math.round(recipe.nutrition.perServing.fiber || 0)}g fiber</span>
                          </div>
                        )}
                        {recipe?.slug && (
                          <Link href={`/recipes/${recipe.slug}`} style={{
                            display: 'inline-block', marginTop: 8,
                            background: 'var(--primary)', color: 'white', border: 'none',
                            borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', textDecoration: 'none',
                          }}>
                            View Recipe →
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {analysisResult.generalAdvice && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#166534', marginBottom: 6 }}>Daily Advice</div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, margin: 0 }}>{analysisResult.generalAdvice}</p>
              </div>
            )}
          </div>
        )}
      </section>

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
                    const field = nutritionFieldByKey.get(key)
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
          rowsByDate.slice(0, 20).map(([date, { rows, totals: dayTotals }]) => {
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
