'use client'

import { toDateKey } from '@/lib/utils/dateKey'
import { PLAN_CACHE_PREFIX, JOURNAL_SAVED_EVENT } from '@/lib/planner/planCache'
import { MEAL_TYPES, computeMealBudget } from '@/lib/nutrition/mealBudget'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

import { createClient } from '@/lib/supabase/client'
import WeekOverview from './WeekOverview'
import DayAgenda from './DayAgenda'
import DayStatsPanel from './DayStatsPanel'
import MonthView from './MonthView'
import PlannerSidebar from './PlannerSidebar'
import { MEAL_LABELS, MEAL_ICONS } from './plannerConstants'
import { AssistantFab } from '@/components/assistant/AssistantPanel'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'

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


const CACHE_PREFIX = PLAN_CACHE_PREFIX // shared with lib/planner/planCache.js (writers outside the planner bust it)
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min — survives app restarts (localStorage), never too stale

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.ts || 0) > CACHE_TTL_MS) return null
    return parsed.data
  } catch { return null }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

// ── Shared calendar-entry query helpers (were duplicated 3× verbatim) ───────
const ENTRIES_SELECT = `
    id, date_str, meal_type, member_id, consumer_member_ids,
    family_id, origin,
    recipes(id, title, slug, image_url, nutrition, servings)
  `

function entriesQuery(supabase, { familyId, qUserId }) {
  return familyId
    ? supabase.from('calendar_entries').select(ENTRIES_SELECT).eq('family_id', familyId)
    : supabase.from('calendar_entries').select(ENTRIES_SELECT).eq('profile_id', qUserId).is('family_id', null)
}

function groupEntriesByDate(data) {
  const map = {}
  for (const entry of data || []) {
    if (!map[entry.date_str]) map[entry.date_str] = {}
    if (!map[entry.date_str][entry.meal_type]) map[entry.date_str][entry.meal_type] = []
    map[entry.date_str][entry.meal_type].push(entry)
  }
  return map
}

function groupActivitiesByDate(data) {
  const map = {}
  for (const act of data || []) {
    if (!map[act.date_str]) map[act.date_str] = {}
    if (!map[act.date_str][act.member_id]) map[act.date_str][act.member_id] = []
    map[act.date_str][act.member_id].push(act)
  }
  return map
}

function groupJournalsByDate(data) {
  const map = {}
  for (const j of data || []) {
    if (!map[j.logged_date]) map[j.logged_date] = {}
    if (!map[j.logged_date][j.meal_type]) map[j.logged_date][j.meal_type] = []
    map[j.logged_date][j.meal_type].push(j)
  }
  return map
}

// Stable empty-object identity — `entries[key] || {}` in render would otherwise
// create a fresh object every render and bust DayStatsPanel/DayAgenda memos.
const EMPTY_DAY = {}

