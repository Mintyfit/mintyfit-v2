/**
 * Calculate the portion adjustment for a member given their activity and TDEE.
 *
 * portionMultiplier = 1 + (caloriesBurned / baseDailyCalories)
 *
 * @param {number} caloriesBurned     - kcal burned in the activity
 * @param {number} baseDailyCalories  - member's TDEE at sedentary base (BMR × 1.2)
 * @returns {object} adjustment details
 */
export function calculatePortionAdjustment(caloriesBurned, baseDailyCalories) {
  if (!caloriesBurned || caloriesBurned <= 0 || !baseDailyCalories) {
    return { caloriesBurned: 0, totalAdditional: 0, portionMultiplier: 1.0 };
  }

  const totalAdditional = Math.round(caloriesBurned);
  const portionMultiplier = Math.round((1 + caloriesBurned / baseDailyCalories) * 100) / 100;

  return { caloriesBurned, totalAdditional, portionMultiplier };
}
