'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const DIET_TYPES = ['All', 'Mediterranean', 'Plant-based', 'High-protein', 'Low-carb', 'Balanced', 'Vegetarian', 'Vegan']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'az', label: 'A → Z' },
  { value: 'popular', label: 'Most recipes' },
]

function MenuCard({ menu }) {
  const recipeCount = menu.menu_recipes?.[0]?.count ?? menu.recipe_count ?? 0
  const slug = menu.slug || menu.id

  return (
    <Link href={`/menus/${slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
      >
        {/* Image */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#f3f4f6', flexShrink: 0 }}>
          {menu.image_url ? (
            <Image src={menu.image_url} alt={menu.name} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🥗</div>
          )}
          {/* Recipe count badge */}
          <div style={{
            position: 'absolute', bottom: '0.5rem', right: '0.5rem',
            background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: '20px',
            padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
          }}>
            {recipeCount} recipes
          </div>
        </div>

        <div style={{ padding: '0.875rem' }}>
          <h3 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
            {menu.name}
          </h3>
          {menu.description && (
            <p style={{
              margin: '0 0 0.625rem', fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.5,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {menu.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {menu.diet_type && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'rgba(61,138,62,0.1)', color: 'var(--primary)' }}>
                {menu.diet_type}
              </span>
            )}
            {menu.duration_weeks && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '20px', background: 'var(--bg-page)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                {menu.duration_weeks} weeks
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function MenusClient({ initialMenus }) {
  const [search, setSearch] = useState('')
  const [diet, setDiet] = useState('All')
  const [sort, setSort] = useState('newest')

  const filtered = useMemo(() => {
    let result = [...initialMenus]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      )
    }
    if (diet !== 'All') {
      result = result.filter(m => m.diet_type === diet)
    }
    if (sort === 'az') result.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'popular') {
      result.sort((a, b) => {
        const ac = a.menu_recipes?.[0]?.count ?? 0
        const bc = b.menu_recipes?.[0]?.count ?? 0
        return bc - ac
      })
    } else {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
    return result
  }, [initialMenus, search, diet, sort])

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 0.375rem' }}>Meal Plans</h1>
        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.9375rem' }}>
          Curated week-by-week plans for every goal and dietary need
        </p>
      </div>

      {/* Search + sort row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search meal plans…"
          style={{
            flex: 1, minWidth: '200px', padding: '0.625rem 1rem',
            border: '1px solid var(--border)', borderRadius: '10px',
            background: 'var(--bg-card)', color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none',
          }}
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: '0.9375rem' }}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Diet filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {DIET_TYPES.map(d => (
          <button
            key={d}
            onClick={() => setDiet(d)}
            style={{
              padding: '0.375rem 0.875rem', borderRadius: '20px', border: `1.5px solid ${diet === d ? 'var(--primary)' : 'var(--border)'}`,
              background: diet === d ? 'rgba(61,138,62,0.1)' : 'transparent',
              color: diet === d ? 'var(--primary)' : 'var(--text-2)',
              fontSize: '0.8125rem', fontWeight: diet === d ? 600 : 400, cursor: 'pointer',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-4)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🥗</p>
          <p style={{ fontSize: '1rem' }}>{initialMenus.length === 0 ? 'No meal plans yet' : 'No plans match your search'}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {filtered.map(menu => <MenuCard key={menu.id} menu={menu} />)}
        </div>
      )}
    </div>
  )
}
