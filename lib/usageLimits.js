const PAID_LIMITS = {
  recipe_generations_per_day: Infinity,
  food_journal_entries_per_day: Infinity,
  meal_planner_days_ahead: 365,
  bulk_recipe_creation: true,
}

// Canonical tier vocabulary: 'free' | 'pro' | 'family' (+ legacy 'nutritionist'
// alias). This MUST match lib/stripe.js PLANS tiers and what the Stripe webhook
// writes to profiles.subscription_tier. 'paid' is NOT a valid tier.
// Free recipe limit mirrors FREE_LIMITS.recipesPerDay in lib/stripe.js (5/day).
export const LIMITS = {
  free: {
    recipe_generations_per_day: 5,
    food_journal_entries_per_day: 10,
    meal_planner_days_ahead: 1,
    bulk_recipe_creation: false,
  },
  pro: PAID_LIMITS,
  family: PAID_LIMITS,
  nutritionist: PAID_LIMITS,
}

// Voice assistant (STT + LLM) costs per use — paid tiers only.
export const VOICE_ASSISTANT_TIERS = ['pro', 'family', 'nutritionist']

export function canUseVoiceAssistant(tier) {
  return VOICE_ASSISTANT_TIERS.includes(tier)
}

// Photo food logging (vision model) — highest cost per call, Family tier only
// (the top-priced plan). Enforced server-side in /api/food-photo.
export const PHOTO_FOOD_LOG_TIERS = ['family']

export function canUsePhotoFoodLog(tier) {
  return PHOTO_FOOD_LOG_TIERS.includes(tier)
}

// ─── Server-side enforcement (API routes only) ───────────────────────────────

// Whitelisted purposes for AI proxy routes. Maps to the metered usage column
// (null = only the anti-abuse ai_calls ceiling applies).
export const AI_PURPOSES = {
  'recipe-generation': 'recipe_generations',
  'food-parse': 'food_journal_entries',
  'nutrition-estimate': null,
  'ingredient-swap': null,
  'insights': null,
  'assistant': null,
  'transcribe': null,
}

// Absolute anti-abuse ceiling for ANY AI proxy call, all tiers.
const AI_CALLS_DAILY_CEILING = 500

/**
 * Server-side usage enforcement for AI proxy routes (/api/claude, /api/grok,
 * /api/transcribe). Atomic via the usage_check_and_increment RPC (migration 058).
 *
 * @param {object} supabase - user-context server Supabase client
 * @param {string} userId
 * @param {string} purpose - one of AI_PURPOSES keys
 * @returns {Promise<{ allowed: boolean, current?: number, limit?: number }>}
 */
export async function enforceUsageLimit(supabase, userId, purpose) {
  const usageType = AI_PURPOSES[purpose]
  if (usageType === undefined) {
    return { allowed: false, error: 'unknown purpose' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle()
  const tier = profile?.subscription_tier || 'free'

  // Anti-abuse ceiling applies to every AI call, every tier
  const ceiling = await supabase.rpc('usage_check_and_increment', {
    p_user_id: userId,
    p_type: 'ai_calls',
    p_limit: AI_CALLS_DAILY_CEILING,
  })
  if (ceiling.error) {
    console.error('usage metering (ai_calls) failed:', ceiling.error)
    return { allowed: true } // fail open on metering infra errors, not on limits
  }
  if (!ceiling.data?.allowed) {
    return { allowed: false, current: ceiling.data.current, limit: AI_CALLS_DAILY_CEILING }
  }

  // Tier-based limit for metered purposes (recipe generations, food parses)
  if (usageType) {
    const limit = getLimits(tier)[`${usageType}_per_day`]
    if (limit !== Infinity) {
      const metered = await supabase.rpc('usage_check_and_increment', {
        p_user_id: userId,
        p_type: usageType,
        p_limit: limit,
      })
      if (metered.error) {
        console.error('usage metering failed:', metered.error)
        return { allowed: true }
      }
      if (!metered.data?.allowed) {
        return { allowed: false, current: metered.data.current, limit }
      }
      return { allowed: true, current: metered.data.current, limit }
    }
  }

  return { allowed: true }
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
 * @deprecated Client-side usage checks are racy and bypassable. Server-side
 * enforcement now lives in enforceUsageLimit() + the usage_check_and_increment
 * RPC (migration 058), called by the AI proxy routes. This remains only for
 * backwards compatibility with any legacy caller — do not use in new code.
 *
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
