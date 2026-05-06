/**
 * ingredientDatabase.js — Central ingredient nutrition lookup.
 *
 * Lookup cascade for any ingredient:
 *   1. Supabase `ingredients` table (DB hit → instant, free)
 *   2. USDA FoodData Central (API call → write result to DB)
 *   3. Claude Haiku estimate (AI fallback → write result to DB)
 *
 * All nutrition stored per 100g; scaled to actual amount at return time.
 */

import { createClient } from '@/lib/supabase/client';
import { searchFood, getFoodNutrients, mapUsdaToOurFormat } from '@/lib/nutrition/usdaNutrition';
import { classifyFoodGroup } from './foodGroups';

const supabase = createClient();

const HAIKU = 'claude-haiku-4-5-20251001';

// Unit → grams conversion (mirrors toGrams in usdaNutrition.js)
export function toGrams(amount, unit, name = '') {
  const u = (unit || '').toLowerCase().trim();
  const n = (name || '').toLowerCase();
  const mlFoods = ['milk', 'cream', 'oil', 'sauce', 'broth', 'stock', 'juice', 'water', 'vinegar'];
  const isMl = mlFoods.some(f => n.includes(f));
  const mlDensity = isMl ? 1 : 0.85;
  const conversions = {
    g: 1, gram: 1, grams: 1,
    kg: 1000, kilogram: 1000,
    oz: 28.35, ounce: 28.35,
    lb: 453.6, pound: 453.6,
    ml: mlDensity, milliliter: mlDensity,
    l: mlDensity * 1000, liter: mlDensity * 1000,
    cup: isMl ? 240 : 128,
    tbsp: isMl ? 15 : 12, tablespoon: isMl ? 15 : 12,
    tsp: isMl ? 5 : 4, teaspoon: isMl ? 5 : 4,
    piece: 100, pc: 100, pcs: 100,
    slice: 30,
    clove: 5,
    bunch: 50,
    pinch: 0.5, dash: 0.5,
    handful: 30,
    can: 400, tin: 400,
  };
  return (parseFloat(amount) || 100) * (conversions[u] ?? 100);
}

function normalizeName(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function scaleNutritionPer100g(per100g, grams) {
  if (!per100g || !grams) return {};
  const factor = grams / 100;
  const scaled = {};
  for (const [key, val] of Object.entries(per100g)) {
    scaled[key] = typeof val === 'number' ? val * factor : val;
  }
  return scaled;
}

// ── Haiku fallback ─────────────────────────────────────────────────────────────

const EMPTY_PER_100G = '{"energy_kcal":0,"energy_kj":0,"protein":0,"carbs_total":0,"carbs_absorbed":0,"fiber":0,"sucrose":0,"glucose":0,"fructose":0,"galactose":0,"fat_total":0,"fat_trans":0,"fat_saturated":0,"fat_monounsaturated":0,"fat_polyunsaturated":0,"fat_palmitic":0,"fat_stearic":0,"fat_linoleic":0,"fat_linolenic":0,"cholesterol":0,"sodium":0,"potassium":0,"calcium":0,"magnesium":0,"phosphorus":0,"iron":0,"zinc":0,"copper":0,"manganese":0,"iodine":0,"selenium":0,"chrome":0,"nickel":0,"salt_equiv":0,"vit_a":0,"retinol":0,"vit_d":0,"vit_d3":0,"vit_e":0,"vit_k":0,"vit_b1":0,"vit_b2":0,"niacin":0,"niacin_tryptophan":0,"pantothenic_acid":0,"vit_b6":0,"biotin":0,"folates":0,"vit_b12":0,"vit_c":0,"water":0,"ash":0}';

function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      let depth = 0, inStr = false, esc = false;
      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(i, j + 1)); } catch {} break; } }
      }
    }
  }
  return JSON.parse(text);
}

