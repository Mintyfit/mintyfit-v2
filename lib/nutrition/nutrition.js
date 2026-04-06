const HAIKU = 'claude-haiku-4-5-20251001';

function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') {
      const opener = text[i];
      const closer = opener === '{' ? '}' : ']';
      let depth = 0, inString = false, escape = false;
      for (let j = i; j < text.length; j++) {
        const ch = text[j];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === opener) depth++;
        else if (ch === closer) {
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

async function nutritionViaHaiku(ingredientsList, servings) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 3000,
      system: [{
        type: 'text',
        text: `You are a registered dietitian with deep knowledge of food composition databases (USDA, NCCDB).
Estimate realistic nutrient values for a recipe given its ingredients and cooking method.
Rules:
- All values in "totals" are for the ENTIRE recipe combined.
- "perServing" values MUST equal totals divided by the number of servings — do not invent independent numbers.
- Apply standard cooking-loss factors: boiling −40% vit_c, −10% B vitamins; roasting −15% vit_c.
- Use real-world densities (e.g. 1 tbsp olive oil ≈ 14 g fat, 120 kcal; 100 g raw chicken breast ≈ 31 g protein).
- energy_kj = energy_kcal × 4.184. salt_equiv = sodium_mg × 2.54 / 1000 (expressed in grams).
- Output ONLY raw valid JSON. No markdown, no explanation, no code fences.`,
        cache_control: { type: 'ephemeral' },
      }],
      messages: [{
        role: 'user',
        content: `Recipe has ${servings} servings. Ingredients: ${ingredientsList}

Return ONLY this JSON with every 0 replaced by a realistic estimated number:
{"totals":{"energy_kcal":0,"energy_kj":0,"protein":0,"carbs_total":0,"carbs_absorbed":0,"fiber":0,"sucrose":0,"glucose":0,"fructose":0,"galactose":0,"fat_total":0,"fat_trans":0,"fat_saturated":0,"fat_monounsaturated":0,"fat_polyunsaturated":0,"fat_palmitic":0,"fat_stearic":0,"fat_linoleic":0,"fat_linolenic":0,"cholesterol":0,"sodium":0,"potassium":0,"calcium":0,"magnesium":0,"phosphorus":0,"iron":0,"zinc":0,"copper":0,"manganese":0,"iodine":0,"selenium":0,"chrome":0,"nickel":0,"salt_equiv":0,"vit_a":0,"retinol":0,"vit_d":0,"vit_d3":0,"vit_e":0,"vit_k":0,"vit_b1":0,"vit_b2":0,"niacin":0,"niacin_tryptophan":0,"pantothenic_acid":0,"vit_b6":0,"biotin":0,"folates":0,"vit_b12":0,"vit_c":0,"water":0,"ash":0},"perServing":{"energy_kcal":0,"energy_kj":0,"protein":0,"carbs_total":0,"carbs_absorbed":0,"fiber":0,"sucrose":0,"glucose":0,"fructose":0,"galactose":0,"fat_total":0,"fat_trans":0,"fat_saturated":0,"fat_monounsaturated":0,"fat_polyunsaturated":0,"fat_palmitic":0,"fat_stearic":0,"fat_linoleic":0,"fat_linolenic":0,"cholesterol":0,"sodium":0,"potassium":0,"calcium":0,"magnesium":0,"phosphorus":0,"iron":0,"zinc":0,"copper":0,"manganese":0,"iodine":0,"selenium":0,"chrome":0,"nickel":0,"salt_equiv":0,"vit_a":0,"retinol":0,"vit_d":0,"vit_d3":0,"vit_e":0,"vit_k":0,"vit_b1":0,"vit_b2":0,"niacin":0,"niacin_tryptophan":0,"pantothenic_acid":0,"vit_b6":0,"biotin":0,"folates":0,"vit_b12":0,"vit_c":0,"water":0,"ash":0}}`,
      }],
    }),
  });
  if (!response.ok) throw new Error(`Haiku nutrition API error ${response.status}`);
  const data = await response.json();
  return extractJSON(data.text || '');
}

/**
 * Estimate nutrition for a recipe via Claude Haiku.
 * Always resolves — never throws.
 * Returns { totals, perServing, source } where source is 'haiku' | 'none'.
 */
