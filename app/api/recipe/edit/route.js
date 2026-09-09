import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enforceUsageLimit, canUseVoiceAssistant } from '@/lib/usageLimits'
import { getNutritionData } from '@/lib/nutrition/nutrition'
import { extractJSON } from '@/lib/utils/extractJSON'
import { slugify, uniqueSlug } from '@/lib/utils/slugify'

export const maxDuration = 60

// ─── POST /api/recipe/edit — chat-driven recipe modification ─────────────────
// Body: { recipe_id: string, instruction: string, apply?: boolean }
//
// Two modes:
//   apply: false (default) → compute the rewrite and return a PREVIEW
//            (changed recipe + summary of changes). Nothing is persisted.
//   apply: true            → persist the rewrite to the user's edit target.
//
// Edit target ("one private copy per user"):
//   - If the user owns the recipe       → edit it in place.
//   - Else if the user already forked it → update that single private copy.
//   - Else                               → create ONE private fork
//     (forked_from_id = original id, title "… (My Version)", is_public=false)
//     and edit that. Repeated edits reuse the same copy — no duplicates.
//
// Nutrition is re-estimated from the new steps (write-time, single source of
// truth) so the planner's personal_nutrition stays truthful.

const HAIKU = 'claude-haiku-4-5-20251001'

