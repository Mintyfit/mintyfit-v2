const GROK_URL = '/api/grok';

function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      let depth = 0, inString = false, escape = false;
      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try { return JSON.parse(text.slice(i, j + 1)); } catch {}
            break;
          }
        }
      }
    }
  }
  return JSON.parse(text);
}

const EMPTY_NUTRITION = `{"energy_kcal":0,"energy_kj":0,"protein":0,"carbs_total":0,"carbs_absorbed":0,"fiber":0,"sucrose":0,"glucose":0,"fructose":0,"galactose":0,"fat_total":0,"fat_trans":0,"fat_saturated":0,"fat_monounsaturated":0,"fat_polyunsaturated":0,"fat_palmitic":0,"fat_stearic":0,"fat_linoleic":0,"fat_linolenic":0,"cholesterol":0,"sodium":0,"potassium":0,"calcium":0,"magnesium":0,"phosphorus":0,"iron":0,"zinc":0,"copper":0,"manganese":0,"iodine":0,"selenium":0,"chrome":0,"nickel":0,"salt_equiv":0,"vit_a":0,"retinol":0,"vit_d":0,"vit_d3":0,"vit_e":0,"vit_k":0,"vit_b1":0,"vit_b2":0,"niacin":0,"niacin_tryptophan":0,"pantothenic_acid":0,"vit_b6":0,"biotin":0,"folates":0,"vit_b12":0,"vit_c":0,"water":0,"ash":0}`;

/**
 * Look up nutrition for a food item via the ingredient DB first, then Grok AI.
 * DB hit → return immediately (no API call).
 * DB miss → call Grok, write result to DB, return.
 *
 * Always resolves — never throws.
 *
 * @param {string} foodName
 * @param {number|string} amount
 * @param {string} unit
 * @returns {Promise<{ nutrition: object|null, error: string|null }>}
 */
export async function lookupFoodNutritionGrok(foodName, amount, unit) {
  // 1. Check ingredient DB first
  try {
    const { getIngredientNutrition } = await import('./ingredientDatabase.js');
    const nutrition = await getIngredientNutrition(foodName, amount, unit);
    if (nutrition && Object.keys(nutrition).length > 0) {
      return { nutrition, error: null };
    }
  } catch {}

  // 2. DB miss — call Grok
  const qty = amount ? `${amount} ${unit}` : `100 g`;
  const amountG = parseFloat(amount) || 100;

  const timeout = (ms) => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Grok nutrition lookup timed out')), ms)
  );

  try {
    const fetchResult = fetch(GROK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-fast',
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: `You are a registered dietitian with deep knowledge of food composition databases.
Given a food item and exact quantity, return realistic nutrition data for that specific amount.
Rules:
- All values must be for exactly the quantity specified, not per 100g.
- Use real-world values (e.g. 100g chicken breast ≈ 165 kcal, 31g protein).
- energy_kj = energy_kcal × 4.184. salt_equiv = sodium_mg × 2.54 / 1000.
- Output ONLY raw valid JSON. No markdown, no explanation, no code fences.`,
          },
          {
            role: 'user',
            content: `Provide nutrition for exactly ${qty} of "${foodName}".
Return ONLY this JSON with every 0 replaced by a realistic value for exactly ${qty} of this food:
${EMPTY_NUTRITION}`,
          },
        ],
      }),
    });

    const response = await Promise.race([fetchResult, timeout(15000)]);
    if (!response.ok) throw new Error(`Grok API error ${response.status}`);
    const data = await response.json();
    const nutrition = extractJSON(data.text || '');

    // 3. Write back to ingredient DB (convert to per-100g)
    try {
      const { writeIngredient } = await import('./ingredientDatabase.js');
      const factor = 100 / amountG;
      const per100g = {};
      for (const [k, v] of Object.entries(nutrition)) {
        per100g[k] = typeof v === 'number' ? v * factor : v;
      }
      writeIngredient({ name: foodName, nutrition_per_100g: per100g, source: 'ai' });
    } catch {}

    return { nutrition, error: null };
  } catch (err) {
    console.warn('Grok food lookup failed:', err.message);
    return { nutrition: null, error: err.message };
  }
}
