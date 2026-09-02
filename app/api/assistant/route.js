import { extractJSON } from '@/lib/utils/extractJSON'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceUsageLimit, canUseVoiceAssistant } from '@/lib/usageLimits'
import { pickNutritionFields } from '@/lib/nutrition/nutrition'
import { EMPTY_NUTRITION } from '@/lib/journal/grokFoodLookup'

export const maxDuration = 60

// ─── POST /api/assistant — conversational interface to MintyFit ─────────────
// Body: { message: string, context?: { page?: string }, history?: [{role, content}] }
//
// Flow: intent classify (Haiku) → route:
//   find_recipe   → Postgres FTS (migration 059, ILIKE fallback) → Haiku rerank
//   create_recipe → returns refined prompt; client runs the generation pipeline
//   log_food      → Grok parse into structured food entry (client confirms+saves)
//   question      → short direct answer
//
// Paid feature: pro/family only (STT + LLM cost per use).

const HAIKU = 'claude-haiku-4-5-20251001'

async function callHaiku(system, user, maxTokens = 1200) {
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
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Haiku ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || ''
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
      { error: 'UPGRADE_REQUIRED', message: 'Minty Chat is a Pro and Family feature.' },
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

  let message, history
  try {
    const body = await request.json()
    message = String(body.message || '').trim()
    history = Array.isArray(body.history) ? body.history.slice(-6) : []
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  try {
    // ── 1. Intent classification ────────────────────────────────────────────
    const historyText = history
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const intentRaw = await callHaiku(
      `You are the intent router for MintyFit, a family nutrition app with a recipe catalogue, AI recipe generator, meal planner and food journal.
Classify the user's message. Use conversation history for follow-ups ("that one", "without mayo").

Return ONLY raw JSON (no markdown):
{
  "intent": "find_recipe" | "create_recipe" | "log_food" | "question",
  "search_query": "2-6 word core food query (find_recipe)",
  "meal_type": "breakfast|snack|lunch|snack2|dinner" or null,
  "recipe_prompt": "complete generation prompt (create_recipe; include prior constraints from history)",
  "journal_text": "exact food description (log_food)",
  "answer": "1-3 sentence direct answer (question)",
  "message": "one short friendly sentence acknowledging the request"
}

Rules:
- create_recipe only when the user clearly wants a NEW recipe created ("create", "make", "invent", "generate"), or explicitly rejects existing options.
- "I want a chicken salad" → find_recipe. "Create a chicken salad with no mayo" → create_recipe.
- "I had two eggs and toast" → log_food (past tense, already eaten).
- Never invent nutrient numbers in answers.`,
      `${historyText ? `History:\n${historyText}\n\n` : ''}User: ${message}`,
      700
    )

    const routed = extractJSON(intentRaw)

    // ── 2. Route ────────────────────────────────────────────────────────────
    if (routed.intent === 'create_recipe' && routed.recipe_prompt) {
      return NextResponse.json({
        intent: 'create_recipe',
        message: routed.message || 'Creating that recipe for you…',
        recipe_prompt: routed.recipe_prompt,
      })
    }

    if (routed.intent === 'log_food' && routed.journal_text) {
      // Server-side parse via Grok — full 47-nutrient profile (same field set as
      // the ingredient DB / grokFoodLookup), so planner side panel + statistics
      // get complete data, not just macros.
      const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-3-fast',
          max_tokens: 2000,
          temperature: 0.1,
          messages: [
            { role: 'system', content: 'You are a registered dietitian with deep knowledge of food composition databases. Parse food log entries and return ONLY raw JSON. No markdown.' },
            { role: 'user', content: `Parse this food log entry and estimate nutrition for the whole portion described: "${routed.journal_text}"

Rules:
- All nutrient values must be for the exact total quantity described, not per 100g.
- energy_kj = energy_kcal × 4.184. salt_equiv = sodium_mg × 2.54 / 1000.
- Return ONLY this JSON with every 0 replaced by a realistic value:
{"food_name":"","amount":0,"unit":"g","meal_type":"breakfast|snack|lunch|snack2|dinner",${EMPTY_NUTRITION.slice(1, -1)}}` },
          ],
        }),
      })
      if (!grokRes.ok) throw new Error(`Grok ${grokRes.status}`)
      const grokData = await grokRes.json()
      let text = (grokData.choices?.[0]?.message?.content || '').trim()
      if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
      const parsed = extractJSON(text)

      return NextResponse.json({
        intent: 'log_food',
        message: routed.message || 'Here is what I understood — confirm to log it.',
        log: {
          food_name: parsed.food_name || routed.journal_text,
          amount: parsed.amount ?? null,
          unit: parsed.unit || 'g',
          meal_type: ['breakfast', 'snack', 'lunch', 'snack2', 'dinner'].includes(parsed.meal_type) ? parsed.meal_type : null,
          nutrition: pickNutritionFields(parsed),
        },
      })
    }

    if (routed.intent === 'question' && routed.answer) {
      return NextResponse.json({ intent: 'question', message: routed.answer })
    }

    // ── find_recipe (default) ───────────────────────────────────────────────
    const query = (routed.search_query || message).trim()

    // FTS via generated tsvector (migration 059); ILIKE fallback if not yet applied
    let candidates = []
    const ftsQuery = query.split(/\s+/).filter(Boolean).join(' | ')
    const fts = await supabase
      .from('recipes')
      .select('id, slug, title, description, image_thumb_url, image_url, meal_type, cuisine_type, prep_time_minutes, cook_time_minutes, calories_kcal:nutrition->perServing->energy_kcal')
      .eq('is_public', true)
      .textSearch('search_vector', ftsQuery, { type: 'websearch', config: 'english' })
      .limit(20)

    if (!fts.error) {
      candidates = fts.data || []
    } else {
      // Fallback: naive ILIKE on title/description
      const like = `%${query}%`
      const fb = await supabase
        .from('recipes')
        .select('id, slug, title, description, image_thumb_url, image_url, meal_type, cuisine_type, prep_time_minutes, cook_time_minutes, calories_kcal:nutrition->perServing->energy_kcal')
        .eq('is_public', true)
        .or(`title.ilike.${like},description.ilike.${like},cuisine_type.ilike.${like}`)
        .limit(20)
      candidates = fb.data || []
    }

    if (routed.meal_type && candidates.length > 1) {
      const preferred = candidates.filter(r => r.meal_type === routed.meal_type)
      if (preferred.length) candidates = [...preferred, ...candidates.filter(r => r.meal_type !== routed.meal_type)]
    }

    // LLM rerank when there are enough candidates to rank meaningfully
    let ranked = candidates.slice(0, 6)
    let reasons = {}
    if (candidates.length > 3) {
      try {
        const list = candidates
          .map((r, i) => `${i}: ${r.title} — ${(r.description || '').slice(0, 80)}`)
          .join('\n')
        const rerankRaw = await callHaiku(
          'You rank recipes for relevance to the user request. Return ONLY JSON: {"ranking":[{"i":0,"reason":"max 8 words"}]} — best first, at most 5 entries.',
          `Request: "${message}"\n\nCandidates:\n${list}`,
          400
        )
        const rerank = extractJSON(rerankRaw)
        const order = (rerank.ranking || [])
          .filter(r => Number.isInteger(r.i) && candidates[r.i])
          .slice(0, 5)
        if (order.length) {
          ranked = order.map(r => candidates[r.i])
          for (const r of order) reasons[candidates[r.i].id] = r.reason || ''
        }
      } catch {
        // rerank failure is non-fatal — FTS order stands
      }
    }

    return NextResponse.json({
      intent: 'find_recipe',
      message: ranked.length
        ? (routed.message || `Here's what I found for "${query}"`)
        : `I couldn't find "${query}" in the catalogue — want me to create it?`,
      recipes: ranked.map(r => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        image: r.image_thumb_url || r.image_url || null,
        kcal: Math.round(Number(r.calories_kcal) || 0),
        meal_type: r.meal_type,
        minutes: (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0) || null,
        reason: reasons[r.id] || null,
      })),
      offerCreate: true,
      createPrompt: query,
    })
  } catch (err) {
    console.error('Assistant error:', err)
    return NextResponse.json({ error: 'Assistant failed — please try again' }, { status: 500 })
  }
}
