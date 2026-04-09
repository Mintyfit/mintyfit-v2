'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const MEAL_TYPE_LABELS = {
  breakfast: '🌅 Breakfast',
  snack: '🍎 Morning Snack',
  lunch: '☀️ Lunch',
  snack2: '🍊 Afternoon Snack',
  dinner: '🌙 Dinner',
}
const MEAL_TYPE_ORDER = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']

// ── Nutrition pill ────────────────────────────────────────────────────────────
function NutrientPill({ label, value, unit = 'g', color = 'var(--primary)' }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0.625rem 1rem', borderRadius: '10px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      minWidth: '72px',
    }}>
      <span style={{ fontSize: '1rem', fontWeight: 700, color }}>{Math.round(value)}{unit}</span>
      <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: '2px' }}>{label}</span>
    </div>
  )
}

// ── Recipe row within menu ────────────────────────────────────────────────────
function RecipeRow({ mr }) {
  const { recipe } = mr
  if (!recipe) return null
  const kcal = recipe.nutrition?.perServing?.energy_kcal
  return (
    <Link href={`/recipes/${recipe.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        padding: '0.75rem', borderRadius: '10px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        transition: 'transform 0.1s, box-shadow 0.1s', cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
      >
        {/* Thumbnail */}
        <div style={{ width: 56, height: 56, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', position: 'relative' }}>
          {recipe.image_url ? (
            <Image src={recipe.image_url} alt={recipe.name} fill style={{ objectFit: 'cover' }} sizes="56px" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🍽️</div>
          )}
        </div>
        {/* Name + metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-1)', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recipe.name}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            {recipe.servings && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>👥 {recipe.servings} servings</span>
            )}
            {recipe.prep_time_minutes && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>⏱ {recipe.prep_time_minutes}min</span>
            )}
            {kcal && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>🔥 {Math.round(kcal)} kcal</span>
            )}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </Link>
  )
}

// ── Date picker modal ("Use this plan") ──────────────────────────────────────
function UsePlanModal({ menu, userId, onClose }) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(() => {
    // Default to next Monday
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleApply() {
    if (!userId) {
      router.push('/?auth=login')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/menus/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: menu.id, start_date: startDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to apply plan')
      router.push(`/plan?week=${startDate}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem',
        width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)' }}>
          Use this plan
        </h2>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-3)' }}>
          All recipes will be added to your calendar starting from the date you pick.
        </p>

        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.375rem' }}>
          Start date
        </label>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          style={{
            width: '100%', padding: '0.625rem 0.875rem', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--bg-page)',
            color: 'var(--text-1)', fontSize: '0.9375rem', marginBottom: '1.25rem',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.9375rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={loading || !startDate}
            style={{
              flex: 2, padding: '0.75rem', borderRadius: '8px',
              border: 'none', background: 'var(--primary)', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9375rem', fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Adding to calendar…' : 'Add to my calendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MenuDetailClient({ menu, userId }) {
  const [showUsePlan, setShowUsePlan] = useState(false)
  const [addingToShop, setAddingToShop] = useState(false)
  const [shopSuccess, setShopSuccess] = useState(false)
  const router = useRouter()

  // Compute average nutrition across all recipes
  const allRecipes = (menu.normalizedRecipes || []).map(mr => mr.recipe).filter(Boolean)
  const totalKcal = allRecipes.reduce((s, r) => s + (r.nutrition?.perServing?.energy_kcal || 0), 0)
  const avgKcal = allRecipes.length ? Math.round(totalKcal / allRecipes.length) : null

  // Group by meal type
  const byMealType = {}
  for (const mr of menu.normalizedRecipes || []) {
    const mt = mr.meal_type || 'other'
    if (!byMealType[mt]) byMealType[mt] = []
    byMealType[mt].push(mr)
  }
  const mealTypesPresent = MEAL_TYPE_ORDER.filter(mt => byMealType[mt]?.length > 0)
  const otherMeals = byMealType['other'] || []

  async function handleAddAllToShoppingList() {
    if (!userId) {
      router.push('/?auth=login')
      return
    }
    setAddingToShop(true)
    setShopSuccess(false)
    try {
      // Add each recipe's ingredients one by one
      const recipeIds = allRecipes.map(r => r.id).filter(Boolean)
      for (const recipe_id of recipeIds) {
        await fetch('/api/shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe_id }),
        })
      }
      setShopSuccess(true)
      setTimeout(() => setShopSuccess(false), 3000)
    } catch {
      // silent fail
    } finally {
      setAddingToShop(false)
    }
  }

  return (
    <>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 0 5rem' }}>
        {/* Hero image */}
        {menu.image_url && (
          <div style={{ position: 'relative', width: '100%', paddingTop: '40%', background: '#f3f4f6' }}>
            <Image src={menu.image_url} alt={menu.name} fill style={{ objectFit: 'cover' }} priority sizes="860px" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4))' }} />
          </div>
        )}

        <div style={{ padding: '1.5rem 1.25rem 0' }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: '0.875rem' }}>
            <Link href="/menus" style={{ fontSize: '0.8125rem', color: 'var(--text-3)', textDecoration: 'none' }}>
              ← Meal Plans
            </Link>
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>
              {menu.name}
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {/* Add all to shopping list */}
              <button
                onClick={handleAddAllToShoppingList}
                disabled={addingToShop || allRecipes.length === 0}
                title="Add all ingredients to shopping list"
                style={{
                  padding: '0.625rem 1rem', borderRadius: '8px',
                  border: '1px solid var(--border)', background: shopSuccess ? 'rgba(61,138,62,0.1)' : 'var(--bg-card)',
                  color: shopSuccess ? 'var(--primary)' : 'var(--text-2)', cursor: addingToShop ? 'wait' : 'pointer',
                  fontSize: '0.875rem', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                }}
              >
                {shopSuccess ? '✅ Added!' : addingToShop ? '⏳ Adding…' : '🛒 Add to list'}
              </button>
              {/* Use plan CTA */}
              <button
                onClick={() => setShowUsePlan(true)}
                style={{
                  padding: '0.625rem 1.25rem', borderRadius: '8px',
                  border: 'none', background: 'var(--primary)', color: '#fff',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                }}
              >
                📅 Use this plan
              </button>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
            {menu.diet_type && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '20px', background: 'rgba(61,138,62,0.1)', color: 'var(--primary)' }}>
                {menu.diet_type}
              </span>
            )}
            {menu.duration_weeks && (
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '20px', background: 'var(--bg-page)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                {menu.duration_weeks} week{menu.duration_weeks > 1 ? 's' : ''}
              </span>
            )}
            {allRecipes.length > 0 && (
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '20px', background: 'var(--bg-page)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                {allRecipes.length} recipe{allRecipes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Description */}
          {menu.description && (
            <p style={{ margin: '0 0 1.25rem', color: 'var(--text-2)', fontSize: '0.9375rem', lineHeight: 1.65 }}>
              {menu.description}
            </p>
          )}

          {/* Nutrition summary bar */}
          {avgKcal && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '1rem', marginBottom: '1.75rem',
            }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Avg. per recipe
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <NutrientPill label="Calories" value={avgKcal} unit=" kcal" color="var(--primary)" />
                {(() => {
                  const totals = { protein: 0, carbs: 0, fat: 0 }
                  let n = 0
                  for (const r of allRecipes) {
                    const ns = r.nutrition?.perServing
                    if (!ns) continue
                    totals.protein += ns.protein_g || 0
                    totals.carbs += ns.carbohydrates_g || 0
                    totals.fat += ns.fat_g || 0
                    n++
                  }
                  if (!n) return null
                  return (
                    <>
                      <NutrientPill label="Protein" value={totals.protein / n} color="#3b82f6" />
                      <NutrientPill label="Carbs" value={totals.carbs / n} color="#f59e0b" />
                      <NutrientPill label="Fat" value={totals.fat / n} color="#ec4899" />
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Recipes grouped by meal type */}
          {mealTypesPresent.length > 0 ? (
            <div>
              {mealTypesPresent.map(mt => (
                <div key={mt} style={{ marginBottom: '2rem' }}>
                  <h2 style={{ margin: '0 0 0.875rem', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-1)' }}>
                    {MEAL_TYPE_LABELS[mt] || mt}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {byMealType[mt].map(mr => <RecipeRow key={mr.id} mr={mr} />)}
                  </div>
                </div>
              ))}
              {otherMeals.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ margin: '0 0 0.875rem', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-1)' }}>
                    🍴 Other
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {otherMeals.map(mr => <RecipeRow key={mr.id} mr={mr} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-4)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥗</p>
              <p>No recipes in this plan yet.</p>
            </div>
          )}
        </div>
      </div>

      {showUsePlan && (
        <UsePlanModal menu={menu} userId={userId} onClose={() => setShowUsePlan(false)} />
      )}
    </>
  )
}