async function estimateViaHaiku(name) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: HAIKU,
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Provide realistic per-100g nutrition for "${name}".
Return ONLY this JSON with realistic values (not zeros):
${EMPTY_PER_100G}`,
        }],
        system: 'You are a registered dietitian. Return ONLY valid JSON with no markdown or explanation.',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return extractJSON(data.text || data.content?.[0]?.text || '');
  } catch {
    return null;
  }
}

// ── Write to DB ────────────────────────────────────────────────────────────────

/**
 * Upsert an ingredient to the ingredients table.
 * Safe to call from browser — RLS allows authenticated inserts.
 */
export async function writeIngredient({ name, nutrition_per_100g, usda_fdc_id, source = 'usda', common_units }) {
  const name_normalized = normalizeName(name);
  if (!name_normalized || !nutrition_per_100g) return;
  const category = classifyFoodGroup(name);
  const row = {
    name,
    name_normalized,
    category,
    nutrition_per_100g,
    source,
    verified: false,
    updated_at: new Date().toISOString(),
    ...(usda_fdc_id ? { usda_fdc_id } : {}),
    ...(common_units ? { common_units } : {}),
  };
  // upsert by unique name_normalized; update nutrition if already exists
  await supabase.from('ingredients').upsert(row, { onConflict: 'name_normalized', ignoreDuplicates: false });
}

// ── Core lookups ───────────────────────────────────────────────────────────────

/**
 * Look up an ingredient row from the DB by name.
 * Returns the raw row or null.
 */
export async function lookupIngredientByName(name) {
  const name_normalized = normalizeName(name);
  const { data } = await supabase
    .from('ingredients')
    .select('*')
    .eq('name_normalized', name_normalized)
    .maybeSingle();
  return data || null;
}

/**
 * Get nutrition for a single ingredient, scaled to the requested amount/unit.
 *
 * Cascade: DB → USDA → Haiku
 * Always writes back to DB on a cache miss.
 *
 * @returns {object} nutrition object scaled to amount, or {} on total failure
 */
export async function getIngredientNutrition(name, amount, unit) {
  const grams = toGrams(amount, unit, name);

  // 1. DB hit
  const row = await lookupIngredientByName(name);
  if (row?.nutrition_per_100g) {
    // Check common_units for a better gram conversion
    const cu = row.common_units;
    let effectiveGrams = grams;
    if (cu && unit) {
      const match = cu.find(u => u.unit.toLowerCase() === (unit || '').toLowerCase());
      if (match?.grams) effectiveGrams = (parseFloat(amount) || 1) * match.grams;
    }
    return scaleNutritionPer100g(row.nutrition_per_100g, effectiveGrams);
  }

  // 2. USDA
  try {
    const searchRes = await searchFood(name);
    const firstFood = searchRes?.foods?.[0];
    if (firstFood?.fdcId) {
      const detail = await getFoodNutrients(firstFood.fdcId);
      if (detail) {
        const per100g = mapUsdaToOurFormat(detail, 100);
        writeIngredient({ name, nutrition_per_100g: per100g, usda_fdc_id: firstFood.fdcId, source: 'usda' });
        return scaleNutritionPer100g(per100g, grams);
      }
    }
  } catch {}

  // 3. Haiku estimate
  const per100g = await estimateViaHaiku(name);
  if (per100g) {
    writeIngredient({ name, nutrition_per_100g: per100g, source: 'ai' });
    return scaleNutritionPer100g(per100g, grams);
  }

  return {};
}

/**
 * Parallel lookup for a list of ingredients (used by recipe nutrition calculation).
 *
 * @param {Array<{name, amount, unit}>} ingredients
 * @returns {Promise<Array<{ing, nutrition}>>} — same order as input
 */
export async function batchLookupIngredients(ingredients) {
  return Promise.all(
    ingredients.map(async ing => {
      const nutrition = await getIngredientNutrition(ing.name, ing.amount, ing.unit);
      return { ing, nutrition };
    })
  );
}

// ── Cooking variant lookups ────────────────────────────────────────────────────

/**
 * Map free-text cooking method strings to canonical DB values.
 * Recipe steps use varied method names; the DB stores a fixed canonical set.
 */
export function normalizeCookingMethod(method) {
  const m = (method || '').toLowerCase().trim();
  const map = {
    'pan-fry': 'fried', 'pan-fried': 'fried', 'deep-fry': 'fried', 'deep-fried': 'fried', 'fry': 'fried',
    'sauté': 'sautéed', 'saute': 'sautéed', 'sauteed': 'sautéed',
    'stir-fry': 'stir-fried', 'stir fry': 'stir-fried',
    'roast': 'roasted',
    'grill': 'grilled', 'grilling': 'grilled', 'bbq': 'grilled', 'barbecue': 'grilled', 'broil': 'grilled', 'broiled': 'grilled',
    'bake': 'baked', 'baking': 'baked',
    'boil': 'boiled', 'boiling': 'boiled', 'simmer': 'boiled', 'simmered': 'boiled', 'poach': 'boiled', 'poached': 'boiled',
    'steam': 'steamed', 'steaming': 'steamed',
  };
  return map[m] || m;
}

/**
 * Get cooked nutrition per 100g for an ingredient + cooking method.
 * Returns the cooked nutrition_per_100g object, or null if no variant exists.
 */
export async function getCookedNutrition(ingredientName, cookingMethod) {
  const name_normalized = normalizeName(ingredientName);

  const { data: ingredient } = await supabase
    .from('ingredients')
    .select('id')
    .eq('name_normalized', name_normalized)
    .maybeSingle();

  if (!ingredient) return null;

  const methodNormalized = normalizeCookingMethod(cookingMethod);
  const { data: variant } = await supabase
    .from('ingredient_cooking_variants')
    .select('nutrition_per_100g')
    .eq('ingredient_id', ingredient.id)
    .eq('cooking_method', methodNormalized)
    .maybeSingle();

  return variant?.nutrition_per_100g || null;
}

/**
 * Private: get per-100g nutrition for a single ingredient using the full cascade.
 * DB hit → USDA → Haiku. Writes to DB on miss so subsequent lookups are instant.
 * Returns the per-100g object, or null if all three sources fail.
 */
async function getIngredientPer100g(name) {
  // 1. DB hit
  const row = await lookupIngredientByName(name);
  if (row?.nutrition_per_100g) return row.nutrition_per_100g;

  // 2. USDA
  try {
    const searchRes = await searchFood(name);
    const firstFood = searchRes?.foods?.[0];
    if (firstFood?.fdcId) {
      const detail = await getFoodNutrients(firstFood.fdcId);
      if (detail) {
        const per100g = mapUsdaToOurFormat(detail, 100);
        writeIngredient({ name, nutrition_per_100g: per100g, usda_fdc_id: firstFood.fdcId, source: 'usda' });
        return per100g;
      }
    }
  } catch {}

  // 3. Haiku estimate
  const per100g = await estimateViaHaiku(name);
  if (per100g) {
    writeIngredient({ name, nutrition_per_100g: per100g, source: 'ai' });
    return per100g;
  }

  return null;
}

/**
 * Batch lookup: for a list of ingredients with their cooking methods,
 * return both raw and cooked per-100g nutrition for each.
 * Used by the raw/cooked toggle to compute both views in one pass.
 *
 * Uses the full DB → USDA → Haiku cascade so every ingredient resolves
 * on first access and is persisted to DB for instant future lookups.
 *
 * @param {Array<{name, amount, unit, cookingMethod}>} ingredients
 * @returns {Promise<Array<{name, amount, unit, cookingMethod, rawNutrition, cookedNutrition}>>}
 *   rawNutrition and cookedNutrition are per-100g objects (or null if all sources failed).
 *   cookedNutrition falls back to rawNutrition when no cooking variant exists.
 */
export async function batchGetRawAndCooked(ingredients) {
  return Promise.all(
    ingredients.map(async ({ name, amount, unit, cookingMethod }) => {
      const rawNutrition = await getIngredientPer100g(name);

      let cookedNutrition = null;
      if (rawNutrition && cookingMethod && cookingMethod !== 'raw') {
        cookedNutrition = await getCookedNutrition(name, cookingMethod);
      }
      // Fall back to raw if no cooked variant exists
      if (!cookedNutrition) cookedNutrition = rawNutrition;

      return { name, amount, unit, cookingMethod, rawNutrition, cookedNutrition };
    })
  );
}
