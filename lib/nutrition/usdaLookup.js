// USDA FoodData Central API lookup
// Routes through ingredientDatabase (DB → USDA → Haiku cascade).
// Used by mealParser.js for journal "describe your meal" entries.

/**
 * Look up nutrition for a food item.
 * Returns { nutrition, foodName } or { error }.
 */
export async function lookupFoodNutrition(foodName, amount, unit) {
  try {
    const { getIngredientNutrition } = await import('./ingredientDatabase.js');
    const nutrition = await getIngredientNutrition(foodName, amount, unit);

    if (nutrition && Object.keys(nutrition).length > 0) {
      return { nutrition, foodName };
    }
    return { error: `No nutrition data found for "${foodName}"` };
  } catch (err) {
    return { error: `Lookup error: ${err.message}` };
  }
}