export default function PlannerClient({ userId, familyId, profile, members, clientId, clientProfile, viewingClient, ownProfile }) {
  const effectiveUserId = clientId || userId
  const isViewingClient = !!clientId && viewingClient
  const toast = useToast()
  const confirmDialog = useConfirm()
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
  const activeMembers = members.filter(m => selectedMemberIds.has(m.id))

  // When the user opens a day that already has entries, reflect the union of
  // consumer_member_ids across those entries — so the checkboxes match what's
  // actually stored. Empty days fall back to everyone-checked.
  // Dep is the SELECTED day's slice only — not `entries` — so refreshing an
  // unrelated day doesn't clobber the checkboxes or DayStatsPanel's memos.
  const selectedDayEntries = selectedDate ? entries[toDateKey(selectedDate)] : null
  useEffect(() => {
    if (!selectedDate) return
    const dayMeals = selectedDayEntries || EMPTY_DAY
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
  }, [selectedDate, selectedDayEntries, members])

  const { weekDates, weekStart, weekEnd, weekLabel } = useMemo(() => {
    const anchor = new Date(today)
    anchor.setDate(today.getDate() + weekOffset * 7)
    const dates = getWeekDates(anchor)
    const ms = dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const me = dates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return { weekDates: dates, weekStart: dates[0], weekEnd: dates[6], weekLabel: `${ms} – ${me}` }
  }, [today, weekOffset])

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
    const startKey = toDateKey(weekStart)
    const endKey = toDateKey(weekEnd)
    const qUserId = effectiveUserId
    const weekKey = `${qUserId}:${isViewingClient ? 'client' : (familyId || 'solo')}:${startKey}:${endKey}`

    // Use localStorage cache if available (survives full page reloads)
    const cached = cacheGet('week:' + weekKey)
    if (cached?.entries && cached?.activities) {
      setEntries(cached.entries)
      setActivities(cached.activities)
      if (cached.journals) setJournals(cached.journals)
      return
    }

    const supabase = createClient()
    if (!supabase) return

    // Stale-guard: if the user navigates weeks quickly, the previous week's
    // in-flight queries must not clobber the current week's state.
    let cancelled = false
    setLoading(true)

    const entriesReq = entriesQuery(supabase, { familyId, qUserId })
      .gte('date_str', startKey)
      .lte('date_str', endKey)
    const activitiesReq = !isViewingClient
      ? supabase.from('daily_activities').select('*').eq('profile_id', userId).gte('date_str', startKey).lte('date_str', endKey)
      : Promise.resolve({ data: null })
    const journalsReq = !isViewingClient
      ? supabase.from('food_journal').select('*').eq('profile_id', userId).gte('logged_date', startKey).lte('logged_date', endKey)
      : Promise.resolve({ data: null })

    // One Promise.all + one cache write — three fire-and-forget chains previously
    // raced each other on the same cache key and silently dropped datasets.
    Promise.all([entriesReq, activitiesReq, journalsReq])
      .then(([entriesRes, actRes, jourRes]) => {
        if (cancelled) return
        const map = groupEntriesByDate(entriesRes.data)
        setEntries(map)
        if (!isViewingClient) {
          const actMap = groupActivitiesByDate(actRes.data)
          const jMap = groupJournalsByDate(jourRes.data)
          setActivities(actMap)
          setJournals(jMap)
          cacheSet('week:' + weekKey, { entries: map, activities: actMap, journals: jMap, weekKey })
        } else {
          cacheSet('week:' + weekKey, { entries: map, weekKey })
        }
      })
      .catch(err => {
        if (!cancelled) console.error('week load failed:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, weekOffset, effectiveUserId, isViewingClient, familyId])

  // Fetch month-wide entries when in month view
  useEffect(() => {
    if (viewMode !== 'month' || !userId) return
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0)
    const startKey = toDateKey(start)
    const endKey = toDateKey(end)
    const qUserId = effectiveUserId
    const monthKey = `${qUserId}:${isViewingClient ? 'client' : (familyId || 'solo')}:m:${startKey}:${endKey}`

    const cached = cacheGet('month:' + monthKey)
    if (cached?.entries) {
      setMonthEntries(cached.entries)
      return
    }

    const supabase = createClient()
    if (!supabase) return
    let cancelled = false
    entriesQuery(supabase, { familyId, qUserId })
      .gte('date_str', startKey)
      .lte('date_str', endKey)
      .then(({ data }) => {
        if (cancelled) return
        const map = groupEntriesByDate(data)
        cacheSet('month:' + monthKey, { entries: map })
        setMonthEntries(map)
      })
      .catch(err => {
        if (!cancelled) console.error('month load failed:', err)
      })
    return () => { cancelled = true }
  }, [viewMode, userId, effectiveUserId, isViewingClient, familyId])

  // Sidebar drag wiring — the sidebar owns its data; drags resolve here
  function handleSidebarRecipeDragStart(r) { draggedRecipe.current = r; setDragActive(true) }
  function handleSidebarRecipeDragEnd() { if (!dropTarget) { draggedRecipe.current = null; setDragActive(false) } }
  function handleSidebarMenuDragStart(m) { draggedMenu.current = m; setDragActive(true) }
  function handleSidebarMenuDragEnd() { draggedMenu.current = null; setDragActive(false) }
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
    const mealsPerDay = 3
    const totals = recipe.nutrition?.totals
    const personalNutrition = (totals && activeMembers.length > 0)
      ? computeMealBudget(activeMembers, totals, mealType, null, mealsPerDay).personalNutrition
      : totals

    if (isViewingClient) {
      // Use API route with admin client (bypasses RLS for nutritionist writes)
      try {
        const res = await fetch('/api/nutritionist/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: effectiveUserId,
            date_str: dateKey,
            meal_type: mealType,
            recipe_id: recipe.id,
            recipe_name: recipe.title || '',
            consumer_member_ids: activeMembers.map(m => m.id),
            personal_nutrition: personalNutrition || null,
          }),
        })
        const d = await res.json()
        if (!res.ok) {
          toast.error('Failed to save to client plan: ' + (d.error || 'Unknown error'))
        }
      } catch (e) {
        console.error('[client-plan] Save error:', e)
        toast.error('Failed to save to client plan: ' + e.message)
      }
      await refreshDay(dateKey)
      setAddingToMeal(false)
      return
    }

    const supabase = createClient()
    if (!supabase) { setAddingToMeal(false); return }
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
    // The unique index on (family_id, date_str, meal_type, recipe_id, origin) is
    // PARTIAL (migration 049, WHERE family_id IS NOT NULL), so PostgREST upsert
    // cannot use it as an arbiter (Postgres 42P10). Do select → insert/update.
    let findQuery = supabase
      .from('calendar_entries')
      .select('id')
      .eq('date_str', dateKey)
      .eq('meal_type', mealType)
      .eq('recipe_id', recipe.id)
      .eq('origin', 'planned')
    findQuery = familyId
      ? findQuery.eq('family_id', familyId)
      : findQuery.eq('profile_id', userId).is('family_id', null)
    const { data: existing, error: findErr } = await findQuery.maybeSingle()

    let saveErr = findErr
    if (!saveErr) {
      if (existing?.id) {
        const { error } = await supabase
          .from('calendar_entries')
          .update({
            recipe_name: row.recipe_name,
            consumer_member_ids: row.consumer_member_ids,
            personal_nutrition: row.personal_nutrition,
          })
          .eq('id', existing.id)
        saveErr = error
      } else {
        const { error } = await supabase.from('calendar_entries').insert([row])
        saveErr = error
      }
    }
    if (saveErr) {
      console.error('calendar save failed:', saveErr)
      toast.error('Failed to save meal to plan: ' + (saveErr.message || 'Unknown error'))
      setAddingToMeal(false)
      return
    }
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
    const qUserId = effectiveUserId
    // Invalidate localStorage cache for current week so re-navigation gets fresh data
    const wStart = toDateKey(weekStart)
    const wEnd = toDateKey(weekEnd)
    const wk = `${qUserId}:${isViewingClient ? 'client' : (familyId || 'solo')}:${wStart}:${wEnd}`
    try { localStorage.removeItem(CACHE_PREFIX + 'week:' + wk) } catch {}

    // Entries + activities + journal are independent — fetch in parallel.
    const entriesReq = entriesQuery(supabase, { familyId, qUserId }).eq('date_str', dateKey)
    const activitiesReq = !isViewingClient
      ? supabase.from('daily_activities').select('*').eq('profile_id', userId).eq('date_str', dateKey)
      : Promise.resolve({ data: null })
    const journalsReq = !isViewingClient
      ? supabase.from('food_journal').select('*').eq('profile_id', userId).eq('logged_date', dateKey)
      : Promise.resolve({ data: null })

    let entriesRes, actRes, jourRes
    try {
      ;[entriesRes, actRes, jourRes] = await Promise.all([entriesReq, activitiesReq, journalsReq])
    } catch (err) {
      console.error('day refresh failed:', err)
      return
    }

    const mealMap = {}
    for (const entry of entriesRes.data || []) {
      if (!mealMap[entry.meal_type]) mealMap[entry.meal_type] = []
      mealMap[entry.meal_type].push(entry)
    }
    setEntries(prev => ({ ...prev, [dateKey]: mealMap }))

    if (!isViewingClient) {
      const actMap = {}
      for (const act of actRes.data || []) {
        if (!actMap[act.member_id]) actMap[act.member_id] = []
        actMap[act.member_id].push(act)
      }
      setActivities(prev => ({ ...prev, [dateKey]: actMap }))

      const jMap = {}
      for (const j of jourRes.data || []) {
        if (!jMap[j.meal_type]) jMap[j.meal_type] = []
        jMap[j.meal_type].push(j)
      }
      setJournals(prev => ({ ...prev, [dateKey]: jMap }))
    }
  }, [userId, weekOffset, effectiveUserId, isViewingClient, familyId])

  // Refresh live when a journal entry is logged outside the planner (Minty Chat)
  useEffect(() => {
    function onJournalSaved(e) {
      const dk = e.detail?.dateKey
      if (dk) refreshDay(dk)
    }
    window.addEventListener(JOURNAL_SAVED_EVENT, onJournalSaved)
    return () => window.removeEventListener(JOURNAL_SAVED_EVENT, onJournalSaved)
  }, [refreshDay])

  const removeEntry = useCallback(async (entryId, dateKey) => {
    if (isViewingClient) {
      try {
        await fetch(`/api/nutritionist/calendar?id=${entryId}&clientId=${effectiveUserId}`, { method: 'DELETE' })
      } catch (e) {
        console.error('Client entry delete error:', e)
      }
      refreshDay(dateKey)
      return
    }
    const supabase = createClient()
    if (!supabase) return
    await supabase.from('calendar_entries').delete().eq('id', entryId)
    refreshDay(dateKey)
  }, [refreshDay, isViewingClient, effectiveUserId])

  async function clearDay() {
    if (!selectedKey || clearing || isViewingClient) return
    if (!(await confirmDialog({ title: 'Clear this day?', body: 'All planned meals for this day will be removed.', confirmLabel: 'Clear day', destructive: true }))) return
    setClearing(true)
    const supabase = createClient()
    if (!supabase) { setClearing(false); return }
    const query = familyId
      ? supabase.from('calendar_entries').delete().eq('family_id', familyId).eq('date_str', selectedKey)
      : supabase.from('calendar_entries').delete().eq('profile_id', effectiveUserId).is('family_id', null).eq('date_str', selectedKey)
    await query
    await refreshDay(selectedKey)
    setClearing(false)
  }

  async function clearWeek() {
    if (clearing || isViewingClient) return
    if (!(await confirmDialog({ title: 'Clear this week?', body: `All planned meals for ${weekLabel} will be removed.`, confirmLabel: 'Clear week', destructive: true }))) return
    setClearing(true)
    const supabase = createClient()
    if (!supabase) { setClearing(false); return }
    const dateKeys = weekDates.map(d => toDateKey(d))
    const query = familyId
      ? supabase.from('calendar_entries').delete().eq('family_id', familyId).in('date_str', dateKeys)
      : supabase.from('calendar_entries').delete().eq('profile_id', effectiveUserId).is('family_id', null).in('date_str', dateKeys)
    await query
    await Promise.all(dateKeys.map(refreshDay))
    setClearing(false)
  }

  async function clearMonthRange() {
    if (clearing) return
    const now = new Date()
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const label = mStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!(await confirmDialog({ title: 'Clear this month?', body: `All planned meals for ${label} will be removed.`, confirmLabel: 'Clear month', destructive: true }))) return
    setClearing(true)
    const supabase = createClient()
    if (!supabase) { setClearing(false); return }
    const startKey = toDateKey(mStart)
    const endKey = toDateKey(mEnd)
    const query = familyId
      ? supabase.from('calendar_entries').delete().eq('family_id', familyId).gte('date_str', startKey).lte('date_str', endKey)
      : supabase.from('calendar_entries').delete().eq('profile_id', userId).is('family_id', null).gte('date_str', startKey).lte('date_str', endKey)
    await query
    // Refresh the current week and month views (parallel — was 7 serial round trips)
    await Promise.all(weekDates.map(d => refreshDay(toDateKey(d))))
    // Bust the month-view cache so the cleared range doesn't resurrect on re-entry
    try {
      const mkStart = toDateKey(new Date(now.getFullYear(), now.getMonth() - 2, 1))
      const mkEnd = toDateKey(new Date(now.getFullYear(), now.getMonth() + 3, 0))
      const mk = `${effectiveUserId}:${isViewingClient ? 'client' : (familyId || 'solo')}:m:${mkStart}:${mkEnd}`
      localStorage.removeItem(CACHE_PREFIX + 'month:' + mk)
    } catch {}
    if (viewMode === 'month') {
      setMonthEntries(EMPTY_DAY)
    }
    setClearing(false)
  }

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null
  const dayEntries = selectedKey ? (entries[selectedKey] || EMPTY_DAY) : EMPTY_DAY
  const dayActivities = selectedKey ? (activities[selectedKey] || EMPTY_DAY) : EMPTY_DAY
  const dayJournals = selectedKey ? (journals[selectedKey] || EMPTY_DAY) : EMPTY_DAY

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
          <PlannerSidebar
            userId={userId}
            selectedDate={selectedDate}
            today={today}
            addingToMeal={addingToMeal}
            onTapAddRecipe={handleTapAddRecipe}
            onApplyMenu={applyMenuToDay}
            onRecipeDragStart={handleSidebarRecipeDragStart}
            onRecipeDragEnd={handleSidebarRecipeDragEnd}
            onMenuDragStart={handleSidebarMenuDragStart}
            onMenuDragEnd={handleSidebarMenuDragEnd}
          />

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
                    style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-2)', fontSize: '1rem' }}
                    aria-label="Previous week"
                  >◀</button>
                  <button
                    onClick={() => setWeekOffset(0)}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid var(--border)', background: weekOffset === 0 ? 'var(--primary)' : 'var(--bg-card)', color: weekOffset === 0 ? '#fff' : 'var(--text-2)', fontSize: '0.8125rem', cursor: 'pointer' }}
                  >This week</button>
                  <button
                    onClick={() => setWeekOffset(o => o + 1)}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-2)', fontSize: '1rem' }}
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
                    journals={dayJournals}
                    members={members}
                    enabledMealTypes={getDayEnabledMeals(selectedKey)}
                    selectedMemberIds={selectedMemberIds}
                    onToggleMember={async (id) => {
                      // Optimistic UI: flip set, flip every entry's consumer list, persist.
                      // Adding/removing a member changes their calorie-budget share, so
                      // personal_nutrition (recipe totals × batchScale for the new consumer
                      // set) is recomputed and persisted for every affected entry — that is
                      // the point of the toggle. Legacy rows without recipe nutrition fall
                      // back to scaling the stored value by consumer-count ratio.
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
                          const prevIds = e.consumer_member_ids || (e.member_id ? [e.member_id] : members.map(m => m.id))
                          const current = new Set(prevIds)
                          if (willCheck) current.add(id); else current.delete(id)
                          const nextIds = Array.from(current)

                          const totals = e.recipes?.nutrition?.totals
                          let personalNutrition
                          if (totals && nextIds.length > 0) {
                            const consumers = members.filter(m => nextIds.includes(m.id))
                            personalNutrition = computeMealBudget(consumers, totals, meal, null, 3).personalNutrition
                          } else if (totals) {
                            personalNutrition = null // no consumers left — nothing to store
                          } else {
                            // Legacy row (no recipe join): scale stored value by count ratio
                            const ratio = nextIds.length / Math.max(prevIds.length, 1)
                            const base = e.personal_nutrition
                            personalNutrition = base && typeof base === 'object'
                              ? Object.fromEntries(Object.entries(base).map(([k, v]) => [k, typeof v === 'number' ? v * ratio : v]))
                              : null
                          }

                          updates.push(supabase.from('calendar_entries')
                            .update({ consumer_member_ids: nextIds, personal_nutrition: personalNutrition })
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
              /* Day-first on portrait mobile: today's agenda is the primary
                 view; the week grid sits below for navigation. */
              order: 1;
              margin-top: 0;
              margin-bottom: 1rem;
            }
            .plan-calendar { order: 2; }
            .plan-col2 { order: 1; min-width: 0; max-width: none; }
            .plan-col3 { order: 2; min-width: 0; }
          }
          @media (max-width: 600px) {
            .plan-page {
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
            .plan-page h1 { font-size: 1.25rem !important; }
          }
        `}        </style>
      </div>

      {/* Minty Chat — conversational planning + food logging (paid) */}
      <AssistantFab members={members} />
    </>
  )
}