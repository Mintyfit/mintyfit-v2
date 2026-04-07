'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const MEAL_TYPE_COLORS = {
  breakfast: { bg: '#fef3c7', color: '#92400e' },
  lunch:     { bg: '#d1fae5', color: '#065f46' },
  dinner:    { bg: '#dbeafe', color: '#1e40af' },
  snack:     { bg: '#fce7f3', color: '#9d174d' },
  snack2:    { bg: '#fce7f3', color: '#9d174d' },
}

const GL_LABELS = { low: '🟢 Low GL', medium: '🟡 Med GL', high: '🔴 High GL' }

export default function RecipeCard({ recipe, onFavouriteToggle }) {
  const [liked, setLiked] = useState(recipe.is_favourite || false)
  const [toggling, setToggling] = useState(false)

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const calories = recipe.nutrition?.perServing?.energy_kcal
  const mealStyle = MEAL_TYPE_COLORS[recipe.meal_type] || { bg: '#f3f4f6', color: '#374151' }
  const glLabel = recipe.glycemic_load ? GL_LABELS[recipe.glycemic_load] : null
  const slug = recipe.slug || recipe.id

  async function handleFavourite(e) {
    e.preventDefault()
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    const supabase = createClient()
    if (!supabase) { setToggling(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToggling(false); return }
    if (liked) {
      await supabase.from('recipe_favourites').delete().match({ profile_id: user.id, recipe_id: recipe.id })
    } else {
      await supabase.from('recipe_favourites').insert({ profile_id: user.id, recipe_id: recipe.id })
    }
    setLiked(v => !v)
    onFavouriteToggle?.(recipe.id, !liked)
    setToggling(false)
  }

  return (
    <Link href={`/recipes/${slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#f3f4f6' }}>
          {recipe.image ? (
            <Image
              src={recipe.image}
              alt={recipe.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', color: 'var(--text-4)',
            }}>
              🍽️
            </div>
          )}

          {/* Favourite button */}
          <button
            onClick={handleFavourite}
            aria-label={liked ? 'Remove from favourites' : 'Add to favourites'}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'transform 0.15s',
              opacity: toggling ? 0.5 : 1,
            }}
          >
            {liked ? '❤️' : '🤍'}
          </button>

          {/* Meal type badge */}
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            background: mealStyle.bg,
            color: mealStyle.color,
            padding: '0.2rem 0.6rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'capitalize',
          }}>
            {recipe.meal_type?.replace('snack2', 'snack') || 'Recipe'}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0.875rem 1rem' }}>
          <h3 style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--text-1)',
            marginBottom: '0.375rem',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {recipe.title}
          </h3>

          {recipe.description && (
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--text-3)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: '0.625rem',
            }}>
              {recipe.description}
            </p>
          )}

          {/* Meta row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            flexWrap: 'wrap',
            fontSize: '0.8125rem',
            color: 'var(--text-3)',
          }}>
            {totalTime > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ⏱️ {totalTime} min
              </span>
            )}
            {calories != null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                🔥 {Math.round(calories)} kcal
              </span>
            )}
            {glLabel && (
              <span style={{ fontSize: '0.75rem' }}>{glLabel}</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
