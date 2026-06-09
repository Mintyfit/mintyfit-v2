'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, Trash2, Plus } from 'lucide-react'
import RecipePickerModal from './RecipePickerModal'
import JournalEntryForm from './JournalEntryForm'
import DayStatsPanel from './DayStatsPanel'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']
const MEAL_LABEL = { breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch', snack2: 'Snack 2', dinner: 'Dinner' }
const MEAL_ICONS = { breakfast: '🌅', snack: '🍎', lunch: '☀️', snack2: '🍊', dinner: '🌙' }
const DOT_MEAL = '#2d6e2e'
const DOT_JOURNAL = '#6B7280'
const DOT_ACTIVITY = '#3B82F6'


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
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const getDay = (dateStr) => entries[dateStr] || {}
  const getMealCount = (dateStr) => MEAL_TYPES.reduce((s, mt) => s + (getDay(dateStr)[mt]?.length || 0), 0)
  const hasMeal = (dateStr) => MEAL_TYPES.some(mt => (getDay(dateStr)[mt]?.length || 0) > 0)
  const hasJournal = (dateStr) => {
    const day = getDay(dateStr)
    return MEAL_TYPES.some(mt => (day[mt] || []).some(e => e.journal_entries?.length > 0))
  }
  const hasActivity = (dateStr) => !!activities?.[dateStr] && Object.keys(activities[dateStr]).length > 0

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

  // Calendar grid
  const calDays = []
  for (let i = 0; i < firstDay; i++) calDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i)

  const focusDayData = focusDay ? getDay(focusDay) : null

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

  const MEAL_SHORT_MV = { breakfast: 'Brkfst', snack: 'Snack1', lunch: 'Lunch', snack2: 'Snack2', dinner: 'Dinner' }

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
    <div>
      {/* Day count + clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-3)' }}>
          <strong style={{ color: '#2d6e2e' }}>{selectedDays.size}</strong> day{selectedDays.size !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => { setSelectedDays(new Set()); setFocusDay(null) }}
          style={{ fontSize: 14, color: '#b91c1c', minHeight: 'auto', padding: '5px 10px', borderRadius: 6, backgroundColor: '#FEE2E2', border: 'none', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      <style>{`
        .mv-grid { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        @media (min-width: 860px) {
          .mv-grid { grid-template-columns: 1fr 280px; }
        }
      `}</style>

      <div className="mv-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Meal types card */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Meal Type
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MEAL_TYPES.map(mt => (
                <button key={mt} onClick={() => toggleMealFilter(mt)} style={chipStyle(mealFilter.has(mt))}
                  title={MEAL_LABEL[mt]}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>{MEAL_ICONS[mt]}</span>{MEAL_SHORT_MV[mt]}
                  </span>
                </button>
              ))}
            </div>
            {members.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
          </div>

          {/* Calendar */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ padding: 8, borderRadius: 10, backgroundColor: 'var(--bg-subtle)', minHeight: 'auto', border: 'none', cursor: 'pointer' }}>
                <ChevronLeft size={20} />
              </button>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{monthName}</h2>
              <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ padding: 8, borderRadius: 10, backgroundColor: 'var(--bg-subtle)', minHeight: 'auto', border: 'none', cursor: 'pointer' }}>
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
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 3 }}>
                      {hasMeal(dateStr) && <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : DOT_MEAL }} />}
                      {hasJournal(dateStr) && <div style={{ width: 5, height: 5, borderRadius: 2, backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : DOT_JOURNAL }} />}
                      {hasActivity(dateStr) && <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : DOT_ACTIVITY }} />}
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: DOT_MEAL, display: 'inline-block', flexShrink: 0 }} />
                meal
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: DOT_JOURNAL, display: 'inline-block', flexShrink: 0 }} />
                journal
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: DOT_ACTIVITY, display: 'inline-block', flexShrink: 0 }} />
                activity
              </span>
            </div>
          </div>

          {/* Day breakdown */}
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
                      <span>{MEAL_ICONS[mt]}</span>{MEAL_SHORT_MV[mt]}
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
        </div>

        {/* RIGHT: Nutrition only */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {focusDay && (
            <DayStatsPanel
              date={focusDay ? new Date(focusDay + 'T12:00:00') : new Date()}
              dateKey={focusDay || ''}
              entries={focusDayData || {}}
              activities={{}}
              members={members}
              enabledMealTypes={MEAL_TYPES}
              selectedMemberIds={new Set(members.map(m => m.id))}
            />
          )}
        </div>
      </div>
    </div>
  )
}
