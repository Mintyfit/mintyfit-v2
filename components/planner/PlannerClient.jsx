'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'
import WeekOverview from './WeekOverview'
import DayAgenda from './DayAgenda'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']

function getWeekDates(anchorDate) {
  const d = new Date(anchorDate)
  const day = d.getDay() // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
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

const MEAL_LABELS = { breakfast: '🌅 Breakfast', snack: '🍎 Morning Snack', lunch: '☀️ Lunch', snack2: '🍊 Afternoon Snack', dinner: '🌙 Dinner' }

export default function PlannerClient({ userId, profile, members }) {
  const [today] = useState(() => new Date())
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [entries, setEntries] = useState({}) // { 'YYYY-MM-DD': { breakfast: [...], ... } }
  const [activities, setActivities] = useState({}) // { 'YYYY-MM-DD': { memberId: [activityObj] } }
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('week') // 'week' | 'day'
  const touchStartX = useRef(null)

  // Drag-and-drop sidebar
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarRecipes, setSidebarRecipes] = useState([])
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [sidebarLoading, setSidebarLoading] = useState(false)
  const draggedRecipe = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  // Drop target modal: { date, dateKey }
  const [dropTarget, setDropTarget] = useState(null)
  const [addingToMeal, setAddingToMeal] = useState(false)

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

  // Load calendar entries for the week
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
        id, date, meal_type, member_id, order_index,
        recipes(id, title, slug, image_url, nutrition, servings),
        journal_entries(id, food_name, amount, unit, nutrition, member_id)
      `)
      .eq('profile_id', userId)
      .gte('date', startKey)
      .lte('date', endKey)
      .then(({ data }) => {
        const map = {}
        for (const entry of data || []) {
          if (!map[entry.date]) map[entry.date] = {}
          if (!map[entry.date][entry.meal_type]) map[entry.date][entry.meal_type] = []
          map[entry.date][entry.meal_type].push(entry)
        }
        setEntries(map)
        setLoading(false)
      })

    // Load daily activities
    supabase
      .from('daily_activities')
      .select('*')
      .eq('profile_id', userId)
      .gte('date', startKey)
      .lte('date', endKey)
      .then(({ data }) => {
        const actMap = {}
        for (const act of data || []) {
          if (!actMap[act.date]) actMap[act.date] = {}
          if (!actMap[act.date][act.member_id]) actMap[act.date][act.member_id] = []
          actMap[act.date][act.member_id].push(act)
        }
        setActivities(actMap)
      })
  }, [userId, weekOffset])

  // Fetch sidebar recipes when sidebar opens or search changes
  useEffect(() => {
    if (!showSidebar) return
    setSidebarLoading(true)
    const supabase = createClient()
    if (!supabase) { setSidebarLoading(false); return }
    const query = supabase
      .from('recipes')
      .select('id, title, slug, image_url, nutrition')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(30)
    if (sidebarSearch.trim()) {
      query.ilike('title', `%${sidebarSearch.trim()}%`)
    }
    query.then(({ data }) => {
      setSidebarRecipes(data || [])
      setSidebarLoading(false)
    })
  }, [showSidebar, sidebarSearch])

  // Handle drop on a day card
  function handleDropRecipe(date, dateKey) {
    if (!draggedRecipe.current) return
    setDropTarget({ date, dateKey })
  }

  // After user picks a meal slot → insert calendar entry
  async function handleMealSlotPick(mealType) {
    if (!dropTarget || !draggedRecipe.current) return
    setAddingToMeal(true)
    const supabase = createClient()
    if (supabase) {
      const { dateKey } = dropTarget
      const currentSlotLen = (entries[dateKey]?.[mealType] || []).length
      await supabase.from('calendar_entries').insert({
        profile_id: userId,
        date: dateKey,
        meal_type: mealType,
        recipe_id: draggedRecipe.current.id,
        order_index: currentSlotLen,
      })
      await refreshDay(dateKey)
    }
    setDropTarget(null)
    draggedRecipe.current = null
    setDragActive(false)
    setAddingToMeal(false)
  }

  // Swipe support for mobile week navigation
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 50) {
      setWeekOffset(o => o + (diff < 0 ? 1 : -1))
    }
    touchStartX.current = null
  }

  function selectDay(date) {
    setSelectedDate(date)
    setView('day')
  }

  function handleBackToWeek() {
    setView('week')
    setSelectedDate(null)
  }

  // Refresh entries after add/remove
  const refreshDay = useCallback(async (dateKey) => {
    const supabase = createClient()
    if (!supabase || !userId) return
    const { data } = await supabase
      .from('calendar_entries')
      .select(`
        id, date, meal_type, member_id, order_index,
        recipes(id, title, slug, image_url, nutrition, servings),
        journal_entries(id, food_name, amount, unit, nutrition, member_id)
      `)
      .eq('profile_id', userId)
      .eq('date', dateKey)
    const mealMap = {}
    for (const entry of data || []) {
      if (!mealMap[entry.meal_type]) mealMap[entry.meal_type] = []
      mealMap[entry.meal_type].push(entry)
    }
    setEntries(prev => ({ ...prev, [dateKey]: mealMap }))
  }, [userId])

  // Remove a calendar entry
  const removeEntry = useCallback(async (entryId, dateKey) => {
    const supabase = createClient()
    if (!supabase) return
    await supabase.from('calendar_entries').delete().eq('id', entryId)
    refreshDay(dateKey)
  }, [refreshDay])

  if (view === 'day' && selectedDate) {
    const dateKey = toDateKey(selectedDate)
    const dayEntries = entries[dateKey] || {}
    const dayActivities = activities[dateKey] || {}

    return (
      <DayAgenda
        date={selectedDate}
        dateKey={dateKey}
        entries={dayEntries}
        activities={dayActivities}
        members={members}
        userId={userId}
        onBack={handleBackToWeek}
        onRefresh={refreshDay}
        onRemoveEntry={removeEntry}
      />
    )
  }

  return (
    <div
      style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>Meal Plan</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem' }}>{weekLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowSidebar(v => !v)}
            className="recipe-sidebar-btn"
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px',
              border: `1px solid ${showSidebar ? 'var(--primary)' : 'var(--border)'}`,
              background: showSidebar ? 'rgba(61,138,62,0.08)' : 'var(--bg-card)',
              color: showSidebar ? 'var(--primary)' : 'var(--text-2)',
              fontSize: '0.875rem', cursor: 'pointer', display: 'none',
            }}
          >
            📌 Recipes
          </button>
          <button
            onClick={async () => {
              // Collect unique recipe IDs from the current week's entries
              const recipeIds = new Set()
              for (const dayEntries of Object.values(entries)) {
                for (const mealEntries of Object.values(dayEntries)) {
                  for (const entry of mealEntries || []) {
                    if (entry.recipe_id) recipeIds.add(entry.recipe_id)
                  }
                }
              }
              if (recipeIds.size === 0) {
                window.location.href = '/shopping-list'
                return
              }
              // Add all week's recipes to shopping list then navigate
              for (const recipe_id of recipeIds) {
                await fetch('/api/shopping-list', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ recipe_id }),
                }).catch(() => {})
              }
              window.location.href = '/shopping-list'
            }}
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-2)', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            🛒 Shopping list
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-2)' }}
        >
          ◀
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          style={{ padding: '0.35rem 0.875rem', borderRadius: '20px', border: '1px solid var(--border)', background: weekOffset === 0 ? 'var(--primary)' : 'var(--bg-card)', color: weekOffset === 0 ? '#fff' : 'var(--text-2)', fontSize: '0.8125rem', cursor: 'pointer' }}
        >
          This week
        </button>
        <button
          onClick={() => setWeekOffset(o => o + 1)}
          style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-2)' }}
        >
          ▶
        </button>
      </div>

      {/* Mobile date strip */}
      <div style={{ display: 'none' }} className="mobile-date-strip">
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {weekDates.map(date => {
            const dk = toDateKey(date)
            const isToday = dk === toDateKey(today)
            const isSelected = selectedDate && toDateKey(selectedDate) === dk
            const dayEntries = entries[dk] || {}
            const filledSlots = MEAL_TYPES.filter(m => dayEntries[m]?.length > 0).length
            return (
              <button
                key={dk}
                onClick={() => selectDay(date)}
                style={{
                  flexShrink: 0, padding: '0.5rem 0.875rem', borderRadius: '10px',
                  border: `2px solid ${isSelected ? 'var(--primary)' : isToday ? 'var(--primary)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--primary)' : isToday ? 'rgba(61,138,62,0.08)' : 'var(--bg-card)',
                  color: isSelected ? '#fff' : isToday ? 'var(--primary)' : 'var(--text-2)',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  {date.toLocaleDateString('en', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{date.getDate()}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px' }}>
                  {MEAL_TYPES.map((m, i) => (
                    <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: dayEntries[m]?.length > 0 ? (isSelected ? '#fff' : 'var(--primary)') : 'var(--border)' }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Week + Sidebar layout */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Week overview grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-4)' }}>Loading…</div>
          ) : (
            <WeekOverview
              weekDates={weekDates}
              entries={entries}
              activities={activities}
              members={members}
              today={today}
              onSelectDay={selectDay}
              onDropRecipe={handleDropRecipe}
              dragActive={dragActive}
            />
          )}
        </div>

        {/* Recipe sidebar (desktop only) */}
        {showSidebar && (
          <div className="recipe-sidebar" style={{ width: 240, flexShrink: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-1)' }}>Drag recipes</span>
              <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
            <div style={{ padding: '0.625rem' }}>
              <input
                type="text"
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Search recipes…"
                style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto', padding: '0 0.625rem 0.625rem' }}>
              {sidebarLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>Loading…</p>
              ) : sidebarRecipes.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>No recipes found</p>
              ) : (
                sidebarRecipes.map(r => (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={() => { draggedRecipe.current = r; setDragActive(true) }}
                    onDragEnd={() => { if (!dropTarget) { draggedRecipe.current = null; setDragActive(false) } }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.375rem', background: 'var(--bg-page)', cursor: 'grab', userSelect: 'none' }}
                  >
                    {r.image_url && (
                      <img src={r.image_url} alt="" style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-1)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar toggle button */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="recipe-sidebar-toggle"
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: '0.875rem', cursor: 'pointer', display: 'none' }}
        >
          📌 Drag recipes onto days
        </button>
      )}

      {/* Meal slot picker modal (after dropping a recipe on a day) */}
      {dropTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setDropTarget(null); draggedRecipe.current = null; setDragActive(false) } }}>
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
                  onClick={() => handleMealSlotPick(mt)}
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
        @media (max-width: 640px) {
          .mobile-date-strip { display: block !important; margin-bottom: 1rem; }
        }
        @media (min-width: 900px) {
          .recipe-sidebar { display: block !important; }
          .recipe-sidebar-toggle { display: block !important; }
          .recipe-sidebar-btn { display: block !important; }
        }
      `}</style>
    </div>
  )
}
