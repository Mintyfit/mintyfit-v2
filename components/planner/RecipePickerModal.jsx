'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { normalizeRecipe } from '@/lib/recipe/normalizeRecipe'

export default function RecipePickerModal({ mealType, userId, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('recent') // 'recent' | 'favourites' | 'all'
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const supabase = createClient()
    if (!supabase) return

    setLoading(true)
    const query = supabase
      .from('recipes')
      .select('*')
      .or(`is_public.eq.true,profile_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(60)

    query.then(({ data }) => {
      setRecipes((data || []).map(normalizeRecipe).filter(Boolean))
      setLoading(false)
    })
  }, [userId])

  const filtered = recipes.filter(r => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!r.title?.toLowerCase().includes(q) && !r.cuisine_type?.toLowerCase().includes(q)) return false
    }
    if (tab === 'favourites') return r.is_favourite
    if (mealType && mealType !== 'snack2' && r.meal_type && r.meal_type !== mealType && r.meal_type !== 'snack2') {
      // Allow if mealType matches loosely
    }
    return true
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 640, background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Add recipe to {mealType?.replace('snack2', 'snack')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1 }}>×</button>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1.25rem' }}>
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes..."
            style={{
              width: '100%', padding: '0.625rem 1rem',
              border: '1px solid var(--border)', borderRadius: '10px',
              background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none',
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '0 1.25rem', borderBottom: '1px solid var(--border)' }}>
          {['recent', 'all'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: tab === t ? 700 : 400,
              color: tab === t ? 'var(--primary)' : 'var(--text-3)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
          <Link href="/recipes/generate" style={{
            marginLeft: 'auto', padding: '0.5rem 0.875rem',
            fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>
            ✨ Generate new
          </Link>
        </div>

        {/* Recipe list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem' }}>
          {loading ? (
            <p style={{ color: 'var(--text-4)', textAlign: 'center', padding: '2rem' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-4)', textAlign: 'center', padding: '2rem' }}>No recipes found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem', borderRadius: '10px',
                    border: '1px solid var(--border)', background: 'var(--bg-page)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', position: 'relative' }}>
                    {recipe.image ? (
                      <Image src={recipe.image} alt={recipe.title} fill style={{ objectFit: 'cover' }} sizes="48px" />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🍽️</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {recipe.meal_type} · {recipe.nutrition?.perServing?.energy_kcal ? `${Math.round(recipe.nutrition.perServing.energy_kcal)} kcal` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
