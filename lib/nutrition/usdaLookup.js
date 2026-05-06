// USDA FoodData Central API lookup
// Routes through ingredientDatabase (DB → USDA → Haiku cascade).
// Used by mealParser.js for journal "describe your meal" entries.

/**
 * Look up nutrition for a food item.
 * Returns { nutrition, foodName } or { error }.
 */
export async function lookupFoodNutrition(foodName, amount, unit) {
  try {
    const { toGrams } = await import('@/lib/recipe/ingredientDatabase');
    // Use the DB→USDA→Haiku cascade by calling batchGetRawAndCooked
    const { batchGetRawAndCooked } = await import('@/lib/recipe/ingredientDatabase');
    const results = await batchGetRawAndCooked([{ name: foodName, amount, unit, cookingMethod: 'raw' }]);
    const item = results?.[0];

    if (item?.rawNutrition && Object.keys(item.rawNutrition).length > 0) {
      // Scale from per-100g to actual amount
      const grams = toGrams(amount, unit, foodName);
      const nutrition = {};
      for (const [key, val] of Object.entries(item.rawNutrition)) {
        if (typeof val === 'number') nutrition[key] = val * grams / 100;
      }
      return { nutrition, foodName };
    }
    return { error: `No nutrition data found for "${foodName}"` };
  } catch (err) {
    return { error: `Lookup error: ${err.message}` };
  }
}
    return { error: `No nutrition data found for "${foodName}"` };
  } catch (err) {
    return { error: `Lookup error: ${err.message}` };
  }
}
