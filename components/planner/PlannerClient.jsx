'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { computeMealBudget } from '@/lib/nutrition/mealBudget'
import WeekOverview from './WeekOverview'
import DayAgenda from './DayAgenda'
import DayStatsPanel from './DayStatsPanel'
import MonthView from './MonthView'

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

export default function PlannerClient({ userId, familyId, profile, members }) {
  const [today] = useState(() => new Date())
  const [weekOffset, setWeekOffset] = useState(0)
  const [viewMode, setViewMode] = useState('week') // 'week' | 'month'
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [entries, setEntries] = useState({})
  const [activities, setActivities] = useState({})
  const [journals, setJournals] = useState({}) // { dateKey: { mealType: [foodJournalRow, ...] } }
  const [loading, setLoading] = useState(false)
  const [monthEntries, setMonthEntries] = useState({})
  const [clearing, setClearing] = useState(false)
  const [showClearMenu, setShowClearMenu] = useState(false)
  const touchStartX = useRef(null)

  // Recipe sidebar (column 1) — always rendered, always populated
  const PAGE_SIZE = 20
  const [sidebarRecipes, setSidebarRecipes] = useState([])
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [sidebarLoading, setSidebarLoading] = useState(true)
  const [sidebarPage, setSidebarPage] = useState(0)
  const [sidebarHasMore, setSidebarHasMore] = useState(true)
  const [sidebarLoadingMore, setSidebarLoadingMore] = useState(false)
  const [sidebarFilter, setSidebarFilter] = useState('all') // 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
  const [sidebarTab, setSidebarTab] = useState('recipes')
  const [sidebarMenus, setSidebarMenus] = useState([])
  const [sidebarMenusLoading, setSidebarMenusLoading] = useState(true)
  const draggedMenu = useRef(null)
  const draggedRecipe = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [dropTarget, setDropTarget] = useState(null)
  const [addingToMeal, setAddingToMeal] = useState(false)

  // Per-day meal type toggles — persisted in day_meal_config table
  const [dayEnabledMeals, setDayEnabledMeals] = useState({})
  const loadDayMealConfigs = useCallback(async (fromDate, toDate) => {
    if (!familyId) return
    const supabase = createClient()
    if (!supabase) return
    const { data } = await supabase
      .from('day_meal_config')
      .select('date_str, enabled_meal_types')
      .eq('family_id', familyId)
      .gte('date_str', fromDate)
      .lte('date_str', toDate)
    if (data?.length) {
      const map = {}
      for (const row of data) map[row.date_str] = row.enabled_meal_types
      setDayEnabledMeals(map)
    }
  }, [familyId])
  const toggleDayMeal = useCallback(async (dateKey, mealType) => {
    const supabase = createClient()
    if (!supabase || !familyId) return
    // Compute new array from current state
    const current = dayEnabledMeals[dateKey] || MEAL_TYPES
    const idx = current.indexOf(mealType)
    const next = idx >= 0
      ? current.filter(m => m !== mealType)
      : [...current, mealType].sort((a,b) => MEAL_TYPES.indexOf(a) - MEAL_TYPES.indexOf(b))
    // Optimistic update
    setDayEnabledMeals(prev => ({ ...prev, [dateKey]: next }))
    await supabase.from('day_meal_config').upsert({
      family_id: familyId,
      date_str: dateKey,
      enabled_meal_types: next,
    }, { onConflict: 'family_id,date_str' })
  }, [familyId, dayEnabledMeals])
  const getDayEnabledMeals = useCallback((dateKey) => {
    return dayEnabledMeals[dateKey] || MEAL_TYPES
  }, [dayEnabledMeals])

  // Pending recipe from /recipes/[slug] "Add to Plan" button
  const [pendingRecipe, setPendingRecipe] = useState(null)

  // Which family members the next added recipe should be planned for.
  // Defaults to everyone; user can uncheck members in the right-column panel.
  const [selectedMemberIds, setSelectedMemberIds] = useState(() => new Set(members.map(m => m.id)))
  useEffect(() => {
    setSelectedMemberIds(new Set(members.map(m => m.id)))
  }, [members])
  const activeMembers = members.filter(m => selectedMemberIds.has(m.id))

  // When the user opens a day that already has entries, reflect the union of
  // consumer_member_ids across those entries — so the checkboxes match what's
  // actually stored. Empty days fall back to everyone-checked.
  useEffect(() => {
    if (!selectedDate) return
    const key = toDateKey(selectedDate)
    const dayMeals = entries[key] || {}
    const ids = new Set()
    let anyEntry = false
    for (const meal of MEAL_TYPES) {
      for (const e of (dayMeals[meal] || [])) {
        anyEntry = true
        const list = e.consumer_member_ids || (e.member_id ? [e.member_id] : members.map(m => m.id))
        for (const id of list) ids.add(id)
      }
    }
    setSelectedMemberIds(anyEntry ? ids : new Set(members.map(m => m.id)))
  }, [selectedDate, entries, members])

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

  // Load per-day meal configs for the visible week
  useEffect(() => {
    if (weekDates.length) {
      loadDayMealConfigs(toDateKey(weekDates[0]), toDateKey(weekDates[6]))
    }
  }, [weekOffset, loadDayMealConfigs])

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
    // Family-scoped read (mig 049): if user is in a family, see the family's
    // whole plan including siblings' variant rows. Solo users fall back to
    // legacy per-profile rows (family_id IS NULL).
    const baseSelect = `
        id, date_str, meal_type, member_id, consumer_member_ids,
        family_id, origin,
        recipes(id, title, slug, image_url, nutrition, servings)
      `
    const weekQuery = familyId
      ? supabase.from('calendar_entries').select(baseSelect).eq('family_id', familyId)
      : supabase.from('calendar_entries').select(baseSelect).eq('profile_id', userId).is('family_id', null)
    weekQuery
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
    // food_journal is a separate table (no FK to calendar_entries); load
    // independently and key by date_str + meal_type so DayAgenda can render.
    supabase
      .from('food_journal')
      .select('*')
      .eq('profile_id', userId)
      .gte('logged_date', startKey)
      .lte('logged_date', endKey)
      .then(({ data }) => {
        const jMap = {}
        for (const j of data || []) {
          const dk = j.logged_date
          if (!jMap[dk]) jMap[dk] = {}
          if (!jMap[dk][j.meal_type]) jMap[dk][j.meal_type] = []
          jMap[dk][j.meal_type].push(j)
        }
        setJournals(jMap)
      })
  }, [userId, weekOffset])

  // Fetch month-wide entries when in month view
  useEffect(() => {
    if (viewMode !== 'month' || !userId) return
    const supabase = createClient()
    if (!supabase) return
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0)
    const startKey = toDateKey(start)
    const endKey = toDateKey(end)
    const baseSelect = `
        id, date_str, meal_type, member_id, consumer_member_ids,
        family_id, origin,
        recipes(id, title, slug, image_url, nutrition, servings)
      `
    const mQuery = familyId
      ? supabase.from('calendar_entries').select(baseSelect).eq('family_id', familyId)
      : supabase.from('calendar_entries').select(baseSelect).eq('profile_id', userId).is('family_id', null)
    mQuery
      .gte('date_str', startKey)
      .lte('date_str', endKey)
      .then(({ data }) => {
        const map = {}
        for (const entry of data || []) {
          if (!map[entry.date_str]) map[entry.date_str] = {}
          if (!map[entry.date_str][entry.meal_type]) map[entry.date_str][entry.meal_type] = []
          map[entry.date_str][entry.meal_type].push(entry)
        }
        setMonthEntries(map)
      })
  }, [viewMode, userId, familyId])

  function applySidebarFilter(query) {
    if (sidebarFilter === 'snack') return query.in('meal_type', ['snack', 'snack2'])
    if (sidebarFilter !== 'all') return query.eq('meal_type', sidebarFilter)
    return query
  }

  // Sidebar recipes — first page; resets when search or filter changes
  useEffect(() => {
    if (!userId) return
    setSidebarLoading(true)
    setSidebarPage(0)
    setSidebarHasMore(true)
    const supabase = createClient()
    if (!supabase) { setSidebarLoading(false); return }
    let query = supabase
      .from('recipes')
      .select('id, title, slug, image_url, nutrition, meal_type')
      .or(`is_public.eq.true,profile_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)
    if (sidebarSearch.trim()) query = query.ilike('title', `%${sidebarSearch.trim()}%`)
    query = applySidebarFilter(query)
    query.then(({ data }) => {
      const list = data || []
      setSidebarRecipes(list)
      setSidebarHasMore(list.length === PAGE_SIZE)
      setSidebarLoading(false)
    })
  }, [sidebarSearch, sidebarFilter, userId])

  useEffect(() => {
    if (!userId) return
    setSidebarMenusLoading(true)
    const supabase = createClient()
    if (!supabase) { setSidebarMenusLoading(false); return }
    Promise.all([
      supabase
        .from('menus')
        .select('*, menu_recipes(count)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('menus')
        .select('*, menu_recipes(count)')
        .eq('profile_id', userId)
        .eq('is_public', false)
        .order('created_at', { ascending: false })
        .limit(20),
    ]).then(([publicResult, privateResult]) => {
      const seen = new Set()
      const merged = [...(publicResult.data || []), ...(privateResult.data || [])]
        .filter(menu => {
          if (seen.has(menu.id)) return false
          seen.add(menu.id)
          return true
        })
      const term = sidebarSearch.trim().toLowerCase()
      const filtered = term
        ? merged.filter(menu =>
            menu.name?.toLowerCase().includes(term) ||
            menu.description?.toLowerCase().includes(term)
          )
        : merged
      setSidebarMenus(filtered)
      setSidebarMenusLoading(false)
    })
  }, [sidebarSearch, userId])

  async function loadMoreSidebar() {
    if (sidebarLoadingMore || !sidebarHasMore) return
    setSidebarLoadingMore(true)
    const supabase = createClient()
    if (!supabase) { setSidebarLoadingMore(false); return }
    const nextPage = sidebarPage + 1
    const from = nextPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let query = supabase
      .from('recipes')
      .select('id, title, slug, image_url, nutrition, meal_type')
      .or(`is_public.eq.true,profile_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (sidebarSearch.trim()) query = query.ilike('title', `%${sidebarSearch.trim()}%`)
    query = applySidebarFilter(query)
    const { data } = await query
    const list = data || []
    setSidebarRecipes(prev => [...prev, ...list])
    setSidebarPage(nextPage)
    setSidebarHasMore(list.length === PAGE_SIZE)
    setSidebarLoadingMore(false)
  }

  async function applyMenuToDay(menu, dateKey) {
    if (!menu?.id || !dateKey) return
    setAddingToMeal(true)
    try {
      const res = await fetch('/api/menus/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_id: menu.id,
          start_date: dateKey,
          consumer_member_ids: activeMembers.map(m => m.id),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to apply menu')

      const refreshKeys = data.date_keys?.length ? data.date_keys : [dateKey]
      await Promise.all(refreshKeys.map(refreshDay))
    } catch (err) {
      console.error('menu apply failed:', err)
    } finally {
      setAddingToMeal(false)
    }
  }

  // Tap "+" on a sidebar recipe — adds to selectedDate. If recipe has a
  // meal_type, save directly; else open the meal-slot picker.
  function handleTapAddRecipe(recipe) {
    const targetDate = selectedDate || today
    const dateKey = toDateKey(targetDate)
    if (MEAL_TYPES.includes(recipe.meal_type)) {
      saveRecipeToDay(recipe, dateKey, recipe.meal_type)
      return
    }
    draggedRecipe.current = recipe
    setDropTarget({ date: targetDate, dateKey })
  }

  // Drag-and-drop helpers
  function handleDropRecipe(date, dateKey) {
    if (draggedMenu.current) {
      const menu = draggedMenu.current
      applyMenuToDay(menu, dateKey).then(() => {
        draggedMenu.current = null
        setDragActive(false)
      })
      return
    }
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
    // Compute personal_nutrition using calorie-budgeted meal distribution.
    // personal_nutrition = recipeTotals × batchScale (combined for all eaters).
    const mealsPerDay = 3
    const totals = recipe.nutrition?.totals
    const personalNutrition = (totals && activeMembers.length > 0)
      ? computeMealBudget(activeMembers, totals, mealType, null, mealsPerDay).personalNutrition
      : totals
    const row = {
      profile_id: userId,
      family_id: familyId || null,
      date_str: dateKey,
      meal_type: mealType,
      recipe_id: recipe.id,
      recipe_name: recipe.title || '',
      member_id: null,
      consumer_member_ids: activeMembers.map(m => m.id),
      personal_nutrition: personalNutrition || null,
      origin: 'planned',
    }
    // Mig 050: one non-partial unique on (family_id, date, meal, recipe,
    // origin). For solo users (family_id=NULL), NULLS DISTINCT means duplicates
    // won't trigger the upsert update path — that's fine; the UI never dupes
    // intentionally for solo users.
    const { error } = await supabase
      .from('calendar_entries')
      .upsert([row], { onConflict: 'family_id,date_str,meal_type,recipe_id,origin' })
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
    const daySelect = `
        id, date_str, meal_type, member_id, consumer_member_ids,
        family_id, origin,
        recipes(id, title, slug, image_url, nutrition, servings)
      `
    const dayQuery = familyId
      ? supabase.from('calendar_entries').select(daySelect).eq('family_id', familyId)
      : supabase.from('calendar_entries').select(daySelect).eq('profile_id', userId).is('family_id', null)
    const { data } = await dayQuery.eq('date_str', dateKey)
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

    // refresh food_journal for the day
    const { data: jData } = await supabase
      .from('food_journal')
      .select('*')
      .eq('profile_id', userId)
      .eq('logged_date', dateKey)
    const jMap = {}
    for (const j of jData || []) {
      if (!jMap[j.meal_type]) jMap[j.meal_type] = []
      jMap[j.meal_type].push(j)
    }
    setJournals(prev => ({ ...prev, [dateKey]: jMap }))
  }, [userId])

  const removeEntry = useCallback(async (entryId, dateKey) => {
    const supabase = createClient()
    if (!supabase) return
    await supabase.from('calendar_entries').delete().eq('id', entryId)
    refreshDay(dateKey)
  }, [refreshDay])

  async function clearDay() {
    if (!selectedKey || clearing) return
    if (!confirm('Clear all meals for this day?')) return
    setClearing(true)
    const supabase = createClient()
    if (!supabase) { setClearing(false); return }
    const query = familyId
      ? supabase.from('calendar_entries').delete().eq('family_id', familyId).eq('date_str', selectedKey)
      : supabase.from('calendar_entries').delete().eq('profile_id', userId).is('family_id', null).eq('date_str', selectedKey)
    await query
    await refreshDay(selectedKey)
    setClearing(false)
  }

  async function clearWeek() {
    if (clearing) return
    if (!confirm(`Clear all meals for ${weekLabel}?`)) return
    setClearing(true)
    const supabase = createClient()
    if (!supabase) { setClearing(false); return }
    const dateKeys = weekDates.map(d => toDateKey(d))
    const query = familyId
      ? supabase.from('calendar_entries').delete().eq('family_id', familyId).in('date_str', dateKeys)
      : supabase.from('calendar_entries').delete().eq('profile_id', userId).is('family_id', null).in('date_str', dateKeys)
    await query
    for (const dk of dateKeys) await refreshDay(dk)
    setClearing(false)
  }

  async function clearMonthRange() {
    if (clearing) return
    const now = new Date()
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const label = mStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!confirm(`Clear all meals for ${label}?`)) return
    setClearing(true)
    const supabase = createClient()
    if (!supabase) { setClearing(false); return }
    const startKey = toDateKey(mStart)
    const endKey = toDateKey(mEnd)
    const query = familyId
      ? supabase.from('calendar_entries').delete().eq('family_id', familyId).gte('date_str', startKey).lte('date_str', endKey)
      : supabase.from('calendar_entries').delete().eq('profile_id', userId).is('family_id', null).gte('date_str', startKey).lte('date_str', endKey)
    await query
    // Refresh the current week and month views
    for (const d of weekDates) await refreshDay(toDateKey(d))
    // Re-fetch month entries
    if (viewMode === 'month') {
      const map = {}
      setMonthEntries(map)
    }
    setClearing(false)
  }

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null
  const dayEntries = selectedKey ? (entries[selectedKey] || {}) : {}
  const dayActivities = selectedKey ? (activities[selectedKey] || {}) : {}
  const dayJournals = selectedKey ? (journals[selectedKey] || {}) : {}

  return (
    <>
      <div
        className="plan-page"
        style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.25rem 1.25rem 5rem' }}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.5rem', padding: '0.2rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)' }}>
                  {[
                    { id: 'recipes', label: 'Recipes' },
                    { id: 'menus', label: 'Menus' },
                  ].map(tab => {
                    const active = sidebarTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSidebarTab(tab.id)}
                        style={{
                          padding: '0.35rem 0.5rem',
                          border: 'none',
                          borderRadius: '6px',
                          background: active ? 'var(--primary)' : 'transparent',
                          color: active ? '#fff' : 'var(--text-3)',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  placeholder="Search…"
                  style={{ width: '100%', padding: '0.4rem 0.625rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.8125rem', outline: 'none', boxSizing: 'border-box' }}
                />
                {sidebarTab === 'recipes' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: '0.4rem' }}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'breakfast', label: 'Breakfast' },
                    { id: 'lunch', label: 'Lunch' },
                    { id: 'dinner', label: 'Dinner' },
                    { id: 'snack', label: 'Snack' },
                  ].map(f => {
                    const active = sidebarFilter === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSidebarFilter(f.id)}
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                          background: active ? 'var(--primary)' : 'transparent',
                          color: active ? '#fff' : 'var(--text-3)',
                          fontSize: '0.6875rem',
                          fontWeight: active ? 600 : 500,
                          cursor: 'pointer',
                          lineHeight: 1.4,
                        }}
                      >{f.label}</button>
                    )
                  })}
                </div>}
              </div>
              <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', padding: '0.5rem' }}>
                {sidebarTab === 'menus' ? (
                  sidebarMenusLoading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>Loading…</p>
                  ) : sidebarMenus.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>No menus</p>
                  ) : (
                    sidebarMenus.map(menu => {
                      return (
                        <div
                          key={menu.id}
                          draggable
                          onDragStart={() => { draggedMenu.current = menu; setDragActive(true) }}
                          onDragEnd={() => { draggedMenu.current = null; setDragActive(false) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.375rem', background: 'var(--bg-page)', cursor: 'grab', userSelect: 'none' }}
                        >
                          {menu.image_url && (
                            <img src={menu.image_url} alt="" style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-1)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {menu.name}
                          </span>
                          <button
                            onClick={() => applyMenuToDay(menu, toDateKey(selectedDate || today))}
                            disabled={addingToMeal}
                            aria-label={`Add ${menu.name} to plan`}
                            title={selectedDate
                              ? `Start on ${selectedDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}`
                              : 'Start today'}
                            style={{
                              width: 28, height: 28, borderRadius: '50%',
                              border: 'none', background: 'var(--primary)', color: '#fff',
                              fontSize: '1rem', fontWeight: 700, cursor: addingToMeal ? 'wait' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, lineHeight: 1, opacity: addingToMeal ? 0.65 : 1,
                            }}
                          >+</button>
                        </div>
                      )
                    })
                  )
                ) : sidebarLoading ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>Loading…</p>
                ) : sidebarRecipes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '0.8125rem', padding: '1rem 0' }}>No recipes</p>
                ) : (
                  <>
                    {sidebarRecipes.map(r => (
                      <div
                        key={r.id}
                        draggable
                        onDragStart={() => { draggedRecipe.current = r; setDragActive(true) }}
                        onDragEnd={() => { if (!dropTarget) { draggedRecipe.current = null; setDragActive(false) } }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.375rem', background: 'var(--bg-page)', cursor: 'grab', userSelect: 'none' }}
                      >
                        <Link href={`/recipes/${r.slug || r.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, textDecoration: 'none', minWidth: 0 }} onClick={e => e.stopPropagation()}>
                          {r.image_url && (
                            <img src={r.image_url} alt="" style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-1)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {r.title}
                          </span>
                        </Link>
                        {MEAL_ICONS[r.meal_type] && (
                          <img
                            src={MEAL_ICONS[r.meal_type]}
                            alt={MEAL_LABELS[r.meal_type] || r.meal_type}
                            title={MEAL_LABELS[r.meal_type] || r.meal_type}
                            style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.8 }}
                          />
                        )}
                        <button
                          onClick={() => handleTapAddRecipe(r)}
                          aria-label={`Add ${r.title} to plan`}
                          title={selectedDate
                            ? `Add to ${selectedDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}`
                            : 'Add to today'}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            border: 'none', background: 'var(--primary)', color: '#fff',
                            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, lineHeight: 1,
                          }}
                        >+</button>
                      </div>
                    ))}
                    {sidebarHasMore && (
                      <button
                        onClick={loadMoreSidebar}
                        disabled={sidebarLoadingMore}
                        style={{
                          width: '100%', marginTop: '0.5rem', padding: '0.5rem',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          background: 'var(--bg-page)', color: 'var(--text-2)',
                          fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                        }}
                      >
                        {sidebarLoadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* ── MAIN: calendar on top, day view below ──────────────── */}
          <div className="plan-main">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Meal Plan</h1>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', margin: 0 }}>{viewMode === 'week' ? weekLabel : new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                </div>
                {/* Clear buttons */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowClearMenu(o => !o)}
                    disabled={clearing}
                    title="Clear meals"
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-3)', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    🗑 Clear ▾
                  </button>
                  {showClearMenu && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.375rem', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '130px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                      onMouseLeave={() => setShowClearMenu(false)}>
                      <button onClick={() => { clearDay(); setShowClearMenu(false) }} disabled={clearing}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text-2)', fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >Clear Day</button>
                      <button onClick={() => { clearWeek(); setShowClearMenu(false) }} disabled={clearing}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text-2)', fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >Clear Week</button>
                      <button onClick={() => { clearMonthRange(); setShowClearMenu(false) }} disabled={clearing}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >Clear Month</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Week navigation (only in week mode) */}
                {viewMode === 'week' && (<>
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
                </>)}
                {/* Week / Month toggle */}
                <div style={{ display: 'inline-flex', border: '1.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', fontSize: '0.75rem', fontWeight: 600 }}>
                  {['week', 'month'].map(v => (
                    <button
                      key={v}
                      onClick={() => { setViewMode(v); if (v === 'week') setWeekOffset(0) }}
                      style={{
                        padding: '0.35rem 0.7rem',
                        background: viewMode === v ? 'var(--primary)' : 'transparent',
                        color: viewMode === v ? '#fff' : 'var(--text-3)',
                        border: 'none',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="plan-calendar">
              {loading && viewMode === 'week' ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-4)' }}>Loading…</div>
              ) : viewMode === 'month' ? (
                <MonthView
                  entries={monthEntries}
                  activities={activities}
                  members={members}
                  userId={userId}
                  onRefresh={refreshDay}
                  onRemoveEntry={removeEntry}
                />
              ) : (
                <WeekOverview
                  weekDates={weekDates}
                  entries={entries}
                  activities={activities}
                  members={members}
                  today={today}
                  dayEnabledMeals={dayEnabledMeals}
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

            {/* Day view (col 2 + col 3) — week mode only */}
            {viewMode === 'week' && selectedDate && (
              <div className="plan-day">
                <div className="plan-col2">
                  <DayAgenda
                    date={selectedDate}
                    dateKey={selectedKey}
                    entries={dayEntries}
                    activities={dayActivities}
                    journals={dayJournals}
                    members={members}
                    activeMembers={activeMembers}
                    enabledMealTypes={getDayEnabledMeals(selectedKey)}
                    onToggleDayMeal={(mt) => toggleDayMeal(selectedKey, mt)}
                    userId={userId}
                    familyId={familyId}
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
                    enabledMealTypes={getDayEnabledMeals(selectedKey)}
                    selectedMemberIds={selectedMemberIds}
                    onToggleMember={async (id) => {
                      // Optimistic UI: flip set, flip every entry's consumer list, persist.
                      const willCheck = !selectedMemberIds.has(id)
                      setSelectedMemberIds(prev => {
                        const next = new Set(prev)
                        if (next.has(id)) next.delete(id); else next.add(id)
                        return next
                      })
                      const supabase = createClient()
                      if (!supabase || !selectedKey) return
                      const updates = []
                      for (const meal of MEAL_TYPES) {
                        for (const e of (dayEntries[meal] || [])) {
                          const current = new Set(e.consumer_member_ids || [])
                          if (willCheck) current.add(id); else current.delete(id)
                          updates.push(supabase.from('calendar_entries')
                            .update({ consumer_member_ids: Array.from(current) })
                            .eq('id', e.id))
                        }
                      }
                      await Promise.all(updates)
                      refreshDay(selectedKey)
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
            grid-template-columns: 240px minmax(0, 780px);
            gap: 1.25rem;
            align-items: start;
            justify-content: center;
          }
          .plan-day {
            display: grid;
            grid-template-columns: 1fr 280px;
            gap: 1rem;
            margin-top: 1.25rem;
          }
          .plan-col1 { position: sticky; top: 1rem; }
          .plan-col2 { max-width: 535px; }

          /* Mobile: order = calendar → col2 → col3 → col1 */
          @media (max-width: 900px) {
            .plan-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
            .plan-col1 { position: static; order: 4; }
            .plan-main { order: 1; display: flex; flex-direction: column; min-width: 0; }
            .plan-day {
              display: flex;
              flex-direction: column;
              gap: 1rem;
            }
            .plan-col2 { order: 1; min-width: 0; }
            .plan-col3 { order: 2; min-width: 0; }
          }
          @media (max-width: 600px) {
            .plan-page {
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
            .plan-page h1 { font-size: 1.25rem !important; }
          }
        `}</style>
      </div>
    </>
  )
}
