import { getNutritionData } from '@/lib/nutrition/nutrition';
import { generateRecipeImage, generateSvgFallback, resizeAndUploadImages } from '@/lib/recipe/imageGeneration';
import { createClient } from '@/lib/supabase/client';
import { checkAndIncrementUsage } from '@/lib/usageLimits';
import { slugify, uniqueSlug } from '@/lib/utils/slugify';

const supabase = createClient();

const GROK_URL = '/api/grok';

// ─── normalizeRecipe ──────────────────────────────────────────────────────────
// Maps a Supabase DB row to the component-expected shape.
// instructions column may be a legacy plain array OR the current
// {main_component, side_component, intro, steps, plating} object.

// Convert a step's ingredients array: flat strings → {name, amount, unit} objects
function normalizeIngredients(ings) {
  return (ings || []).map(ing =>
    typeof ing === 'string' ? { name: ing, amount: null, unit: '' } : ing
  );
}

export function normalizeRecipe(row) {
  if (!row) return null;
  const instr    = row.instructions;
  const isLegacy = Array.isArray(instr);
  const rawSteps = isLegacy ? instr : (instr?.steps || []);
  const steps    = rawSteps.map(s => ({ ...s, ingredients: normalizeIngredients(s.ingredients) }));
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
    nutrition:         row.nutrition,
    image:             row.image_url,
    image_thumb:       row.image_thumb_url || null,
    is_public:         row.is_public,
    created_at:        row.created_at,
    updated_at:        row.updated_at,
    slug:              row.slug || null,
  };
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

function extractJSON(text) {
  // 1. Fenced code block
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }

  // 2. Depth-tracking extraction of outermost { } or [ ]
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

  // 3. Last resort
  return JSON.parse(text);
}

// ─── Grok API call ────────────────────────────────────────────────────────────

