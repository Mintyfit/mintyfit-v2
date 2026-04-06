/**
 * ingredientSwap.js — AI-powered ingredient swap suggestions.
 *
 * Calls Claude Haiku to suggest 4-5 ingredient alternatives that fit the
 * recipe's cuisine, meal type, and existing ingredient list.
 * Attaches nutrition preview from ingredientDatabase where available.
 */

import { lookupIngredientByName } from '@/lib/recipe/ingredientDatabase';

const HAIKU = 'claude-haiku-4-5-20251001';

function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      let depth = 0, inStr = false, esc = false;
      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '[') depth++;
        else if (ch === ']') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(i, j + 1)); } catch {} break; } }
      }
    }
  }
  return JSON.parse(text);
}

/**
 * Get 4-5 swap suggestions for an ingredient in a recipe context.
 *
 * @param {{ name: string, amount: number, unit: string }} ingredient
 * @param {{ title: string, cuisine_type: string, meal_type: string, food_type: string, otherIngredients: string[] }} recipeContext
 * @returns {Promise<Array<{ name, amount, unit, reason, nutrition_per_100g? }>>}
 */
export async function getSwapSuggestions(ingredient, recipeContext) {
  const { name, amount, unit } = ingredient;
  const { title, cuisine_type, meal_type, food_type, otherIngredients = [] } = recipeContext;

  const otherList = otherIngredients.slice(0, 15).join(', ') || 'none listed';

  const prompt = `You are a culinary nutritionist. Suggest 4-5 ingredient alternatives for "${name}" (${amount} ${unit}) in a ${cuisine_type || ''} ${meal_type || ''} recipe called "${title}".

Other ingredients in this recipe: ${otherList}

Rules:
- Suggest ingredients that fit the cuisine and meal type
- Adjust amounts appropriately (not always 1:1 by weight — e.g. swapping chicken for tofu needs a higher volume)
- Give a brief, specific reason for each (dietary benefit, texture match, flavor profile)
- Never suggest an ingredient already in the recipe
- Return ONLY a valid JSON array, no markdown or prose

Format:
[
  { "name": "ingredient name", "amount": 250, "unit": "g", "reason": "brief reason" },
  ...
]`;

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: HAIKU,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a culinary nutritionist. Return ONLY valid JSON arrays with no explanation.',
      }),
    });

    if (!res.ok) throw new Error(`Claude API error ${res.status}`);
    const data = await res.json();
    const text = data.text || data.content?.[0]?.text || '';
    const suggestions = extractJSON(text);

    if (!Array.isArray(suggestions)) throw new Error('Response was not an array');

    // Attach nutrition preview from DB where available (non-blocking)
    const withNutrition = await Promise.all(
      suggestions.map(async (s) => {
        try {
          const row = await lookupIngredientByName(s.name);
          if (row?.nutrition_per_100g) {
            return { ...s, nutrition_per_100g: row.nutrition_per_100g };
          }
        } catch {}
        return s;
      })
    );

    return withNutrition;
  } catch (err) {
    console.warn('getSwapSuggestions failed:', err.message);
    throw err;
  }
}
