/**
 * Maps a Supabase DB row to the component-expected shape.
 * Pure function — no Supabase client, safe for server components.
 */

// Legacy rows can hold full base64 JPEG data URIs in image columns. These must
// never enter RSC payloads: 60 of them ≈ 5.8 MB of inline HTML on /recipes,
// re-downloaded on every visit. Small inline SVGs (generation placeholder) are
// cheap and stay. Stripped images fall back to the 🍽️ card placeholder until
// the row gets a real storage URL.
const HEAVY_DATA_URI = /^data:.{4096,}/s
const usableImage = (v) => (typeof v === 'string' && HEAVY_DATA_URI.test(v) ? null : v)

function normalizeIngredients(ings) {
  return (ings || []).map(ing =>
    typeof ing === 'string' ? { name: ing, amount: null, unit: '' } : ing
  )
}

export function normalizeRecipe(row) {
  if (!row) return null
  const instr    = row.instructions
  const isLegacy = Array.isArray(instr)
  const rawSteps = isLegacy ? instr : (instr?.steps || [])
  const steps    = rawSteps.map(s => ({ ...s, ingredients: normalizeIngredients(s.ingredients) }))
  return {
    id:                row.id,
    profile_id:        row.profile_id,
    title:             row.title,
    description:       row.description,
    meal_type:         row.meal_type,
    food_type:         row.food_type,
    cuisine_type:      row.cuisine_type,
    price_level:       row.price_level,
    glycemic_load:     row.glycemic_load,
    cooking_technique: row.cooking_technique,
    calorie_range:     row.calorie_range,
    base_servings:     row.servings,
    prep_time:         row.prep_time_minutes,
    cook_time:         row.cook_time_minutes,
    main_component:    isLegacy ? '' : (instr?.main_component || ''),
    side_component:    isLegacy ? '' : (instr?.side_component || ''),
    intro:             isLegacy ? '' : (instr?.intro || ''),
    plating_note:      isLegacy ? '' : (instr?.plating || ''),
    steps,
    // Archive/list queries fetch only kcal via JSON arrow (calories_kcal) to
    // avoid pulling the 47-nutrient blob. Detail queries fetch the full
    // `nutrition` JSONB. Reconstruct the expected shape either way so
    // consumers (cards, filters, sort) can read `nutrition.perServing.energy_kcal`.
    nutrition:         row.nutrition
                         ?? (row.calories_kcal != null
                              ? { perServing: { energy_kcal: row.calories_kcal } }
                              : null),
    image:             usableImage(row.image_url),
    image_thumb:       usableImage(row.image_thumb_url) || null,
    is_public:         row.is_public,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
    slug:              row.slug || null,
  }
}
