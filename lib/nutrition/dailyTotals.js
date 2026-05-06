import { sumNutrition } from './nutrition'
import { calculateTotalActivityLoss } from './activityNutrientLoss'

const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'snack2', 'dinner']

/**
 * Calculate total daily nutrition from all meals and activities
 * @param {Object} dayEntries - { breakfast: [...], lunch: [...], ... }
 * @param {Object} activities - { memberId: [activityObj], ... }
 *   Each activityObj: { activity_text, time_minutes, calories }
 * @param {Array} members - Family members array with id, weight_kg, etc.
 * @param {Set} enabledMealTypes - Set of enabled meal types (e.g., {'breakfast', 'lunch'})
 * @returns {Object} { 
 *   macros: { protein, carbs, fat }, 
 *   calories, 
 *   netCalories,
 *   activityCalories, 
 *   nutrition: {...},
 *   activityNutrientLoss: { zinc, magnesium, iron, ... }
 * }
 */
export function calculateDailyTotals(dayEntries, activities, members, enabledMealTypes = null) {
  const mealsToInclude = enabledMealTypes || new Set(MEAL_TYPES)
  
  // Sum nutrition from all recipe entries
  let totalNutrition = { totals: {}, perServing: {} }
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  
  for (const mealType of MEAL_TYPES) {
    if (!mealsToInclude.has(mealType)) continue
    
    const entries = dayEntries[mealType] || []
    for (const entry of entries) {
      const recipe = entry.recipes
      if (!recipe?.nutrition?.perServing) continue
      
      // Sum across all members (divide by member count for per-person average)
      const memberCount = Math.max(1, members.length)
      const nutrition = recipe.nutrition.perServing
      
      for (const [key, value] of Object.entries(nutrition)) {
        if (typeof value === 'number') {
          totalNutrition.perServing[key] = (totalNutrition.perServing[key] || 0) + (value / memberCount)
        }
      }
      
      const kcal = nutrition.energy_kcal || 0
      totalCalories += kcal / memberCount
      totalProtein += (nutrition.protein || 0) / memberCount
      totalCarbs += (nutrition.carbs_total || 0) / memberCount
      totalFat += (nutrition.fat_total || 0) / memberCount
    }
    
    // Add journal entries nutrition
    for (const entry of entries) {
      if (!entry.journal_entries) continue
      for (const je of entry.journal_entries) {
        const memberCount = Math.max(1, members.length)
        const nutrition = je.nutrition || {}
        
        for (const [key, value] of Object.entries(nutrition)) {
          if (typeof value === 'number') {
            totalNutrition.perServing[key] = (totalNutrition.perServing[key] || 0) + (value / memberCount)
          }
        }
        
        const kcal = nutrition.energy_kcal || 0
        totalCalories += kcal / memberCount
        totalProtein += (nutrition.protein || 0) / memberCount
        totalCarbs += (nutrition.carbs_total || 0) / memberCount
        totalFat += (nutrition.fat_total || 0) / memberCount
      }
    }
  }
  
  // Sum activity calories AND calculate micronutrient expenditure
  let activityCalories = 0
  
  for (const [memberId, acts] of Object.entries(activities || {})) {
    for (const act of acts) {
      activityCalories += act.calories || 0
    }
  }
  
  // Calculate total nutrient losses from all activities
  const activityNutrientLoss = calculateTotalActivityLoss(activities, members)
  
  // Net calories (intake - activity expenditure)
  const netCalories = totalCalories - activityCalories
  
  return {
    macros: {
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    },
    calories: Math.round(totalCalories),
    netCalories: Math.round(netCalories),
    activityCalories: Math.round(activityCalories),
    nutrition: totalNutrition.perServing,
    activityNutrientLoss, // Placeholder
  }
}

/**
 * Calculate macro percentages for donut chart
 * @param {number} protein - grams
 * @param {number} carbs - grams
 * @param {number} fat - grams
 * @returns {Object} { proteinPct, carbsPct, fatPct, totalCalories }
 */
export function calculateMacroPercentages(protein, carbs, fat) {
  const proteinCal = protein * 4
  const carbsCal = carbs * 4
  const fatCal = fat * 9
  const total = proteinCal + carbsCal + fatCal
  
  if (!total) return { proteinPct: 0, carbsPct: 0, fatPct: 0, totalCalories: 0 }
  
  return {
    proteinPct: proteinCal / total,
    carbsPct: carbsCal / total,
    fatPct: fatCal / total,
    totalCalories: total,
  }
}
