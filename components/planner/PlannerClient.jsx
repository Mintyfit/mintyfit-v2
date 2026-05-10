'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { computeMemberNutrition } from '@/lib/nutrition/portionCalc'
import WeekOverview from './WeekOverview'
import DayAgenda from './DayAgenda'
import DayStatsPanel from './DayStatsPanel'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']
const MEAL_LABELS = { breakfast: 'Breakfast', snack: 'Morning Snack', lunch: 'Lunch', snack2: 'Afternoon Snack', dinner: 'Dinner' }
const MEAL_ICONS = {
  breakfast: '/icons/meals/morning.svg',
  snack: '/icons/meals/snack.svg',
  lunch: '/icons/meals/lunch.svg',
  snack2: '/icons/meals/snack.svg',
  dinner: '/icons/meals/evening.svg',
}

function getWeekDates(anchorDate) {
  const d = new Date(anchorDate)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date
  })
}

function toDateKey(date) {
  return date.toISOString().split('T')[0]
}

export default function PlannerClient({ userId, profile, members }) {
  const [today] = useState(() => new Date())
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [entries, setEntries] = useState({})
  const [activities, setActivities] = useState({})
  const [loading, setLoading] = useState(false)
  const touchStartX = useRef(null)

  // Recipe sidebar (column 1) — always rendered, always populated
  const [sidebarRecipes, setSidebarRecipes] = useState([])
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [sidebarLoading, setSidebarLoading] = useState(true)
  const draggedRecipe = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [dropTarget, setDropTarget] = useState(null)
  const [addingToMeal, setAddingToMeal] = useState(false)

  // Pending recipe from /recipes/[slug] "Add to Plan" button
  const [pendingRecipe, setPendingRecipe] = useState(null)

  // Which family members the next added recipe should be planned for.
  // Defaults to everyone; user can uncheck members in the right-column panel.
  const [selectedMemberIds, setSelectedMemberIds] = useState(() => new Set(members.map(m => m.id)))
  useEffect(() => {
    setSelectedMemberIds(new Set(members.map(m => m.id)))
  }, [members])
  const activeMembers = members.filter(m => selectedMemberIds.has(m.id))

  const anchorDate = new Date(today)
  anchorDate.setDate(today.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(anchorDate)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  const weekLabel = (() => {
    const ms = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const me = weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${ms} – ${me}`
  })()

  // Read pending recipe handed off from /recipes page
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('mintyfit:pendingPlanRecipe')
      if (raw) setPendingRecipe(JSON.parse(raw))
    } catch {}
  }, [])

  // Load week's calendar entries + activities
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    if (!supabase) return
    const startKey = toDateKey(weekStart)
    const endKey = toDateKey(weekEnd)
    setLoading(true)
    supabase
      .from('calendar_entries')
      .select(`
        id, date_str, meal_type, member_id,
        recipes(id, title, slug, image_url, nutrition, servings)
      `)
      .eq('profile_id', userId)
      .gte('date_str', startKey)
      .lte('date_str', endKey)
      .then(({ data }) => {
        const map = {}
        for (const entry of data || []) {
          if (!map[entry.date_str]) map[entry.date_str] = {}
          if (!map[entry.date_str][entry.meal_type]) map[entry.date_str][entry.meal_type] = []
          map[entry.date_str][entry.meal_type].push(entry)
        }
        setEntries(map)
        setLoading(false)
      })
    supabase
      .from('daily_activities')
      .select('*')
      .eq('profile_id', userId)
      .gte('date_str', startKey)
      .lte('date_str', endKey)
      .then(({ data }) => {
        const actMap = {}
        for (const act of data || []) {
          if (!actMap[act.date_str]) actMap[act.date_str] = {}
          if (!actMap[act.date_str][act.member_id]) actMap[act.date_str][act.member_id] = []
          actMap[act.date_str][act.member_id].push(act)
        }
        setActivities(actMap)
      })
  }, [userId, weekOffset])

  // Sidebar recipes — load on mount and on search change
  useEffect(() => {
    if (!userId) return
    setSidebarLoading(true)
    const supabase = createClient()
    if (!supabase) { setSidebarLoading(false); return }
    const query = supabase
      .from('recipes')
      .select('id, title, slug, image_url, nutrition, meal_type')
      .or(`is_public.eq.true,profile_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(40)
    if (sidebarSearch.trim()) query.ilike('title', `%${sidebarSearch.trim()}%`)
    query.then(({ data }) => {
      setSidebarRecipes(data || [])
      setSidebarLoading(false)
    })
  }, [sidebarSearch, userId])

  // Drag-and-drop helpers
  function handleDropRecipe(date, dateKey) {
    if (!draggedRecipe.current) return
    const recipe = draggedRecipe.current
    // If the recipe knows its meal type, save directly — no picker.
    if (MEAL_TYPES.includes(recipe.meal_type)) {
      saveRecipeToDay(recipe, dateKey, recipe.meal_type).then(() => {
        draggedRecipe.current = null
        setDragActive(false)
      })
      return
    }
    setDropTarget({ date, dateKey })
  }

  async function saveRecipeToDay(recipe, dateKey, mealType) {
    setAddingToMeal(true)
    const supabase = createClient()
    if (!supabase) { setAddingToMeal(false); return }
    const recipeTotals = recipe.nutrition?.totals || null
    let rows
    if (activeMembers.length > 0 && recipeTotals) {
      rows = activeMembers.map(member => ({
        profile_id: userId,
        date_str: dateKey,
        meal_type: mealType,
        recipe_id: recipe.id,
        recipe_name: recipe.title || '',
        member_id: member.id,
        personal_nutrition: computeMemberNutrition(member, members, recipeTotals, {}),
      }))
    } else {
      rows = [{
        profile_id: userId,
        date_str: dateKey,
        meal_type: mealType,
        recipe_id: recipe.id,
        recipe_name: recipe.title || '',
        member_id: null,
        personal_nutrition: recipe.nutrition?.perServing || null,
      }]
    }
    const { error } = await supabase.from('calendar_entries').upsert(rows, {
      onConflict: 'profile_id,date_str,meal_type,recipe_id,member_id',
    })
    if (error) console.error('calendar upsert failed:', error)
    await refreshDay(dateKey)
    setAddingToMeal(false)
  }

  async function handleMealSlotPick(mealType) {
    if (!dropTarget || !draggedRecipe.current) return
    await saveRecipeToDay(draggedRecipe.current, dropTarget.dateKey, mealType)
    setDropTarget(null)
    draggedRecipe.current = null
    setDragActive(false)
  }

  // Add the pendingRecipe (from recipe page "Add to plan") to the clicked day
  async function placePendingRecipeOnDay(date, dateKey) {
    if (!pendingRecipe) return
    let recipe = {
      id: pendingRecipe.recipe_id,
      title: pendingRecipe.title,
      meal_type: pendingRecipe.meal_type,
      nutrition: null,
    }
    const supabase = createClient()
    if (supabase) {
      const { data } = await supabase
        .from('recipes')
        .select('id, title, slug, image_url, nutrition, meal_type')
        .eq('id', pendingRecipe.recipe_id)
        .maybeSingle()
      if (data) recipe = data
    }
    const mealType = MEAL_TYPES.includes(recipe.meal_type) ? recipe.meal_type : (pendingRecipe.meal_type || 'dinner')
    if (MEAL_TYPES.includes(mealType)) {
      await saveRecipeToDay(recipe, dateKey, mealType)
      clearPendingRecipe()
      return
    }
    draggedRecipe.current = recipe
    setDropTarget({ date, dateKey, fromPending: true })
  }

  function clearPendingRecipe() {
    setPendingRecipe(null)
    try { sessionStorage.removeItem('mintyfit:pendingPlanRecipe') } catch {}
  }

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 50) setWeekOffset(o => o + (diff < 0 ? 1 : -1))
    touchStartX.current = null
  }

  function selectDay(date) {
    setSelectedDate(date)
  }

  const refreshDay = useCallback(async (dateKey) => {
    const supabase = createClient()
    if (!supabase || !userId) return
    const { data } = await supabase
      .from('calendar_entries')
      .select(`
        id, date_str, meal_type, member_id,
        recipes(id, title, slug, image_url, nutrition, servings)
      `)
      .eq('profile_id', userId)
      .eq('date_str', dateKey)
    const mealMap = {}
    for (const entry of data || []) {
      if (!mealMap[entry.meal_type]) mealMap[entry.meal_type] = []
      mealMap[entry.meal_type].push(entry)
    }
    setEntries(prev => ({ ...prev, [dateKey]: mealMap }))

    // also refresh activities for this day
    const { data: actData } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('profile_id', userId)
      .eq('date_str', dateKey)
    const actMap = {}
    for (const act of actData || []) {
      if (!actMap[act.member_id]) actMap[act.member_id] = []
      actMap[act.member_id].push(act)
    }
    setActivities(prev => ({ ...prev, [dateKey]: actMap }))
  }, [userId])

  const removeEntry = useCallback(async (entryId, dateKey) => {
    const supabase = createClient()
    if (!supabase) return
    await supabase.from('calendar_entries').delete().eq('id', entryId)
    refreshDay(dateKey)
  }, [refreshDay])

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null
  const dayEntries = selectedKey ? (entries[selectedKey] || {}) : {}
  const dayActivities = selectedKey ? (activities[selectedKey] || {}) : {}

  return (
    <>
      <div
        className="plan-page"
        style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.25rem 1rem 5rem' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pending recipe banner */}
        {pendingRecipe && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.75rem 1rem', marginBottom: '1rem',
            background: 'rgba(61,138,62,0.1)', border: '1px solid var(--primary)',
            borderRadius: '10px', fontSize: '0.875rem', color: 'var(--text-1)',
          }}>
            <span><strong>{pendingRecipe.title}</strong> — pick a day below to add it.</span>
            <button
              onClick={clearPendingRecipe}
              style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2rem 0.625rem', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--text-3)' }}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="plan-grid">
          {/* ── COLUMN 1: Recipes drag list ─────────────────────────── */}
          <aside className="plan-col1">
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.4rem' }}>Drag a recipe</div>
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  placeholder="Search…"
                  style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', padding: '0.5rem' }}>
                {sidebarLoading ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>Loading…</p>
                ) : sidebarRecipes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>No recipes</p>
                ) : (
                  sidebarRecipes.map(r => (
                    <div
                      key={r.id}
                      draggable
                      onDragStart={() => { draggedRecipe.current = r; setDragActive(true) }}
                      onDragEnd={() => { if (!dropTarget) { draggedRecipe.current = null; setDragActive(false) } }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.375rem', background: 'var(--bg-page)', cursor: 'grab', userSelect: 'none' }}
                    >
                      {r.image_url && (
                        <img src={r.image_url} alt="" style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-1)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {r.title}
                      </span>
                      {MEAL_ICONS[r.meal_type] && (
                        <img
                          src={MEAL_ICONS[r.meal_type]}
                          alt={MEAL_LABELS[r.meal_type] || r.meal_type}
                          title={MEAL_LABELS[r.meal_type] || r.meal_type}
                          style={{ width: 20, height: 20, flexShrink: 0, opacity: 0.8 }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* ── MAIN: calendar on top, day view below ──────────────── */}
          <div className="plan-main">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Meal Plan</h1>
                <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>{weekLabel}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setWeekOffset(o => o - 1)}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-2)' }}
                  aria-label="Previous week"
                >◀</button>
                <button
                  onClick={() => setWeekOffset(0)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid var(--border)', background: weekOffset === 0 ? 'var(--primary)' : 'var(--bg-card)', color: weekOffset === 0 ? '#fff' : 'var(--text-2)', fontSize: '0.8125rem', cursor: 'pointer' }}
                >This week</button>
                <button
                  onClick={() => setWeekOffset(o => o + 1)}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-2)' }}
                  aria-label="Next week"
                >▶</button>
              </div>
            </div>

            {/* Calendar */}
            <div className="plan-calendar">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-4)' }}>Loading…</div>
              ) : (
                <WeekOverview
                  weekDates={weekDates}
                  entries={entries}
                  activities={activities}
                  members={members}
                  today={today}
                  onSelectDay={(date) => {
                    if (pendingRecipe) {
                      placePendingRecipeOnDay(date, toDateKey(date))
                    } else {
                      selectDay(date)
                    }
                  }}
                  onDropRecipe={handleDropRecipe}
                  dragActive={dragActive}
                />
              )}
            </div>

            {/* Day view (col 2 + col 3) */}
            {selectedDate && (
              <div className="plan-day">
                <div className="plan-col2">
                  <DayAgenda
                    date={selectedDate}
                    dateKey={selectedKey}
                    entries={dayEntries}
                    activities={dayActivities}
                    members={members}
                    activeMembers={activeMembers}
                    userId={userId}
                    onBack={() => setSelectedDate(null)}
                    onRefresh={refreshDay}
                    onRemoveEntry={removeEntry}
                    embedded
                  />
                </div>
                <div className="plan-col3">
                  <DayStatsPanel
                    date={selectedDate}
                    dateKey={selectedKey}
                    entries={dayEntries}
                    activities={dayActivities}
                    members={members}
                    selectedMemberIds={selectedMemberIds}
                    onToggleMember={(id) => {
                      setSelectedMemberIds(prev => {
                        const next = new Set(prev)
                        if (next.has(id)) next.delete(id); else next.add(id)
                        return next
                      })
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Meal slot picker modal (drag-drop OR pending recipe) */}
        {dropTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) {
              setDropTarget(null); draggedRecipe.current = null; setDragActive(false)
            } }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', maxWidth: 340, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>
                Add to {dropTarget.date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-3)' }}>
                {draggedRecipe.current?.title} — choose a meal slot:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {MEAL_TYPES.map(mt => (
                  <button
                    key={mt}
                    onClick={async () => {
                      await handleMealSlotPick(mt)
                      if (dropTarget?.fromPending) clearPendingRecipe()
                    }}
                    disabled={addingToMeal}
                    style={{ padding: '0.625rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-1)', cursor: 'pointer', textAlign: 'left', fontSize: '0.9375rem', fontWeight: 500 }}
                  >
                    {MEAL_LABELS[mt]}
                  </button>
                ))}
              </div>
              {addingToMeal && <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem', marginTop: '0.75rem' }}>Adding…</p>}
            </div>
          </div>
        )}

        <style>{`
          /* Desktop: col1 sidebar | (calendar on top + day view below as 2 cols) */
          .plan-grid {
            display: grid;
            grid-template-columns: 240px 1fr;
            gap: 1.25rem;
            align-items: start;
          }
          .plan-day {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 1rem;
            margin-top: 1.25rem;
          }
          .plan-col1 { position: sticky; top: 1rem; }

          /* Mobile: order = calendar → col2 → col3 → col1 */
          @media (max-width: 900px) {
            .plan-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
            .plan-col1 { position: static; order: 4; }
            .plan-main { order: 1; display: flex; flex-direction: column; }
            .plan-day {
              display: flex;
              flex-direction: column;
              gap: 1rem;
            }
            .plan-col2 { order: 1; }
            .plan-col3 { order: 2; }
          }
        `}</style>
      </div>
    </>
  )
}
