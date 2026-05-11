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
  journals = {},
  members,
  activeMembers,
  userId,
  familyId,
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
    const activityKcal = memberActivities.reduce((sum, act) => sum + (act.calories_burned || act.calories || 0), 0)
    const target = baseTarget + activityKcal

    let consumed = 0
    for (const mealType of MEAL_TYPES) {
      for (const entry of entries[mealType] || []) {
        const kcal = entry.recipes?.nutrition?.perServing?.energy_kcal || 0
        if (!entry.member_id || entry.member_id === member.id) {
          consumed += kcal / Math.max(1, members.length)
        }
      }
      for (const je of journals[mealType] || []) {
        if (!je.member_id || je.member_id === member.id) {
          consumed += je.nutrition?.energy_kcal || 0
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

  // Per-entry consumer toggle. Lets one card hold "Dad + kids" while a
  // sibling card holds "Mom only" in the same meal slot. Writes directly
  // to the entry row, then refreshes the day.
  async function toggleConsumer(entryId, memberId, currentIds) {
    const supabase = createClient()
    if (!supabase) return
    const next = new Set(currentIds || [])
    if (next.has(memberId)) next.delete(memberId)
    else next.add(memberId)
    await supabase
      .from('calendar_entries')
      .update({ consumer_member_ids: Array.from(next) })
      .eq('id', entryId)
    onRefresh(dateKey)
  }

  async function handleAddRecipe(recipe, mealType) {
    const supabase = createClient()
    if (!supabase) return
    // One row per (slot, recipe). Eaters live in consumer_member_ids — same
    // pattern as PlannerClient.saveRecipeToDay (post-mig 049). Per-member
    // nutrition is computed at read time by DayStatsPanel, not stored as
    // separate rows.
    const targetMembers = (activeMembers && activeMembers.length > 0) ? activeMembers : members
    const row = {
      profile_id: userId,
      family_id: familyId || null,
      date_str: dateKey,
      meal_type: mealType,
      recipe_id: recipe.id,
      recipe_name: recipe.title || '',
      member_id: null,
      consumer_member_ids: targetMembers.map(m => m.id),
      personal_nutrition: recipe.nutrition?.totals || recipe.nutrition?.perServing || null,
      origin: 'planned',
    }
    await supabase
      .from('calendar_entries')
      .upsert([row], { onConflict: 'family_id,date_str,meal_type,recipe_id,origin' })
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
                    <span style={{ color: 'var(--text-2)', flex: 1 }}>{act.activity_type || act.activity_text} {(act.duration_minutes || act.time_minutes) ? `${act.duration_minutes || act.time_minutes} min` : ''}</span>
                    {(act.calories_burned || act.calories) ? <span style={{ color: '#6366f1', fontWeight: 600 }}>-{act.calories_burned || act.calories} kcal</span> : null}
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

            {(() => {
              // Variant stacking: in one slot, the entry with the most consumers
              // is the headline (largest card). Others render as compact variant
              // cards beneath it, so "Dad has eggs / Kids have oatmeal" is one
              // visual group, not two equal-weight rows.
              const recipeEntries = slotEntries.filter(e => e.recipes)
              const ranked = [...recipeEntries].sort((a, b) =>
                (b.consumer_member_ids?.length || 0) - (a.consumer_member_ids?.length || 0)
              )
              return ranked.map((entry, idx) => {
                const r = entry.recipes
                const slug = r?.slug || r?.id
                const kcal = r?.nutrition?.perServing?.energy_kcal
                const consumers = (entry.consumer_member_ids || [])
                  .map(id => members.find(m => m.id === id))
                  .filter(Boolean)
                const isLogged = entry.origin === 'logged'
                const isVariant = idx > 0
                const imgSize = isVariant ? 32 : 44
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: isVariant ? '0.4rem 0.625rem' : '0.625rem',
                      background: isLogged ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
                      borderRadius: '10px',
                      border: `1px solid ${isLogged ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                      marginBottom: '0.5rem',
                      marginLeft: isVariant ? '1.25rem' : 0,
                    }}
                  >
                    {r?.image_url ? (
                      <div style={{ width: imgSize, height: imgSize, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', position: 'relative' }}>
                        <Image src={r.image_url} alt={r.title} fill style={{ objectFit: 'cover' }} sizes={`${imgSize}px`} />
                      </div>
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <Link
                          href={`/recipes/${slug}?date=${dateKey}&meal=${mealType}`}
                          style={{ fontSize: isVariant ? '0.875rem' : '0.9375rem', fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {r?.title}
                        </Link>
                        {isLogged ? (
                          <span style={{ fontSize: '0.6875rem', color: '#6366f1', background: 'rgba(99,102,241,0.12)', borderRadius: '4px', padding: '0.1rem 0.375rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                            Logged
                          </span>
                        ) : null}
                      </div>
                      {kcal != null ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>
                          {Math.round(kcal)} kcal/serving
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.375rem' }}>
                        {members.map(m => {
                          const checked = (entry.consumer_member_ids || []).includes(m.id)
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleConsumer(entry.id, m.id, entry.consumer_member_ids)}
                              title={checked ? `Remove ${m.display_name || m.first_name}` : `Add ${m.display_name || m.first_name}`}
                              style={{
                                fontSize: '0.6875rem',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '999px',
                                border: `1px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                                background: checked ? 'var(--primary)' : 'transparent',
                                color: checked ? '#fff' : 'var(--text-3)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                lineHeight: 1.4,
                                userSelect: 'none',
                              }}
                            >
                              {m.display_name || m.first_name || 'Member'}
                            </button>
                          )
                        })}
                      </div>
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
              })
            })()}

            {(journals[mealType] || []).map((je, i) => {
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
                  {je.id ? (
                    <button
                      onClick={async () => {
                        const supabase = createClient()
                        if (!supabase) return
                        await supabase.from('food_journal').delete().eq('id', je.id)
                        onRefresh(dateKey)
                      }}
                      style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-4)', cursor: 'pointer', fontSize: '0.875rem', flexShrink: 0 }}
                      aria-label="Remove journal entry"
                    >×</button>
                  ) : null}
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

      {!embedded && (
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
      )}

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
