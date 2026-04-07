'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import RecipeCard from './RecipeCard'

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
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'calories-asc', label: 'Calories ↑' },
  { value: 'calories-desc', label: 'Calories ↓' },
]

const PAGE_SIZE = 12

export default function RecipesClient({ initialRecipes = [] }) {
  const [search, setSearch] = useState('')
  const [mealType, setMealType] = useState('')
  const [foodType, setFoodType] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [gl, setGl] = useState('')
  const [calRange, setCalRange] = useState(0) // index into CAL_RANGES
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let list = [...initialRecipes]

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

    if (sort === 'newest') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    else if (sort === 'oldest') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    else if (sort === 'calories-asc') list.sort((a, b) => (a.nutrition?.perServing?.energy_kcal || 0) - (b.nutrition?.perServing?.energy_kcal || 0))
    else if (sort === 'calories-desc') list.sort((a, b) => (b.nutrition?.perServing?.energy_kcal || 0) - (a.nutrition?.perServing?.energy_kcal || 0))

    return list
  }, [initialRecipes, search, mealType, foodType, cuisine, gl, calRange, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetFilters = useCallback(() => {
    setSearch('')
    setMealType('')
    setFoodType('')
    setCuisine('')
    setGl('')
    setCalRange(0)
    setSort('newest')
    setPage(1)
  }, [])

  const hasActiveFilters = mealType || foodType || cuisine || gl || calRange > 0

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
            onChange={e => { setSearch(e.target.value); setPage(1) }}
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
          onChange={e => { setSort(e.target.value); setPage(1) }}
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
                  onClick={() => { setMealType(m); setPage(1) }}
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
                  onClick={() => { setFoodType(f); setPage(1) }}
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
              onChange={e => { setCuisine(e.target.value); setPage(1) }}
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
                  onClick={() => { setCalRange(i); setPage(1) }}
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

          {/* Glycemic load */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem' }}>Glycemic Load</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {['', ...GL_OPTIONS].map(g => (
                <button
                  key={g || 'all'}
                  onClick={() => { setGl(g); setPage(1) }}
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

      {/* Recipe grid */}
      {paginated.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}>
          {paginated.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: page === 1 ? 'var(--text-4)' : 'var(--text-2)',
              cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.9375rem',
            }}
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} style={{ color: 'var(--text-4)', padding: '0 0.25rem' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    border: `1px solid ${p === page ? 'var(--primary)' : 'var(--border)'}`,
                    background: p === page ? 'var(--primary)' : 'var(--bg-card)',
                    color: p === page ? '#fff' : 'var(--text-2)',
                    cursor: 'pointer', fontSize: '0.9375rem', fontWeight: p === page ? 600 : 400,
                  }}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: page === totalPages ? 'var(--text-4)' : 'var(--text-2)',
              cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.9375rem',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
