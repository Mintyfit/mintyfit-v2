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

export default function PlannerClient({ userId, profile, members }) {
  const [today] = useState(() => new Date())
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [entries, setEntries] = useState({}) // { 'YYYY-MM-DD': { breakfast: [...], ... } }
  const [activities, setActivities] = useState({}) // { 'YYYY-MM-DD': { memberId: [activityObj] } }
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('week') // 'week' | 'day'
  const touchStartX = useRef(null)

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
            onClick={async () => {
              // TASK 5.7: Shopping list generation placeholder
              alert('Shopping list generation coming in Session 06!')
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

      {/* Week overview grid */}
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
        />
      )}

      <style>{`
        @media (max-width: 640px) {
          .mobile-date-strip { display: block !important; margin-bottom: 1rem; }
        }
      `}</style>
    </div>
  )
}
