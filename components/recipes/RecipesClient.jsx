'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import RecipeCard from './RecipeCard'
import { createClient } from '@/lib/supabase/client'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'

// Keep in sync with app/recipes/page.jsx — slim columns, kcal only.
const LIST_COLUMNS = 'id,slug,title,description,image_url,image_thumb_url,meal_type,food_type,cuisine_type,glycemic_load,price_level,calorie_range,cooking_technique,prep_time_minutes,cook_time_minutes,is_public,profile_id,created_at,updated_at,calories_kcal:nutrition->perServing->energy_kcal'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']
const FOOD_TYPES = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo']
const CUISINES = ['Italian', 'Asian', 'Mediterranean', 'Mexican', 'American', 'Indian', 'Middle Eastern', 'French']
const GL_OPTIONS = ['low', 'medium', 'high']
const CAL_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Under 300', min: 0, max: 300 },
  { label: '300–500', min: 300, max: 500 },
  { label: '500–700', min: 500, max: 700 },
  { label: '700+', min: 700, max: Infinity },
]
// Total time = prep + cook (minutes)
const TIME_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: '≤15 min', min: 0, max: 16 },
  { label: '15–30 min', min: 15, max: 31 },
  { label: '30–60 min', min: 30, max: 61 },
  { label: '60+ min', min: 60, max: Infinity },
]
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'calories-asc', label: 'Calories ↑' },
  { value: 'calories-desc', label: 'Calories ↓' },
]

const PAGE_SIZE = 12