async function callGrok(systemText, userContent, maxTokens) {
  const response = await fetch(GROK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-3-fast',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Grok API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.text || '';
  try {
    return extractJSON(text);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e.message}\n\nRaw: ${text.slice(0, 300)}`);
  }
}

// ─── Main recipe generator ────────────────────────────────────────────────────

export async function generateRecipe(prompt, userId, onProgress = () => {}, { isPublic = false, isMetric = true, tier = 'free' } = {}) {
  // ── Usage limit check ────────────────────────────────────────────────────────
  const usageCheck = await checkAndIncrementUsage(supabase, userId, tier, 'recipe_generations')
  if (!usageCheck.allowed) {
    throw new Error(`LIMIT_REACHED:${usageCheck.current}:${usageCheck.limit}`)
  }

  const unitInstruction = isMetric
    ? ''
    : '\nUse imperial units for all ingredient amounts: oz for small weights, lb for ≥ 1 lb, fl oz for small volumes, cup for ≥ 1 cup. Never use g, kg, ml, or l.';

  // ── Single call: full recipe (structure + instructions) via Grok ─────────────
  onProgress(1, 'Building recipe…');
  const recipe = await callGrok(
    `You are a professional nutritionist and chef. Output ONLY raw valid JSON. No markdown, no explanation, no code fences.

Every recipe is a COMPLETE MEAL: a main dish paired with a complementary side dish that cook in a coordinated sequence and finish at the same time.

NUTRITIONAL REQUIREMENTS (non-negotiable):
- Protein: 25–40g per serving. Quality sources: fish, chicken, eggs, legumes, tofu.
- Fats: healthy only — olive oil, avocado, nuts, seeds, fatty fish.
- Carbohydrates: fiber-rich, low-GI ONLY — leafy greens, cruciferous vegetables, legumes.
- FORBIDDEN carb sources: white rice, white bread, pasta, potatoes, couscous, refined grains, added sugar.
- glycemic_load MUST be "low" or "medium".

Steps ordered by time_marker so both components finish simultaneously. Each step has a detailed instruction (technique, °C, timing, visual cues) and a practical tip.${unitInstruction}`,
    `Create a complete meal recipe for: ${prompt}

Return ONLY a raw JSON object with exactly this shape (no markdown, no code fences):
{"title":"Full meal name e.g. Pan-Seared Salmon with Roasted Asparagus","main_component":"","side_component":"","description":"","meal_type":"breakfast|lunch|dinner|snack","food_type":"vegetarian|vegan|keto|paleo|pescatarian|omnivore","cuisine_type":"","price_level":"budget|medium|expensive","glycemic_load":"low|medium","cooking_technique":"baked|fried|grilled|raw|steamed|stir-fried|roasted|sautéed","calorie_range":"<300|300-600|>600","base_servings":4,"prep_time":15,"cook_time":30,"intro":"2–3 sentences: what the full meal is and why it works nutritionally","plating":"Final plating note","steps":[{"title":"","component":"main|side","time_marker":"0:00","cooking_method":"","ingredients":[{"name":"","amount":0,"unit":""}],"instruction":"technique, temperature in °C, timing, visual cues — no ingredient amounts","tip":""}]}`,
    3500,
  );

  const intro       = recipe.intro    || '';
  const platingNote = recipe.plating  || '';
  const steps       = recipe.steps    || [];

  // ── Steps 2 + 3 in parallel: Nutrition lookup & Image generation ─────────────
  onProgress(2, 'Looking up nutrition & generating photo…');

  let imageError = null;
  const imageTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 60000));

  const [
    { totals, perServing, source: nutritionSource },
    imageUrl,
  ] = await Promise.all([
    getNutritionData(steps, recipe.base_servings),
    Promise.race([
      generateRecipeImage({ title: recipe.title, description: recipe.description, steps }, null, (err) => { imageError = err; }),
      imageTimeout,
    ]),
  ]);

  const nutrition = totals ? { totals, perServing } : null;

  // Upload resized versions to permanent storage (best-effort; falls back gracefully)
  let detailUrl = null;
  let thumbUrl  = null;
  if (imageUrl && imageUrl.startsWith('http')) {
    const pathKey = `${Date.now()}${userId ? `-${userId.slice(0, 8)}` : ''}`;
    const uploaded = await resizeAndUploadImages(imageUrl, pathKey);
    detailUrl = uploaded.detailUrl;
    thumbUrl  = uploaded.thumbUrl;
  }

  // Prefer stored permanent URL; fall back to ephemeral CDN URL; then SVG
  const image      = detailUrl || imageUrl || generateSvgFallback({ title: recipe.title, description: recipe.description, steps });
  const imageThumb = thumbUrl  || null;

  // ── Step 5: Save to Supabase (if logged in) ──────────────────────────────────
  onProgress(5, 'Finalizing…');

  let supabaseId = null;
  let generatedSlug = null;
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser?.id) {
    // Generate a clean URL slug (no UUID fragments)
    const baseSlug = slugify(recipe.title || 'Untitled Recipe');
    generatedSlug = await uniqueSlug(baseSlug, async (candidate) => {
      const { data } = await supabase.from('recipes').select('id').eq('slug', candidate).maybeSingle();
      return !!data;
    });

    const { data: saved, error: saveError } = await supabase.from('recipes').insert({
      profile_id:        currentUser.id,
      slug:              generatedSlug,
      title:             recipe.title             || 'Untitled Recipe',
      description:       recipe.description       || '',
      meal_type:         recipe.meal_type         || 'dinner',
      food_type:         recipe.food_type         || 'omnivore',
      cuisine_type:      recipe.cuisine_type      || '',
      price_level:       recipe.price_level       || 'medium',
      glycemic_load:     recipe.glycemic_load     || 'medium',
      cooking_technique: recipe.cooking_technique || '',
      calorie_range:     recipe.calorie_range     || '300-600',
      servings:          Number(recipe.base_servings) || 4,
      prep_time_minutes: Number(recipe.prep_time)     || 0,
      cook_time_minutes: Number(recipe.cook_time)     || 0,
      instructions: {
        main_component: recipe.main_component || '',
        side_component: recipe.side_component || '',
        intro,
        steps,
        plating: platingNote,
      },
      nutrition:       nutrition,
      image_url:       image,
      image_thumb_url: imageThumb,
      is_public:       isPublic,
    }).select().maybeSingle();
    if (saveError) console.error('Recipe save failed:', saveError.message, saveError);
    supabaseId = saved?.id || null;
  }

  return {
    id:                supabaseId || Date.now().toString(),
    slug:              generatedSlug,
    profile_id:        currentUser?.id || null,
    title:             recipe.title,
    description:       recipe.description,
    meal_type:         recipe.meal_type,
    food_type:         recipe.food_type,
    cuisine_type:      recipe.cuisine_type,
    price_level:       recipe.price_level,
    glycemic_load:     recipe.glycemic_load,
    cooking_technique: recipe.cooking_technique,
    calorie_range:     recipe.calorie_range,
    base_servings:     recipe.base_servings,
    prep_time:         recipe.prep_time,
    cook_time:         recipe.cook_time,
    main_component:    recipe.main_component || '',
    side_component:    recipe.side_component || '',
    intro,
    plating_note:      platingNote,
    image,
    image_thumb:       imageThumb,
    imageError,
    steps,
    nutrition,
    nutritionSource,
    is_public:         isPublic,
    created_at:        new Date().toISOString(),
  };
}
