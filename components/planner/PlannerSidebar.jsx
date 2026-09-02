'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toDateKey } from '@/lib/utils/dateKey'
import { MEAL_LABELS, MEAL_ICONS } from './plannerConstants'

/**
 * PlannerSidebar — recipe/menu browser (planner column 1).
 * Owns its data loading (search, filter, pagination, menus tab).
 * Parent wires actions via props (add-to-plan, drag-and-drop).
 */
export default function PlannerSidebar({
  userId, selectedDate, today, addingToMeal,
  onTapAddRecipe, onApplyMenu,
  onRecipeDragStart, onRecipeDragEnd, onMenuDragStart, onMenuDragEnd,
}) {
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


  return (
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
                          onDragStart={() => onMenuDragStart(menu)}
                          onDragEnd={onMenuDragEnd}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.375rem', background: 'var(--bg-page)', cursor: 'grab', userSelect: 'none' }}
                        >
                          {menu.image_url && (
                            <img src={menu.image_url} alt="" style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <span style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-1)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {menu.name}
                          </span>
                          <button
                            onClick={() => onApplyMenu(menu, toDateKey(selectedDate || today))}
                            disabled={addingToMeal}
                            aria-label={`Add ${menu.name} to plan`}
                            title={selectedDate
                              ? `Start on ${selectedDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}`
                              : 'Start today'}
                            style={{
                              width: 40, height: 40, borderRadius: '50%',
                              border: 'none', background: 'var(--primary)', color: '#fff',
                              fontSize: '1.25rem', fontWeight: 700, cursor: addingToMeal ? 'wait' : 'pointer',
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
                        onDragStart={() => onRecipeDragStart(r)}
                        onDragEnd={onRecipeDragEnd}
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
                          onClick={() => onTapAddRecipe(r)}
                          aria-label={`Add ${r.title} to plan`}
                          title={selectedDate
                            ? `Add to ${selectedDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}`
                            : 'Add to today'}
                          style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: 'none', background: 'var(--primary)', color: '#fff',
                            fontSize: '1.25rem', fontWeight: 700, cursor: 'pointer',
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
  )
}
