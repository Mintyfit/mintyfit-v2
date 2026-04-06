// Parses a natural-language meal description into structured ingredients
// using Claude Haiku, then resolves nutrition via USDA with AI fallback.

import { lookupFoodNutrition } from '@/lib/nutrition/usdaLookup';

const CLAUDE_API = '/api/claude';

// Convert lb/lbs → oz so usdaLookup's UNIT_TO_GRAMS map covers it
function normalizeUnit(amount, unit) {
  const u = (unit || '').toLowerCase().trim();
  if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') {
    return { amount: Math.round(amount * 16 * 10) / 10, unit: 'oz' };
  }
  const aliases = {
    gram: 'g', grams: 'g',
    ounce: 'oz', ounces: 'oz',
    milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
    cups: 'cup',
    tablespoon: 'tbsp', tablespoons: 'tbsp',
    teaspoon: 'tsp', teaspoons: 'tsp',
    pieces: 'piece',
    servings: 'serving',
  };
  return { amount, unit: aliases[u] || u };
}

/**
 * Parse a free-form meal description into a list of ingredients.
 * Returns: [{ name: string, amount: number, unit: string }]
 */
export async function parseMealDescription(description) {
  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: `You are a nutrition assistant. Extract every food item from the user's meal description.
Return ONLY a valid JSON array — no prose, no markdown fences.
Each element must have exactly these keys:
  "name"   – specific food name (string)
  "amount" – numeric quantity (number)
  "unit"   – one of: g, oz, ml, cup, tbsp, tsp, piece, serving, lb
Rules:
- Convert fractions to decimals (½ → 0.5, ¼ → 0.25).
- If no amount is stated, use a sensible default (e.g. 1 cup for tea/coffee, 1 piece for fruit).
- Preserve specificity: "mixed berries" stays "mixed berries", not just "berries".
- Do not merge items; one object per distinct food.`,
      },
    ],
    messages: [{ role: 'user', content: `Extract food items from: "${description}"` }],
  };

  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Failed to reach AI service');

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'AI error');

  const text = data.text || data.content?.[0]?.text || '[]';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse ingredient list from AI response');

  const raw = JSON.parse(match[0]);
  return raw.map(item => {
    const { amount, unit } = normalizeUnit(Number(item.amount) || 1, item.unit);
    return { name: String(item.name), amount, unit };
  });
}

/**
 * Estimate full nutrition via Claude Haiku when USDA returns nothing.
 * Values are for the exact amount + unit supplied (not per 100 g).
 */
async function getAiNutrition(foodName, amount, unit) {
  const body = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: `You are a nutrition database. Estimate realistic nutritional values for the given food and quantity.
Return ONLY a valid JSON object — no prose, no markdown.
Use these exact keys (omit or set to null if truly unknown):
energy_kcal, energy_kj, protein, carbs_total, carbs_absorbed, fiber, fat_total,
sucrose, glucose, fructose, galactose, fat_saturated, fat_trans, fat_monounsaturated,
fat_polyunsaturated, fat_palmitic, fat_stearic, fat_linoleic, fat_linolenic, cholesterol,
sodium, potassium, calcium, magnesium, phosphorus, iron, zinc, copper, manganese,
iodine, selenium, chrome, nickel, salt_equiv, vit_a, retinol, vit_d, vit_d3, vit_e,
vit_k, vit_b1, vit_b2, niacin, niacin_tryptophan, pantothenic_acid, vit_b6, biotin,
folates, vit_b12, vit_c, water, ash
All values must be for the EXACT amount specified, not per 100 g.
Use standard nutrition units (kcal, g, mg, µg) matching those fields.`,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Estimate nutrition for: ${amount} ${unit} of ${foodName}`,
      },
    ],
  };

  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const text = data.text || data.content?.[0]?.text || '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  const raw = JSON.parse(match[0]);
  const nutrition = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && typeof v === 'number') nutrition[k] = v;
  }
  return Object.keys(nutrition).length > 0 ? nutrition : null;
}

/**
 * Resolve nutrition for one parsed ingredient.
 * Tries USDA first; falls back to Claude AI estimate.
 */
export async function resolveIngredientNutrition(ingredient) {
  const { name, amount, unit } = ingredient;

  const usdaResult = await lookupFoodNutrition(name, amount, unit);
  if (usdaResult.nutrition) {
    return {
      ...ingredient,
      nutrition: usdaResult.nutrition,
      nutritionSource: usdaResult.foodName,
      nutritionMethod: 'usda',
    };
  }

  const aiNutrition = await getAiNutrition(name, amount, unit);
  return {
    ...ingredient,
    nutrition: aiNutrition,
    nutritionSource: name,
    nutritionMethod: aiNutrition ? 'ai' : 'none',
  };
}
