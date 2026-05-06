'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { computeMemberDailyNeeds } from '@/lib/nutrition/memberRDA'
import { computeMemberNutrition } from '@/lib/nutrition/portionCalc'
import RecipePickerModal from './RecipePickerModal'
import JournalEntryForm from './JournalEntryForm'
import ActivityForm from './ActivityForm'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  snack: 'Morning Snack',
  lunch: 'Lunch',
  snack2: 'Afternoon Snack',
  dinner: 'Dinner',
}

export default function DayAgenda({
  date,
  dateKey,
  entries,
  activities,
  members,
  userId,
  onBack,
  onRefresh,
  onRemoveEntry,
  embedded = false,
}) {
  const [openMeal, setOpenMeal] = useState(null)
  const [openJournal, setOpenJournal] = useState(null)
  const [openActivity, setOpenActivity] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const dayLabel = date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })

  const memberSummaries = members.map(member => {
    const needs = computeMemberDailyNeeds(member)
    const baseTarget = needs?.energy_kcal || member.daily_calories_target || 2000
    const memberActivities = activities[member.id] || []
    const activityKcal = memberActivities.reduce((sum, act) => sum + (act.calories_burned || 0), 0)
    const target = baseTarget + activityKcal

    let consumed = 0
    for (const mealType of MEAL_TYPES) {
      for (const entry of entries[mealType] || []) {
        const kcal = entry.recipes?.nutrition?.perServing?.energy_kcal || 0
        if (!entry.member_id || entry.member_id === member.id) {
          consumed += kcal / Math.max(1, members.length)
        }
        if (entry.journal_entries) {
          for (const je of entry.journal_entries) {
            if (!je.member_id || je.member_id === member.id) {
              consumed += je.nutrition?.energy_kcal || 0
            }
          }
        }
      }
    }

    const ratio = target > 0 ? Math.min(1, consumed / target) : 0
    return { member, activityKcal, target, consumed: Math.round(consumed), ratio }
  })

  async function handleRemove(entryId) {
    setRemovingId(entryId)
    await onRemoveEntry(entryId, dateKey)
    setRemovingId(null)
  }

  async function handleAddRecipe(recipe, mealType) {
    const supabase = createClient()
    if (!supabase) return
    const recipeTotals = recipe.nutrition?.totals || null

    let rows
    if (members.length > 0 && recipeTotals) {
      rows = members.map(member => ({
        profile_id: userId,
        date_str: dateKey,
        meal_type: mealType,
        recipe_id: recipe.id,
        member_id: member.id,
        personal_nutrition: computeMemberNutrition(member, members, recipeTotals, {}),
      }))
    } else {
      rows = [{
        profile_id: userId,
        date_str: dateKey,
        meal_type: mealType,
        recipe_id: recipe.id,
        member_id: null,
        personal_nutrition: recipe.nutrition?.perServing || null,
      }]
    }

    await supabase.from('calendar_entries').upsert(rows, {
      onConflict: 'profile_id,date_str,meal_type,recipe_id,member_id',
    })
    setOpenMeal(null)
    onRefresh(dateKey)
  }

  return (
    <div style={{ maxWidth: embedded ? 'none' : '680px', margin: embedded ? 0 : '0 auto', padding: embedded ? 0 : '1.5rem 1.25rem 5rem' }}>
      {!embedded && (
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0 }}
        >
          Back to Week
        </button>
      )}

      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1.5rem' }}>{dayLabel}</h2>

      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Activities</h3>
          <button
            onClick={() => setOpenActivity(true)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.625rem', fontSize: '0.8125rem', color: 'var(--text-2)', cursor: 'pointer' }}
          >
            + Add
          </button>
        </div>
        {Object.keys(activities).length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-4)', fontStyle: 'italic' }}>No activities logged</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {Object.entries(activities).flatMap(([memberId, acts]) =>
              acts.map((act, i) => {
                const m = members.find(x => x.id === memberId)
                return (
                  <div key={`${memberId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.875rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-2)' }}>{m?.display_name || m?.first_name || 'Member'}</span>
                    <span style={{ color: 'var(--text-3)' }}>-</span>
                    <span style={{ color: 'var(--text-2)', flex: 1 }}>{act.activity_type} {act.duration_minutes ? `${act.duration_minutes} min` : ''}</span>
                    {act.calories_burned ? <span style={{ color: '#6366f1', fontWeight: 600 }}>-{act.calories_burned} kcal</span> : null}
                  </div>
                )
              })
            )}
          </div>
        )}
      </section>

      {MEAL_TYPES.map(mealType => {
        const slotEntries = entries[mealType] || []
        return (
          <section key={mealType} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.625rem' }}>
              {MEAL_LABELS[mealType]}
            </h3>

            {slotEntries.filter(e => e.recipes).map(entry => {
              const r = entry.recipes
              const slug = r?.slug || r?.id
              const kcal = r?.nutrition?.perServing?.energy_kcal
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                  {r?.image_url ? (
                    <div style={{ width: 44, height: 44, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', position: 'relative' }}>
                      <Image src={r.image_url} alt={r.title} fill style={{ objectFit: 'cover' }} sizes="44px" />
                    </div>
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/recipes/${slug}?date=${dateKey}&meal=${mealType}`}
                      style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {r?.title}
                    </Link>
                    {kcal != null ? <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{Math.round(kcal)} kcal per serving</span> : null}
                  </div>
                  <button
                    onClick={() => handleRemove(entry.id)}
                    disabled={removingId === entry.id}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-4)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    X
                  </button>
                </div>
              )
            })}

            {slotEntries.filter(e => e.journal_entries).flatMap(e => e.journal_entries || []).map((je, i) => {
              const jeMember = je.member_id ? members.find(x => x.id === je.member_id) : null
              return (
                <div key={je.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.625rem', background: 'rgba(99,102,241,0.05)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '1rem' }}>J</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-1)', fontWeight: 500 }}>{je.food_name}</span>
                    {je.amount ? <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: '0.375rem' }}>{je.amount} {je.unit}</span> : null}
                    {je.nutrition?.energy_kcal ? <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: '0.375rem' }}>{Math.round(je.nutrition.energy_kcal)} kcal</span> : null}
                    {jeMember ? (
                      <span style={{ fontSize: '0.6875rem', color: 'var(--primary)', background: 'rgba(61,138,62,0.1)', borderRadius: '4px', padding: '0.1rem 0.375rem', marginLeft: '0.375rem', fontWeight: 500 }}>
                        {jeMember.display_name || jeMember.first_name}
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
              <button
                onClick={() => setOpenMeal(mealType)}
                style={{ padding: '0.4rem 0.875rem', borderRadius: '8px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                + Add recipe
              </button>
              <button
                onClick={() => setOpenJournal(mealType)}
                style={{ padding: '0.4rem 0.875rem', borderRadius: '8px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                + Journal
              </button>
            </div>
          </section>
        )
      })}

      <section style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.875rem' }}>Day Summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {memberSummaries.map(({ member, activityKcal, target, consumed, ratio }) => (
            <div key={member.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-1)' }}>
                  {member.display_name || member.first_name || 'Member'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {activityKcal > 0 ? (
                    <span style={{ fontSize: '0.75rem', color: '#6366f1', background: 'rgba(99,102,241,0.08)', borderRadius: '4px', padding: '0.1rem 0.375rem' }}>
                      +{activityKcal} active
                    </span>
                  ) : null}
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>
                    {consumed} / {Math.round(target)} kcal
                  </span>
                </div>
              </div>
              <div style={{ height: 8, background: 'var(--bg-page)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${ratio * 100}%`,
                  background: ratio >= 0.8 ? '#10b981' : ratio >= 0.5 ? '#f59e0b' : '#ef4444',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {openMeal ? (
        <RecipePickerModal
          mealType={openMeal}
          userId={userId}
          onSelect={recipe => handleAddRecipe(recipe, openMeal)}
          onClose={() => setOpenMeal(null)}
        />
      ) : null}
      {openJournal ? (
        <JournalEntryForm
          mealType={openJournal}
          dateKey={dateKey}
          userId={userId}
          members={members}
          onSave={() => { setOpenJournal(null); onRefresh(dateKey) }}
          onClose={() => setOpenJournal(null)}
        />
      ) : null}
      {openActivity ? (
        <ActivityForm
          dateKey={dateKey}
          userId={userId}
          members={members}
          onSave={() => { setOpenActivity(false); onRefresh(dateKey) }}
          onClose={() => setOpenActivity(false)}
        />
      ) : null}
    </div>
  )
}
