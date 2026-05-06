'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, Trash2, Plus } from 'lucide-react'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'
import { NUTRITION_FIELDS } from '@/lib/nutrition/nutrition'
import RecipePickerModal from './RecipePickerModal'
import JournalEntryForm from './JournalEntryForm'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']
const MEAL_LABEL = { breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch', snack2: 'Snack 2', dinner: 'Dinner' }
const MEAL_ICONS = { breakfast: '🌅', snack: '🍎', lunch: '☀️', snack2: '🍊', dinner: '🌙' }
const MEAL_DOT_COLORS = { breakfast: '#b91c1c', lunch: '#3B82F6', dinner: '#6d28d9', snack: '#10B981', snack2: '#10B981' }

const NUTRIENT_GROUPS = [
  { label: 'Energy',         color: '#5BB830', keys: ['energy_kcal', 'energy_kj'] },
  { label: 'Macronutrients', color: '#3B82F6', keys: ['protein', 'carbs_total', 'carbs_absorbed', 'fiber'] },
  { label: 'Sugars',         color: '#14B8A6', keys: ['sucrose', 'glucose', 'fructose'] },
  { label: 'Fats',           color: '#6B7280', keys: ['fat_total', 'fat_saturated', 'fat_monounsaturated', 'fat_polyunsaturated', 'fat_trans', 'fat_palmitic', 'fat_stearic', 'fat_linoleic', 'fat_linolenic', 'cholesterol'] },
  { label: 'Minerals',       color: '#6d28d9', keys: ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chrome', 'salt_equiv'] },
  { label: 'Vitamins',       color: '#EC4899', keys: ['vit_a', 'retinol', 'vit_d', 'vit_d3', 'vit_e', 'vit_k', 'vit_b1', 'vit_b2', 'niacin', 'niacin_tryptophan', 'pantothenic_acid', 'vit_b6', 'biotin', 'folates', 'vit_b12', 'vit_c'] },
  { label: 'Other',          color: '#6b7280', keys: ['water'] },
]

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay() }

export default function MonthView({ entries, activities, members, userId, onRefresh, onRemoveEntry }) {
  const today = new Date()
  const todayStr = formatDate(today)

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDays, setSelectedDays] = useState(new Set([todayStr]))
  const [focusDay, setFocusDay] = useState(todayStr)
  const [addingMeal, setAddingMeal] = useState(null)
  const [openJournal, setOpenJournal] = useState(null)
  const [mealFilter, setMealFilter] = useState(new Set(MEAL_TYPES))
  const [memberFilter, setMemberFilter] = useState(new Set())
  const [expandedGroups, setExpandedGroups] = useState(new Set(['Energy', 'Macronutrients']))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const getDay = (dateStr) => entries[dateStr] || {}
  const getMealCount = (dateStr) => MEAL_TYPES.reduce((s, mt) => s + (getDay(dateStr)[mt]?.length || 0), 0)
  const hasJournal = (dateStr) => {
    const day = getDay(dateStr)
    return MEAL_TYPES.some(mt => (day[mt] || []).some(e => e.journal_entries?.length > 0))
  }

  const toggleDay = (d) => {
    const dateStr = formatDate(new Date(year, month, d))
    const next = new Set(selectedDays)
    next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr)
    setSelectedDays(next)
    setFocusDay(dateStr)
    setAddingMeal(null)
  }

  const toggleMealFilter = (mt) => {
    const next = new Set(mealFilter)
    next.has(mt) ? next.delete(mt) : next.add(mt)
    setMealFilter(next)
  }

  const toggleMemberFilter = (id) => {
    const next = new Set(memberFilter)
    next.has(id) ? next.delete(id) : next.add(id)
    setMemberFilter(next)
  }

  const toggleGroup = (label) => {
    const next = new Set(expandedGroups)
    next.has(label) ? next.delete(label) : next.add(label)
    setExpandedGroups(next)
  }

  // Active members for filter / RDA calculation
  const selectedMembers = memberFilter.size > 0
    ? members.filter(m => memberFilter.has(m.id))
    : members

  // Summed personal daily needs across active members
  const summedNeeds = {}
  for (const m of selectedMembers) {
    const needs = computeMemberDailyNeeds(m)
    for (const [key, val] of Object.entries(needs)) {
      if (val == null) continue
      summedNeeds[key] = (summedNeeds[key] || 0) + val
    }
  }

  // Accumulate totals across selected days
  const totals = {}
  const filteredMemberIds = memberFilter.size > 0 ? memberFilter : null

  for (const dateStr of selectedDays) {
    const day = entries[dateStr]
    if (!day) continue

    for (const mt of MEAL_TYPES) {
      if (!mealFilter.has(mt)) continue

      for (const entry of (day[mt] || [])) {
        // Recipe nutrition
        if (entry.recipes?.nutrition?.perServing) {
          const fallback = entry.recipes.nutrition.perServing
          for (const field of NUTRITION_FIELDS) {
            const val = fallback[field.key]
            if (typeof val === 'number') {
              totals[field.key] = (totals[field.key] || 0) + val
            }
          }
        }
        // Journal entries
        if (entry.journal_entries) {
          for (const je of entry.journal_entries) {
            if (filteredMemberIds && je.member_id && !filteredMemberIds.has(je.member_id)) continue
            if (je.nutrition) {
              for (const field of NUTRITION_FIELDS) {
                const val = je.nutrition[field.key]
                if (typeof val === 'number') {
                  totals[field.key] = (totals[field.key] || 0) + val
                }
              }
            }
          }
        }
      }
    }
  }

  const numDays = Math.max(selectedDays.size, 1)
  const avgKcal    = Math.round((totals.energy_kcal  || 0) / numDays)
  const avgProtein = Math.round((totals.protein      || 0) / numDays)
  const avgCarbs   = Math.round((totals.carbs_total  || 0) / numDays)
  const avgFat     = Math.round((totals.fat_total    || 0) / numDays)

  // Calendar grid
  const calDays = []
  for (let i = 0; i < firstDay; i++) calDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i)

  const focusDayData = focusDay ? getDay(focusDay) : null
  const fieldMap = Object.fromEntries(NUTRITION_FIELDS.map(f => [f.key, f]))

  // Handlers
  const removeMealFromDay = async (dateStr, mealType, idx) => {
    const entry = focusDayData?.[mealType]?.[idx]
    if (entry?.id) {
      await onRemoveEntry(entry.id, dateStr)
    }
  }

  const addRecipeToDay = async (dateStr, mealType, recipe) => {
    const supabase = await import('@/lib/supabase/client').then(m => m.createClient())
    if (!supabase) return
    const { error } = await supabase.from('calendar_entries').insert({
      profile_id: userId,
      date_str: dateStr,
      meal_type: mealType,
      recipe_id: recipe.id,
      recipe_name: recipe.title || '',
    })
    if (!error) {
      setAddingMeal(null)
      onRefresh(dateStr)
    }
  }

  const chipStyle = (active) => ({
    padding: '7px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600,
    backgroundColor: active ? '#2d6e2e' : 'var(--bg-subtle)',
    color: active ? '#fff' : 'var(--text-3)',
    border: '1px solid var(--border)', minHeight: 38, cursor: 'pointer',
  })

  const memberChipStyle = (active) => ({
    padding: '7px 14px', borderRadius: 20, fontSize: 14, fontWeight: 600,
    backgroundColor: active ? '#1A3D1B' : 'var(--bg-subtle)',
    color: active ? '#fff' : 'var(--text-2)',
    border: '1px solid var(--border)', minHeight: 38, cursor: 'pointer',
  })

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 16px 80px' }}>
      {/* Filter bar */}
      <div style={{
        backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '14px 16px',
        marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* Meal types */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Meal Type
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {MEAL_TYPES.map(mt => (
              <button key={mt} onClick={() => toggleMealFilter(mt)} style={chipStyle(mealFilter.has(mt))}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12 }}>{MEAL_ICONS[mt]}</span>{MEAL_LABEL[mt]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Members */}
        {members.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Family Members
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {members.map(m => {
                const active = memberFilter.has(m.id)
                const tdee = m.baseDailyCalories || 2000
                return (
                  <button key={m.id} onClick={() => toggleMemberFilter(m.id)} style={memberChipStyle(active)}
                    title={`TDEE: ${tdee} kcal/day`}>
                    {m.name || m.display_name || m.first_name}
                    {active && <span style={{ opacity: 0.7, fontSize: 12 }}> {tdee} kcal</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-3)' }}>
            <strong style={{ color: '#2d6e2e' }}>{selectedDays.size}</strong> day{selectedDays.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { setSelectedDays(new Set()); setFocusDay(null) }}
            style={{ fontSize: 14, color: '#b91c1c', minHeight: 'auto', padding: '5px 10px', borderRadius: 6, backgroundColor: '#FEE2E2' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* LEFT: Calendar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ padding: 8, borderRadius: 10, backgroundColor: 'var(--bg-subtle)', minHeight: 'auto' }}>
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{monthName}</h2>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ padding: 8, borderRadius: 10, backgroundColor: 'var(--bg-subtle)', minHeight: 'auto' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text-4)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {calDays.map((d, i) => {
              if (!d) return <div key={i} />
              const dateStr = formatDate(new Date(year, month, d))
              const isToday    = dateStr === todayStr
              const isSelected = selectedDays.has(dateStr)
              const isFocus    = dateStr === focusDay
              const dayData    = getDay(dateStr)
              return (
                <button key={i} onClick={() => toggleDay(d)} style={{
                  aspectRatio: '1', borderRadius: 10,
                  backgroundColor: isSelected ? '#2d6e2e' : isToday ? 'rgba(61,138,62,0.08)' : 'var(--bg-card)',
                  border: isFocus ? '2px solid #1A3D1B' : isToday ? '2px solid #2d6e2e' : '1px solid var(--border-light)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'flex-start', padding: '6px 4px', cursor: 'pointer', minHeight: 'auto',
                }}>
                  <span style={{ fontSize: 14, fontWeight: isToday || isSelected ? 800 : 400, color: isSelected ? '#fff' : isToday ? '#2d6e2e' : 'var(--text-2)' }}>{d}</span>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                    {MEAL_TYPES.map(mt => dayData[mt]?.length > 0
                      ? <div key={mt} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : MEAL_DOT_COLORS[mt] }} />
                      : null
                    )}
                    {hasJournal(dateStr) && <div style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : '#6B7280' }} />}
                  </div>
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-4)', textAlign: 'center' }}>
            Click days to toggle selection
          </div>
          {/* Dot legend */}
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {MEAL_TYPES.map(mt => (
              <span key={mt} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: MEAL_DOT_COLORS[mt], display: 'inline-block', flexShrink: 0 }} />
                {MEAL_LABEL[mt]}
              </span>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: '#6B7280', display: 'inline-block', flexShrink: 0 }} />
              journal
            </span>
          </div>
        </div>

        {/* RIGHT: Day detail + Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Day detail */}
          {focusDay && (
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  {new Date(focusDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => { setFocusDay(null); setSelectedDays(prev => { const n = new Set(prev); n.delete(focusDay); return n }); }}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: 'var(--bg-subtle)', minHeight: 'auto' }}
                >
                  <X size={16} />
                </button>
              </div>

              {MEAL_TYPES.map(mt => (
                <div key={mt} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{MEAL_ICONS[mt]}</span>{MEAL_LABEL[mt]}
                    </span>
                    <button onClick={() => setAddingMeal(addingMeal === mt ? null : mt)} style={{ fontSize: 14, padding: '5px 12px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)', fontWeight: 600, minHeight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {addingMeal === mt && (
                    <RecipePickerModal
                      mealType={mt}
                      userId={userId}
                      onSelect={(recipe) => addRecipeToDay(focusDay, mt, recipe)}
                      onClose={() => setAddingMeal(null)}
                    />
                  )}

                  {(focusDayData?.[mt] || []).length === 0
                    ? <div style={{ fontSize: 14, color: 'var(--text-4)', padding: '4px 0' }}>No meals planned</div>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(focusDayData[mt] || []).map((item, idx) => {
                          const recipe = item.recipes
                          const slug = recipe?.slug || recipe?.id
                          const kcal = recipe?.nutrition?.perServing?.energy_kcal
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(61,138,62,0.05)', borderRadius: 10, padding: '8px 12px' }}>
                              <Link
                                href={`/recipes/${slug}?date=${focusDay}&meal=${mt}`}
                                style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, minHeight: 'auto', color: 'var(--text-2)', textDecoration: 'none' }}
                              >
                                {item.recipe_name || recipe?.title}
                              </Link>
                              {kcal && <span style={{ fontSize: 14, color: 'var(--text-3)', marginRight: 8 }}>{Math.round(kcal)} kcal</span>}
                              <button onClick={() => removeMealFromDay(focusDay, mt, idx)} style={{ color: '#b91c1c', padding: 4, minHeight: 'auto' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </div>
              ))}

              {/* Journal entries */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700 }}>Food Journal</h4>
                  <button
                    onClick={() => setOpenJournal('breakfast')}
                    style={{ fontSize: 13, padding: '5px 12px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)', fontWeight: 600, minHeight: 'auto' }}
                  >
                    + Add
                  </button>
                </div>
                {MEAL_TYPES.flatMap(mt => (focusDayData?.[mt] || []).filter(e => e.journal_entries).flatMap(e => e.journal_entries.map(je => ({ ...je, mealType: mt }))))
                  .map((entry, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-muted)', borderRadius: 10, padding: '10px 12px', marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {entry.food_name}
                          {entry.amount && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · {entry.amount} {entry.unit}</span>}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-4)', display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                          {entry.nutrition ? (
                            <span style={{ color: '#2d6e2e', fontStyle: 'italic' }}>
                              {Math.round(entry.nutrition.energy_kcal || 0)} kcal
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>No nutrition data</span>
                          )}
                          {entry.mealType && <span style={{ textTransform: 'capitalize', color: '#2d6e2e', fontWeight: 600 }}>{entry.mealType}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                {openJournal && (
                  <JournalEntryForm
                    mealType={openJournal}
                    dateKey={focusDay}
                    userId={userId}
                    members={members}
                    onSave={() => { setOpenJournal(null); onRefresh(focusDay) }}
                    onClose={() => setOpenJournal(null)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Nutrition Stats */}
          {selectedDays.size > 0 && (
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Nutrition Stats</h3>
                <div style={{ fontSize: 14, color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <span>{selectedDays.size} day{selectedDays.size !== 1 ? 's' : ''}{selectedDays.size > 1 ? ' · daily avg' : ''}</span>
                  {selectedMembers.length > 0 && (
                    <span style={{ backgroundColor: '#1A3D1B', color: '#fff', borderRadius: 10, padding: '3px 10px', fontSize: 14, fontWeight: 600 }}>
                      {selectedMembers.map(m => m.name || m.display_name || m.first_name).join(' + ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
                {[
                  { label: selectedDays.size > 1 ? 'Avg kcal' : 'Calories', value: avgKcal,    unit: 'kcal', color: '#2d6e2e', icon: '🔥' },
                  { label: selectedDays.size > 1 ? 'Avg Protein' : 'Protein', value: avgProtein, unit: 'g',    color: '#3B82F6', icon: '💪' },
                  { label: selectedDays.size > 1 ? 'Avg Carbs' : 'Carbs',   value: avgCarbs,   unit: 'g',    color: '#3B82F6', icon: '🌾' },
                  { label: selectedDays.size > 1 ? 'Avg Fat' : 'Fat',       value: avgFat,     unit: 'g',    color: '#2d6e2e', icon: '🫒' },
                ].map(card => (
                  <div key={card.label} style={{ backgroundColor: 'var(--bg-muted)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{card.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{card.value}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{card.unit}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Full nutrient bars */}
              {NUTRIENT_GROUPS.map(group => {
                const groupFields = group.keys.map(k => fieldMap[k]).filter(f => f && totals[f.key] != null)
                if (groupFields.length === 0) return null
                const isExpanded = expandedGroups.has(group.label)
                return (
                  <div key={group.label} style={{ marginBottom: 12 }}>
                    <button onClick={() => toggleGroup(group.label)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', minHeight: 'auto', borderBottom: `2px solid ${group.color}30` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: group.color }}>{group.label}</span>
                      <span style={{ fontSize: 14, color: 'var(--text-4)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </button>
                    {isExpanded && (
                      <div style={{ paddingTop: 10, paddingBottom: 4 }}>
                        {groupFields.map(field => {
                          const avg = (totals[field.key] || 0) / numDays
                          const rda = summedNeeds[field.key] || field.rda
                          const pct = rda ? Math.min((avg / rda) * 100, 100) : null
                          const displayVal = avg >= 10 ? Math.round(avg) : Math.round(avg * 10) / 10
                          return (
                            <div key={field.key} style={{ marginBottom: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{field.label}</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                  <span style={{ fontSize: 14, fontWeight: 700 }}>{displayVal} {field.unit}</span>
                                  {pct != null && <span style={{ fontSize: 14, color: 'var(--text-4)' }}>{Math.round(pct)}% RDA</span>}
                                </div>
                              </div>
                              {pct != null && (
                                <div style={{ position: 'relative', height: 8 }}>
                                  <div style={{ position: 'absolute', inset: 0, borderRadius: 4, overflow: 'hidden', backgroundColor: 'var(--bg-green-tint)' }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,#ef9a9a 0%,#ff8a65 18%,#ffa726 36%,#ffee58 52%,#9ccc65 70%,#43a047 100%)' }} />
                                  </div>
                                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `calc(${pct}% - 0.5px)`, width: 1, height: 15, backgroundColor: 'rgba(0,0,0,0.4)', boxShadow: '-1px 0 0 rgba(255,255,255,0.9), 1px 0 0 rgba(255,255,255,0.9)' }} />
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
      </div>
    </div>
  )
}
