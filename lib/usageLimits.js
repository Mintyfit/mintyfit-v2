const PAID_LIMITS = {
  recipe_generations_per_day: Infinity,
  food_journal_entries_per_day: Infinity,
  meal_planner_days_ahead: 365,
  bulk_recipe_creation: true,
}

export const LIMITS = {
  free: {
    recipe_generations_per_day: 3,
    food_journal_entries_per_day: 10,
    meal_planner_days_ahead: 1,
    bulk_recipe_creation: false,
  },
  pro: PAID_LIMITS,
  nutritionist: PAID_LIMITS,
}

/**
 * Returns the limits object for the given tier, falling back to free limits
 * for any unrecognised tier value.
 *
 * @param {string} tier - Subscription tier ('free' | 'pro' | 'nutritionist')
 * @returns {{ recipe_generations_per_day, food_journal_entries_per_day, meal_planner_days_ahead, bulk_recipe_creation }}
 */
export function getLimits(tier) {
  return LIMITS[tier] ?? LIMITS.free
}

/**
 * Check if the user is within their daily usage limit for a given feature type,
 * and increment the counter if allowed.
 *
 * @param {object} supabase - Supabase client
 * @param {string|null} userId - Auth user ID
 * @param {string} tier - Subscription tier ('free' | 'pro' | 'nutritionist')
 * @param {string} type - Usage type column name (e.g. 'recipe_generations', 'food_journal_entries')
 * @returns {Promise<{ allowed: boolean, current?: number, limit?: number }>}
 */
export async function checkAndIncrementUsage(supabase, userId, tier, type) {
  if (!userId) return { allowed: true }

  const limit = getLimits(tier)[`${type}_per_day`]
  if (limit === Infinity) return { allowed: true }

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('daily_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  const currentCount = data?.[type] || 0

  if (currentCount >= limit) {
    return { allowed: false, current: currentCount, limit }
  }

  await supabase
    .from('daily_usage')
    .upsert(
      { user_id: userId, date: today, [type]: currentCount + 1 },
      { onConflict: 'user_id,date' }
    )

  return { allowed: true, current: currentCount + 1, limit }
}
