import { NUTRITION_FIELDS } from './nutrition'
import { computeMemberDailyNeeds } from './memberRDA'

export const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']

const MEAL_WEIGHTS = {
  1: { breakfast: 0, snack: 0, lunch: 0, snack2: 0, dinner: 1.0 },
  2: { breakfast: 0.35, snack: 0, lunch: 0, snack2: 0, dinner: 0.65 },
  3: { breakfast: 0.30, snack: 0, lunch: 0.35, snack2: 0, dinner: 0.35 },
  4: { breakfast: 0.20, snack: 0.10, lunch: 0.35, snack2: 0, dinner: 0.35 },
  5: { breakfast: 0.25, snack: 0.10, lunch: 0.30, snack2: 0.10, dinner: 0.25 },
}

export function getMealWeights(mealsPerDay) {
  return { ...(MEAL_WEIGHTS[mealsPerDay] || MEAL_WEIGHTS[3]) }
}

export function getMealWeight(mealType, enabledMealTypes, mealsPerDay) {
  const all = getMealWeights(mealsPerDay)
  if (!all[mealType]) return 0
  const types = enabledMealTypes && enabledMealTypes.length ? enabledMealTypes : MEAL_TYPES
  const total = types.reduce((s, t) => s + (all[t] || 0), 0)
  if (total <= 0) return all[mealType]
  return all[mealType] / total
}

export function getPersonMealTarget(member, mealType, enabledMealTypes, mealsPerDay) {
  const weight = getMealWeight(mealType, enabledMealTypes, mealsPerDay)
  return (member.baseDailyCalories || 2000) * weight
}

/**
 * Compute the full meal budget for a recipe and set of eaters.
 *
 * @param {Array} eaters  - Family member objects (must have id, baseDailyCalories)
 * @param {Object|null} recipeTotals - recipe.nutrition.totals (with energy_kcal at minimum)
 * @param {string} mealType - 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'snack2'
 * @param {Array} enabledMealTypes - active meal slots for this day (for weight normalization)
 * @param {number} mealsPerDay - 3 or 5
 * @returns {Object} { familyMealTarget, batchScale, eaters: [...], personalNutrition }
 */
export function computeMealBudget(eaters, recipeTotals, mealType, enabledMealTypes, mealsPerDay) {
  const mealKcal = recipeTotals?.energy_kcal || 0

  const eaterData = eaters.map(m => {
    const personMealTarget = getPersonMealTarget(m, mealType, enabledMealTypes, mealsPerDay)
    return { member: m, personMealTarget }
  })

  const familyMealTarget = eaterData.reduce((s, e) => s + e.personMealTarget, 0)

  const batchScale = mealKcal > 0 ? familyMealTarget / mealKcal : 1

  const eatersWithShare = eaterData.map(e => {
    const personShare = familyMealTarget > 0 ? e.personMealTarget / familyMealTarget : 0
    let personNutrition = null
    if (recipeTotals && batchScale > 0 && personShare > 0) {
      personNutrition = {}
      for (const field of NUTRITION_FIELDS) {
        const val = recipeTotals[field.key]
        if (typeof val === 'number') {
          personNutrition[field.key] = val * batchScale * personShare
        }
      }
    }
    return {
      member: e.member,
      personMealTarget: e.personMealTarget,
      personShare,
      personNutrition,
    }
  })

  let personalNutrition = null
  if (recipeTotals && batchScale > 0) {
    personalNutrition = {}
    for (const field of NUTRITION_FIELDS) {
      const val = recipeTotals[field.key]
      if (typeof val === 'number') {
        personalNutrition[field.key] = val * batchScale
      }
    }
  }

  return {
    familyMealTarget,
    batchScale,
    eaters: eatersWithShare,
    personalNutrition,
  }
}

/**
 * Compute per-member daily breakdown from calendar entries using meal budget model.
 */
export function computeMealBudgetDayBreakdown(entries, members, enabledMealTypes, selectedMemberIds) {
  const meals = enabledMealTypes && enabledMealTypes.length ? enabledMealTypes : MEAL_TYPES
  const isChecked = (id) => selectedMemberIds ? selectedMemberIds.has(id) : true

  const perMember = {}
  for (const m of members) perMember[m.id] = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

  for (const mealType of meals) {
    for (const entry of entries[mealType] || []) {
      const consumers = entry.consumer_member_ids
        || (entry.member_id ? [entry.member_id] : members.map(m => m.id))
      const relevantConsumers = consumers.filter(c => isChecked(c))
      if (relevantConsumers.length === 0) continue

      const consumerMembers = members.filter(m => relevantConsumers.includes(m.id))
      const recipeTotals = entry.recipes?.nutrition?.totals

      if (recipeTotals) {
        const budget = computeMealBudget(consumerMembers, recipeTotals, mealType, meals, 3)
        for (const eater of budget.eaters) {
          if (!perMember[eater.member.id]) continue
          const n = eater.personNutrition
          if (!n) continue
          perMember[eater.member.id].kcal += n.energy_kcal || 0
          perMember[eater.member.id].protein += n.protein || 0
          perMember[eater.member.id].carbs += n.carbs_total || 0
          perMember[eater.member.id].fat += n.fat_total || 0
        }
      } else {
        const fallback = entry.personal_nutrition
        if (!fallback) continue
        const count = consumers.length || 1
        for (const memberId of relevantConsumers) {
          if (!perMember[memberId]) continue
          const share = 1 / count
          perMember[memberId].kcal += (fallback.energy_kcal || 0) * share
          perMember[memberId].protein += (fallback.protein || 0) * share
          perMember[memberId].carbs += (fallback.carbs_total || 0) * share
          perMember[memberId].fat += (fallback.fat_total || 0) * share
        }
      }
    }
  }

  return perMember
}

/**
 * Compute full-day nutrition totals across all 47 nutrients for checked members.
 */
export function computeMealBudgetDayNutrition(entries, members, enabledMealTypes, selectedMemberIds) {
  const meals = enabledMealTypes && enabledMealTypes.length ? enabledMealTypes : MEAL_TYPES
  const isChecked = (id) => selectedMemberIds ? selectedMemberIds.has(id) : true

  const consumed = {}
  const targets = {}

  for (const m of members) {
    if (!isChecked(m.id)) continue
    const needs = computeMemberDailyNeeds(m)
    if (!needs) continue
    for (const [k, v] of Object.entries(needs)) {
      if (typeof v === 'number') targets[k] = (targets[k] || 0) + v
    }
  }

  for (const mealType of meals) {
    for (const entry of entries[mealType] || []) {
      const consumers = entry.consumer_member_ids
        || (entry.member_id ? [entry.member_id] : members.map(m => m.id))
      const relevantConsumers = consumers.filter(c => isChecked(c))
      if (relevantConsumers.length === 0) continue

      const consumerMembers = members.filter(m => relevantConsumers.includes(m.id))
      const recipeTotals = entry.recipes?.nutrition?.totals

      if (recipeTotals) {
        const budget = computeMealBudget(consumerMembers, recipeTotals, mealType, meals, 3)
        if (budget.personalNutrition) {
          for (const [k, v] of Object.entries(budget.personalNutrition)) {
            if (typeof v === 'number') consumed[k] = (consumed[k] || 0) + v
          }
        }
      } else {
        const fallback = entry.personal_nutrition
        if (!fallback) continue
        const count = consumers.length || 1
        const share = relevantConsumers.length / count
        for (const [k, v] of Object.entries(fallback)) {
          if (typeof v === 'number') consumed[k] = (consumed[k] || 0) + v * share
        }
      }
    }
  }

  return { consumed, targets }
}