async function callHaiku(system, user, maxTokens = 3000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: maxTokens,
      temperature: 0.3,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Haiku ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// Map a DB row to the flat "recipe" shape the detail client uses.
function toClientShape(row) {
  const instr = row.instructions
  const isLegacy = Array.isArray(instr)
  const steps = (isLegacy ? instr : (instr?.steps || [])).map(s => ({
    ...s,
    ingredients: (s.ingredients || []).map(ing =>
      typeof ing === 'string' ? { name: ing, amount: null, unit: '' } : ing),
  }))
  return {
    id: row.id,
    slug: row.slug,
    profile_id: row.profile_id,
    forked_from_id: row.forked_from_id || null,
    title: row.title,
    description: row.description,
    meal_type: row.meal_type,
    food_type: row.food_type,
    cuisine_type: row.cuisine_type,
    price_level: row.price_level,
    glycemic_load: row.glycemic_load,
    cooking_technique: row.cooking_technique,
    calorie_range: row.calorie_range,
    base_servings: row.servings,
    prep_time: row.prep_time_minutes,
    cook_time: row.cook_time_minutes,
    main_component: isLegacy ? '' : (instr?.main_component || ''),
    side_component: isLegacy ? '' : (instr?.side_component || ''),
    intro: isLegacy ? '' : (instr?.intro || ''),
    plating_note: isLegacy ? '' : (instr?.plating || ''),
    steps,
    nutrition: row.nutrition,
    image: row.image_url,
    image_thumb: row.image_thumb_url || null,
    is_public: row.is_public,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  const tier = profile?.subscription_tier || 'free'
  if (!canUseVoiceAssistant(tier)) {
    return NextResponse.json(
      { error: 'UPGRADE_REQUIRED', message: 'AI recipe editing is a Pro and Family feature.' },
      { status: 403 }
    )
  }

  const usage = await enforceUsageLimit(supabase, user.id, 'assistant')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'LIMIT_REACHED', current: usage.current, limit: usage.limit },
      { status: 429 }
    )
  }

  let recipe_id, instruction, apply
  try {
    const body = await request.json()
    recipe_id = String(body.recipe_id || '')
    instruction = String(body.instruction || '').trim()
    apply = body.apply === true
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!recipe_id || !instruction) {
    return NextResponse.json({ error: 'Missing recipe_id or instruction' }, { status: 400 })
  }

  // ── 1. Load the recipe the user is looking at ────────────────────────────
  const { data: original, error: fetchErr } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipe_id)
    .maybeSingle()
  if (fetchErr || !original) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  // ── 2. Resolve the edit target (owner → in place; else single private fork) ─
  const isOwner = original.profile_id === user.id
  let target = original
  let createdFork = false

  if (!isOwner) {
    const { data: existingFork } = await supabase
      .from('recipes')
      .select('*')
      .eq('forked_from_id', original.id)
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingFork) {
      target = existingFork
    } else if (apply) {
      // Create the ONE private copy on first apply.
      const forkTitle = `${original.title} (My Version)`
      const slug = await uniqueSlug(slugify(forkTitle), async (candidate) => {
        const { data } = await supabase.from('recipes').select('id').eq('slug', candidate).maybeSingle()
        return !!data
      })
      const { data: forked, error: forkErr } = await supabase
        .from('recipes')
        .insert({
          profile_id: user.id,
          forked_from_id: original.id,
          slug,
          title: forkTitle,
          description: original.description,
          meal_type: original.meal_type,
          food_type: original.food_type,
          cuisine_type: original.cuisine_type,
          price_level: original.price_level,
          glycemic_load: original.glycemic_load,
          cooking_technique: original.cooking_technique,
          calorie_range: original.calorie_range,
          servings: original.servings,
          prep_time_minutes: original.prep_time_minutes,
          cook_time_minutes: original.cook_time_minutes,
          instructions: original.instructions,
          nutrition: original.nutrition,
          image_url: original.image_url,
          image_thumb_url: original.image_thumb_url,
          is_public: false,
        })
        .select('*')
        .single()
      if (forkErr || !forked) {
        console.error('Fork create error:', forkErr)
        return NextResponse.json({ error: 'Could not create your private copy' }, { status: 500 })
      }
      target = forked
      createdFork = true
    }
  }

  // ── 3. LLM rewrite of the target's content ────────────────────────────────
  const working = toClientShape(target)
  const currentRecipeJson = JSON.stringify({
    title: working.title,
    description: working.description,
    base_servings: working.base_servings,
    prep_time: working.prep_time,
    cook_time: working.cook_time,
    meal_type: working.meal_type,
    steps: working.steps,
  })

  let rewritten
  try {
    const raw = await callHaiku(
      `You are a professional chef and nutritionist editing an existing recipe per the user's request. Output ONLY raw valid JSON — no markdown, no code fences.

Apply the requested change faithfully while keeping the recipe coherent, cookable and nutritionally sound. Adjust ingredient amounts, steps and timings so the dish still works (e.g. removing an allergen means adjusting the rest, not just deleting the word). Keep the same overall structure and step shape. Keep instruction quality: each step's "instruction" stays a concrete 40–80 word technique description with °C, timings and sensory cues.

Return ONLY this JSON:
{
  "title": "updated title (keep close to original unless the change renames the dish)",
  "description": "updated 1–2 sentence description",
  "base_servings": number,
  "prep_time": number,
  "cook_time": number,
  "meal_type": "breakfast|lunch|dinner|snack",
  "steps": [{"title":"","component":"main|side","time_marker":"0:00","cooking_method":"","ingredients":[{"name":"","amount":0,"unit":""}],"instruction":"40–80 words","tip":""}],
  "change_summary": "one short sentence naming what changed (e.g. 'Swapped butter and cream for olive oil and oat milk to make it dairy-free.')"
}`,
      `Current recipe:\n${currentRecipeJson}\n\nRequested change: "${instruction}"`,
      3500
    )
    rewritten = extractJSON(raw)
  } catch (err) {
    console.error('Recipe edit LLM error:', err)
    return NextResponse.json({ error: 'Could not interpret the change — try rephrasing.' }, { status: 500 })
  }

  const newSteps = Array.isArray(rewritten.steps) && rewritten.steps.length ? rewritten.steps : working.steps
  const newServings = Number(rewritten.base_servings) || working.base_servings || 4
  const changeSummary = String(rewritten.change_summary || 'Applied your change.')

  // ── 4. Re-estimate nutrition from the new steps (write-time source of truth) ─
  let nutrition = working.nutrition
  try {
    const n = await getNutritionData(newSteps, newServings)
    if (n && n.totals) nutrition = { totals: n.totals, perServing: n.perServing }
  } catch (err) {
    console.warn('Nutrition re-estimate failed, keeping previous:', err.message)
  }

  const preview = {
    title: String(rewritten.title || working.title),
    description: String(rewritten.description ?? working.description ?? ''),
    base_servings: newServings,
    prep_time: Number(rewritten.prep_time) || working.prep_time,
    cook_time: Number(rewritten.cook_time) || working.cook_time,
    meal_type: rewritten.meal_type || working.meal_type,
    steps: newSteps,
    nutrition,
  }

  // ── 5. Preview mode — return without persisting ────────────────────────────
  if (!apply) {
    return NextResponse.json({
      preview: true,
      isOwner,
      willFork: !isOwner,
      summary: changeSummary,
      recipe: preview,
    })
  }

  // ── 6. Apply — persist to the target ───────────────────────────────────────
  const newInstructions = Array.isArray(target.instructions)
    ? newSteps
    : {
        ...(target.instructions || {}),
        steps: newSteps,
        intro: rewritten.description ?? (target.instructions?.intro || ''),
      }

  const { data: updated, error: updateErr } = await supabase
    .from('recipes')
    .update({
      title: preview.title,
      description: preview.description,
      meal_type: preview.meal_type,
      servings: preview.base_servings,
      prep_time_minutes: preview.prep_time,
      cook_time_minutes: preview.cook_time,
      instructions: newInstructions,
      nutrition,
      updated_at: new Date().toISOString(),
    })
    .eq('id', target.id)
    .select('*')
    .single()

  if (updateErr || !updated) {
    console.error('Recipe edit update error:', updateErr)
    return NextResponse.json({ error: 'Failed to save the change' }, { status: 500 })
  }

  revalidateTag('recipes') // recipe detail public fast-path cache
  return NextResponse.json({
    applied: true,
    isOwner,
    forked: createdFork || (!isOwner),
    targetId: target.id,
    summary: changeSummary,
    recipe: toClientShape(updated),
  })
}