export async function getNutritionData(steps, servings) {
  const ingredientsList = steps
    .flatMap(s => (s.ingredients || []).map(ing => `${ing.amount}${ing.unit} ${ing.name}`))
    .join(', ');

  const timeout = (ms) => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Nutrition lookup timed out')), ms)
  );

  try {
    const result = await Promise.race([nutritionViaHaiku(ingredientsList, servings), timeout(30000)]);
    return { totals: result.totals, perServing: result.perServing, source: 'haiku' };
  } catch (err) {
    console.warn('Nutrition estimation failed:', err.message);
    return { totals: null, perServing: null, source: 'none' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const NUTRITION_FIELDS = [
  { key: 'energy_kcal', label: 'Energy (kcal)', unit: 'kcal', rda: 2000 },
  { key: 'energy_kj', label: 'Energy (kJ)', unit: 'kJ', rda: 8400 },
  { key: 'protein', label: 'Protein', unit: 'g', rda: 50 },
  { key: 'carbs_total', label: 'Carbohydrates (total)', unit: 'g', rda: 300 },
  { key: 'carbs_absorbed', label: 'Carbohydrates (absorbed)', unit: 'g', rda: 260 },
  { key: 'fiber', label: 'Dietary Fiber', unit: 'g', rda: 25 },
  { key: 'sucrose', label: 'Sucrose', unit: 'g', rda: 50 },
  { key: 'glucose', label: 'Glucose', unit: 'g', rda: null },
  { key: 'fructose', label: 'Fructose', unit: 'g', rda: null },
  { key: 'galactose', label: 'Galactose', unit: 'g', rda: null },
  { key: 'fat_total', label: 'Fat (total)', unit: 'g', rda: 70 },
  { key: 'fat_trans', label: 'Trans Fat', unit: 'g', rda: 2 },
  { key: 'fat_saturated', label: 'Saturated Fat', unit: 'g', rda: 20 },
  { key: 'fat_monounsaturated', label: 'Monounsaturated Fat', unit: 'g', rda: 25 },
  { key: 'fat_polyunsaturated', label: 'Polyunsaturated Fat', unit: 'g', rda: 11 },
  { key: 'fat_palmitic', label: 'Palmitic Acid', unit: 'g', rda: null },
  { key: 'fat_stearic', label: 'Stearic Acid', unit: 'g', rda: null },
  { key: 'fat_linoleic', label: 'Linoleic Acid (Omega-6)', unit: 'g', rda: 14 },
  { key: 'fat_linolenic', label: 'Linolenic Acid (Omega-3)', unit: 'g', rda: 1.6 },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', rda: 300 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', rda: 2000 },
  { key: 'potassium', label: 'Potassium', unit: 'mg', rda: 3500 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', rda: 1000 },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', rda: 375 },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', rda: 700 },
  { key: 'iron', label: 'Iron', unit: 'mg', rda: 14 },
  { key: 'zinc', label: 'Zinc', unit: 'mg', rda: 10 },
  { key: 'copper', label: 'Copper', unit: 'mg', rda: 1 },
  { key: 'manganese', label: 'Manganese', unit: 'mg', rda: 2 },
  { key: 'iodine', label: 'Iodine', unit: 'µg', rda: 150 },
  { key: 'selenium', label: 'Selenium', unit: 'µg', rda: 55 },
  { key: 'chrome', label: 'Chromium', unit: 'µg', rda: 40 },
  { key: 'nickel', label: 'Nickel', unit: 'µg', rda: null },
  { key: 'salt_equiv', label: 'Salt Equivalent', unit: 'g', rda: 6 },
  { key: 'vit_a', label: 'Vitamin A', unit: 'µg', rda: 800 },
  { key: 'retinol', label: 'Retinol', unit: 'µg', rda: 700 },
  { key: 'vit_d', label: 'Vitamin D', unit: 'µg', rda: 20 },
  { key: 'vit_d3', label: 'Vitamin D3', unit: 'µg', rda: 20 },
  { key: 'vit_e', label: 'Vitamin E', unit: 'mg', rda: 12 },
  { key: 'vit_k', label: 'Vitamin K', unit: 'µg', rda: 75 },
  { key: 'vit_b1', label: 'Vitamin B1 (Thiamine)', unit: 'mg', rda: 1.1 },
  { key: 'vit_b2', label: 'Vitamin B2 (Riboflavin)', unit: 'mg', rda: 1.4 },
  { key: 'niacin', label: 'Niacin', unit: 'mg', rda: 16 },
  { key: 'niacin_tryptophan', label: 'Niacin (from Tryptophan)', unit: 'mg', rda: null },
  { key: 'pantothenic_acid', label: 'Pantothenic Acid', unit: 'mg', rda: 6 },
  { key: 'vit_b6', label: 'Vitamin B6', unit: 'mg', rda: 1.4 },
  { key: 'biotin', label: 'Biotin', unit: 'µg', rda: 50 },
  { key: 'folates', label: 'Folate', unit: 'µg', rda: 200 },
  { key: 'vit_b12', label: 'Vitamin B12', unit: 'µg', rda: 2.5 },
  { key: 'vit_c', label: 'Vitamin C', unit: 'mg', rda: 80 },
  { key: 'water', label: 'Water', unit: 'g', rda: null },
  { key: 'ash', label: 'Ash', unit: 'g', rda: null },
];

export function getRdaStatus(value, rda) {
  if (!rda || value == null) return null;
  const pct = (value / rda) * 100;
  if (pct >= 80) return { color: '🟢', label: 'Good', pct };
  if (pct >= 50) return { color: '🟠', label: 'Fair', pct };
  return { color: '🔴', label: 'Low', pct };
}

export function scaleNutrition(nutrition, multiplier, portions) {
  if (!nutrition) return null;
  const factor = multiplier / portions;
  const result = {};
  for (const key of Object.keys(nutrition)) {
    result[key] = typeof nutrition[key] === 'number' ? nutrition[key] * factor : nutrition[key];
  }
  return result;
}

export function sumNutrition(nutritionArray) {
  const result = {};
  for (const n of nutritionArray) {
    if (!n) continue;
    for (const key of Object.keys(n)) {
      if (typeof n[key] === 'number') {
        result[key] = (result[key] || 0) + n[key];
      }
    }
  }
  return result;
}