export default function RecipesClient({ initialRecipes = [] }) {
  const [allRecipes, setAllRecipes] = useState(initialRecipes)

  // Fetch the logged-in user's private recipes client-side (avoids making the
  // server route dynamic, which would bust the ISR cache on every request)
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      // Check sessionStorage cache first
      const cacheKey = 'mintyfit:recipes:user:' + user.id
      let cached
      try { cached = JSON.parse(sessionStorage.getItem(cacheKey)) } catch {}
      if (cached?.length) {
        setAllRecipes(prev => {
          const ids = new Set(prev.map(r => r.id))
          return [...prev, ...cached.filter(r => !ids.has(r.id))]
        })
        return
      }
      supabase
        .from('recipes')
        .select(LIST_COLUMNS)
        .eq('profile_id', user.id)
        .eq('is_public', false)
        .order('created_at', { ascending: false })
        .limit(100)
        .then(({ data }) => {
          if (!data?.length) return
          const normalized = data.map(normalizeRecipe).filter(Boolean)
          try { sessionStorage.setItem(cacheKey, JSON.stringify(normalized)) } catch {}
          setAllRecipes(prev => {
            const ids = new Set(prev.map(r => r.id))
            return [...prev, ...normalized.filter(r => !ids.has(r.id))]
          })
        })
    })
  }, [])

  const [search, setSearch] = useState('')
  const [mealType, setMealType] = useState('')
  const [foodType, setFoodType] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [gl, setGl] = useState('')
  const [calRange, setCalRange] = useState(0)
  const [timeRange, setTimeRange] = useState(0)
  const [sort, setSort] = useState('newest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'grid'
    try { return sessionStorage.getItem('mintyfit:recipes:view') || 'grid' } catch { return 'grid' }
  })

  function setView(mode) {
    setViewMode(mode)
    try { sessionStorage.setItem('mintyfit:recipes:view', mode) } catch {}
  }

  const filtered = useMemo(() => {
    let list = [...allRecipes]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.cuisine_type?.toLowerCase().includes(q)
      )
    }
    if (mealType) list = list.filter(r => r.meal_type === mealType)
    if (foodType) list = list.filter(r => r.food_type === foodType)
    if (cuisine) list = list.filter(r => r.cuisine_type?.toLowerCase().includes(cuisine.toLowerCase()))
    if (gl) list = list.filter(r => r.glycemic_load === gl)
    const { min, max } = CAL_RANGES[calRange]
    if (min > 0 || max < Infinity) {
      list = list.filter(r => {
        const kcal = r.nutrition?.perServing?.energy_kcal ?? 0
        return kcal >= min && kcal < max
      })
    }
    const { min: tMin, max: tMax } = TIME_RANGES[timeRange]
    if (tMin > 0 || tMax < Infinity) {
      list = list.filter(r => {
        const total = (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0)
        return total >= tMin && total < tMax
      })
    }

    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    else if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    else if (sort === 'calories-asc') list.sort((a, b) => (a.nutrition?.perServing?.energy_kcal || 0) - (b.nutrition?.perServing?.energy_kcal || 0))
    else if (sort === 'calories-desc') list.sort((a, b) => (b.nutrition?.perServing?.energy_kcal || 0) - (a.nutrition?.perServing?.energy_kcal || 0))

    return list
  }, [allRecipes, search, mealType, foodType, cuisine, gl, calRange, timeRange, sort])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const resetFilters = useCallback(() => {
    setSearch('')
    setMealType('')
    setFoodType('')
    setCuisine('')
    setGl('')
    setCalRange(0)
    setTimeRange(0)
    setSort('newest')
    setVisibleCount(PAGE_SIZE)
  }, [])

  const hasActiveFilters = mealType || foodType || cuisine || gl || calRange > 0 || timeRange > 0

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>Recipes</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.9375rem' }}>{filtered.length} recipe{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/recipes/generate" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--primary)', color: '#fff',
          padding: '0.625rem 1.25rem', borderRadius: '10px',
          textDecoration: 'none', fontWeight: 600, fontSize: '0.9375rem',
          whiteSpace: 'nowrap',
        }}>
          ✨ Generate with AI
        </Link>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}>
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
            placeholder="Search recipes..."
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem 0.625rem 2.25rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              color: 'var(--text-1)',
              fontSize: '0.9375rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setVisibleCount(PAGE_SIZE) }}
          style={{
            padding: '0.625rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--bg-card)',
            color: 'var(--text-2)',
            fontSize: '0.9375rem',
            cursor: 'pointer',
          }}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.625rem 1rem',
            border: `1px solid ${hasActiveFilters ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '8px',
            background: hasActiveFilters ? 'rgba(61,138,62,0.08)' : 'var(--bg-card)',
            color: hasActiveFilters ? 'var(--primary)' : 'var(--text-2)',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: hasActiveFilters ? 600 : 400,
            whiteSpace: 'nowrap',
          }}
        >
          ⚙️ Filters {hasActiveFilters ? '●' : ''}
        </button>

        {/* View toggle */}
        <button
          onClick={() => setView(viewMode === 'grid' ? 'list' : 'grid')}
          title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.625rem 0.875rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--bg-card)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            whiteSpace: 'nowrap',
          }}
        >
          {viewMode === 'grid' ? '📋 List' : '🔲 Grid'}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}>
          {/* Meal type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Meal Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {['', ...MEAL_TYPES].map(m => (
                <button
                  key={m || 'all'}
                  onClick={() => { setMealType(m); setVisibleCount(PAGE_SIZE) }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '20px',
                    border: `1px solid ${mealType === m ? 'var(--primary)' : 'var(--border)'}`,
                    background: mealType === m ? 'var(--primary)' : 'transparent',
                    color: mealType === m ? '#fff' : 'var(--text-2)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {m || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Food type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Diet</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {['', ...FOOD_TYPES].map(f => (
                <button
                  key={f || 'all'}
                  onClick={() => { setFoodType(f); setVisibleCount(PAGE_SIZE) }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '20px',
                    border: `1px solid ${foodType === f ? 'var(--primary)' : 'var(--border)'}`,
                    background: foodType === f ? 'var(--primary)' : 'transparent',
                    color: foodType === f ? '#fff' : 'var(--text-2)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {f || 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Cuisine</label>
            <select
              value={cuisine}
              onChange={e => { setCuisine(e.target.value); setVisibleCount(PAGE_SIZE) }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                color: 'var(--text-2)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">All cuisines</option>
              {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Calories */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Calories / Serving</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {CAL_RANGES.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { setCalRange(i); setVisibleCount(PAGE_SIZE) }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '20px',
                    border: `1px solid ${calRange === i ? 'var(--primary)' : 'var(--border)'}`,
                    background: calRange === i ? 'var(--primary)' : 'transparent',
                    color: calRange === i ? '#fff' : 'var(--text-2)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total time (prep + cook) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Total Time</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {TIME_RANGES.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { setTimeRange(i); setVisibleCount(PAGE_SIZE) }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '20px',
                    border: `1px solid ${timeRange === i ? 'var(--primary)' : 'var(--border)'}`,
                    background: timeRange === i ? 'var(--primary)' : 'transparent',
                    color: timeRange === i ? '#fff' : 'var(--text-2)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Glycemic load */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Glycemic Load</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {['', ...GL_OPTIONS].map(g => (
                <button
                  key={g || 'all'}
                  onClick={() => { setGl(g); setVisibleCount(PAGE_SIZE) }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '20px',
                    border: `1px solid ${gl === g ? 'var(--primary)' : 'var(--border)'}`,
                    background: gl === g ? 'var(--primary)' : 'transparent',
                    color: gl === g ? '#fff' : 'var(--text-2)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {g || 'Any'}
                </button>
              ))}
            </div>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={resetFilters}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recipe grid / list */}
      {visible.length > 0 ? viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}>
          {visible.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {visible.map(recipe => {
            const slug = recipe.slug || recipe.id
            const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)
            const calories = recipe.nutrition?.perServing?.energy_kcal
            const imageSrc = recipe.image_thumb_url || recipe.image_url
            return (
              <Link key={recipe.id} href={`/recipes/${slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  {imageSrc ? (
                    <img src={imageSrc} alt={recipe.title}
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>🍽️</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {recipe.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem', color: 'var(--text-3)', flexWrap: 'wrap' }}>
                      {recipe.meal_type && (
                        <span style={{ textTransform: 'capitalize' }}>{recipe.meal_type.replace('snack2', 'snack')}</span>
                      )}
                      {calories != null && <span>{Math.round(calories)} kcal</span>}
                      {totalTime > 0 && <span>{totalTime} min</span>}
                      {recipe.cuisine_type && <span>{recipe.cuisine_type}</span>}
                      {recipe.food_type && <span style={{ textTransform: 'capitalize' }}>{recipe.food_type}</span>}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-4)', fontSize: '1.125rem' }}>→</span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          color: 'var(--text-3)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-2)' }}>No recipes found</h3>
          <p style={{ marginBottom: '1.5rem' }}>Try adjusting your search or filters, or generate a new recipe.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {hasActiveFilters && (
              <button onClick={resetFilters} style={{
                padding: '0.625rem 1.25rem', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9375rem',
              }}>
                Clear filters
              </button>
            )}
            <Link href="/recipes/generate" style={{
              padding: '0.625rem 1.25rem', borderRadius: '8px',
              background: 'var(--primary)', color: '#fff',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.9375rem',
            }}>
              ✨ Generate a recipe
            </Link>
          </div>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
            style={{
              padding: '0.75rem 2rem', borderRadius: '10px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
            }}
          >
            Load More Recipes
          </button>
        </div>
      )}
    </div>
  )
}
