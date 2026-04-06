const USDA_API_KEY = 'jW1XzvfKtrgzMeZ62ikoe7UmWaBX1s8vvHlcfzmb';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const CACHE_KEY = 'fn-usda-cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// USDA nutrient ID → our field key
const NUTRIENT_MAP = {
  1008: 'energy_kcal',
  1062: 'energy_kj',
  1003: 'protein',
  1005: 'carbs_total',
  1050: 'carbs_absorbed',
  1079: 'fiber',
  2000: 'sucrose',
  1011: 'glucose',
  1012: 'fructose',
  1075: 'galactose',
  1004: 'fat_total',
  1257: 'fat_trans',
  1258: 'fat_saturated',
  1292: 'fat_monounsaturated',
  1293: 'fat_polyunsaturated',
  1264: 'fat_palmitic',
  1265: 'fat_stearic',
  1269: 'fat_linoleic',
  1270: 'fat_linolenic',
  1253: 'cholesterol',
  1093: 'sodium',
  1092: 'potassium',
  1087: 'calcium',
  1090: 'magnesium',
  1091: 'phosphorus',
  1089: 'iron',
  1095: 'zinc',
  1098: 'copper',
  1101: 'manganese',
  1100: 'iodine',
  1103: 'selenium',
  1096: 'chrome',
  1146: 'nickel',
  1186: 'salt_equiv',
  1106: 'vit_a',
  1105: 'retinol',
  1114: 'vit_d',
  1325: 'vit_d3',
  1109: 'vit_e',
  1185: 'vit_k',
  1165: 'vit_b1',
  1166: 'vit_b2',
  1167: 'niacin',
  1602: 'niacin_tryptophan',
  1170: 'pantothenic_acid',
  1175: 'vit_b6',
  1176: 'biotin',
  1177: 'folates',
  1178: 'vit_b12',
  1162: 'vit_c',
  1051: 'water',
  1007: 'ash',
};

// Cooking method vitamin/mineral retention factors (applied to totals)
const COOKING_ADJUSTMENTS = {
  boiling:   { vit_c: 0.5, vit_b1: 0.7, vit_b2: 0.75, folates: 0.65, vit_b6: 0.7, potassium: 0.7 },
  steaming:  { vit_c: 0.8, vit_b1: 0.85, vit_b2: 0.9, folates: 0.8, vit_b6: 0.85 },
  frying:    { vit_c: 0.6, vit_b1: 0.75, vit_e: 0.85, fat_total: 1.2 },
  baking:    { vit_c: 0.5, vit_b1: 0.7, vit_b2: 0.85, folates: 0.65 },
  roasting:  { vit_c: 0.55, vit_b1: 0.7, folates: 0.6 },
  grilling:  { vit_c: 0.6, vit_b1: 0.75, fat_total: 0.9 },
  raw:       {},
};

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

function cacheGet(key) {
  const cache = getCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.data;
}

function cacheSet(key, data) {
  const cache = getCache();
  // Keep cache under 200 entries to avoid storage bloat
  const keys = Object.keys(cache);
  if (keys.length > 200) {
    const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, 50);
    oldest.forEach(k => delete cache[k]);
  }
  cache[key] = { ts: Date.now(), data };
  setCache(cache);
}

export async function searchFood(foodName) {
  const cacheKey = `search:${foodName.toLowerCase().trim()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(foodName)}&dataType=Foundation,SR%20Legacy&pageSize=5&api_key=${USDA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA search failed: ${res.status}`);
  const data = await res.json();
  cacheSet(cacheKey, data);
  return data;
}

export async function getFoodNutrients(fdcId) {
  const cacheKey = `food:${fdcId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const url = `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA food fetch failed: ${res.status}`);
  const data = await res.json();
  cacheSet(cacheKey, data);
  return data;
}

export function mapUsdaToOurFormat(usdaFood, amountGrams) {
  const nutrients = {};
  const foodNutrients = usdaFood.foodNutrients || [];

  for (const fn of foodNutrients) {
    const nutrientId = fn.nutrient?.id ?? fn.nutrientId;
    const ourKey = NUTRIENT_MAP[nutrientId];
    if (!ourKey) continue;
    const per100g = fn.amount ?? fn.nutrient?.value ?? 0;
    nutrients[ourKey] = (per100g * amountGrams) / 100;
  }

  return nutrients;
}

// Convert recipe ingredient unit to grams (rough approximations)
export function toGrams(amount, unit, name) {
  const u = unit.toLowerCase().trim();
  const n = name.toLowerCase();

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

  return amount * (conversions[u] ?? 100);
}

function addNutrients(a, b) {
  const result = { ...a };
  for (const key of Object.keys(b)) {
    result[key] = (result[key] || 0) + (b[key] || 0);
  }
  return result;
}

function applyAdjustment(nutrients, cookingMethod) {
  const method = (cookingMethod || '').toLowerCase();
  let factors = COOKING_ADJUSTMENTS.raw;

  for (const [key, val] of Object.entries(COOKING_ADJUSTMENTS)) {
    if (method.includes(key)) { factors = val; break; }
  }

  const result = { ...nutrients };
  for (const [field, factor] of Object.entries(factors)) {
    if (result[field] != null) result[field] *= factor;
  }
  return result;
}

/**
 * Look up nutrition for a list of ingredients.
 * Routes through ingredientDatabase (DB → USDA → Haiku cascade) per ingredient.
 * Cooking method adjustments and totals accumulation remain here.
 * Returns { totals, perServing } or throws if too many lookups fail.
 */
export async function lookupNutrition(steps, servings) {
  const { batchLookupIngredients } = await import('./ingredientDatabase.js');

  // Flatten all ingredients with their cooking method
  const items = steps.flatMap(step =>
    (step.ingredients || []).map(ing => ({ ing, cookingMethod: step.cooking_method || '' }))
  );

  // Batch lookup through ingredientDatabase (DB → USDA → Haiku)
  const results = await batchLookupIngredients(items.map(({ ing }) => ing));

  // Accumulate totals with cooking adjustments
  const errors = [];
  let totals = {};

  results.forEach(({ ing, nutrition }, i) => {
    const cookingMethod = items[i].cookingMethod;
    if (!nutrition || Object.keys(nutrition).length === 0) {
      errors.push(ing.name);
      return;
    }
    const adjusted = applyAdjustment(nutrition, cookingMethod);
    totals = addNutrients(totals, adjusted);
  });

  if (errors.length > items.length * 0.6) {
    throw new Error(`Nutrition lookup failed for too many ingredients: ${errors.join(', ')}`);
  }

  const perServing = {};
  for (const [key, val] of Object.entries(totals)) {
    perServing[key] = val / servings;
  }

  // Ensure all 55 fields exist (default 0 for missing)
  const ALL_KEYS = Object.values(NUTRIENT_MAP);
  for (const key of ALL_KEYS) {
    if (totals[key] == null) totals[key] = 0;
    if (perServing[key] == null) perServing[key] = 0;
  }

  return { totals, perServing, partialErrors: errors };
}
