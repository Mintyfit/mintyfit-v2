import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceUsageLimit, canUsePhotoFoodLog } from '@/lib/usageLimits'
import { pickNutritionFields } from '@/lib/nutrition/nutrition'
import { EMPTY_NUTRITION } from '@/lib/journal/grokFoodLookup'
import { extractJSON } from '@/lib/utils/extractJSON'

export const maxDuration = 60

// ─── POST /api/food-photo — photo-based food logging (Family tier only) ─────
// Body: { image: base64, mediaType: 'image/jpeg'|..., description?: string }
//
// Decompose-then-sum: the vision model splits the plate into components with
// gram estimates (using plate/utensils/hands as size reference), estimates
// full nutrition per component, and the client sums + lets the user correct
// component grams before saving. Far more accurate than a single blended
// estimate, and the editable breakdown fixes the dominant error source
// (portion misjudgment) without another API call.

const HAIKU = 'claude-haiku-4-5-20251001'
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// Anthropic rejects images > 5 MB binary ≈ 6.8M base64 chars. The client
// downscales to ~1024px JPEG (~150-400 KB), so this is an anti-abuse cap.
const MAX_BASE64_CHARS = 7_000_000

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Family-tier gate (top-priced plan — vision calls are the most expensive per use)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  const tier = profile?.subscription_tier || 'free'
  if (!canUsePhotoFoodLog(tier)) {
    return NextResponse.json(
      { error: 'UPGRADE_REQUIRED', message: 'Photo food logging is a Family plan feature.' },
      { status: 403 }
    )
  }

  const usage = await enforceUsageLimit(supabase, user.id, 'food-parse')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'LIMIT_REACHED', current: usage.current, limit: usage.limit },
      { status: 429 }
    )
  }

  let image, mediaType, description
  try {
    const body = await request.json()
    image = String(body.image || '')
    mediaType = String(body.mediaType || '')
    description = String(body.description || '').slice(0, 500).trim()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!image || image.length > MAX_BASE64_CHARS || !ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.error('ANTHROPIC_API_KEY missing')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: HAIKU,
        max_tokens: 4000,
        temperature: 0.1,
        system: `You are a registered dietitian with deep knowledge of food composition databases (USDA, NCCDB) and portion-size estimation from photographs. Return ONLY raw JSON. No markdown.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            {
              type: 'text',
              text: `Analyse this photo of a meal${description ? ` described by the user as: "${description}"` : ''}.

Steps:
1. Identify each visible food component separately (e.g. rice, chicken in red sauce, vegetables).
2. Estimate the cooked weight in grams of EACH component, using the plate, cutlery, hands or packaging in the image as size reference.
3. Estimate nutrition for each component at its estimated weight. Assume typical restaurant/takeaway preparation (oil, sugar, batter) unless the image or description clearly indicates otherwise.
4. Use the user's description to disambiguate ingredients you cannot see (sauce type, cooking method).

Rules:
- All nutrient values per component are for that component's estimated grams, not per 100g.
- energy_kj = energy_kcal × 4.184. salt_equiv = sodium_mg × 2.54 / 1000.
- Return ONLY this JSON with every 0 replaced by a realistic value, one entry per component:
{"food_name":"short meal name","components":[{"name":"component name","grams":0,${EMPTY_NUTRITION.slice(1, -1)}}]}`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error('Anthropic vision error:', res.status, errData)
      return NextResponse.json({ error: 'Vision analysis failed' }, { status: res.status })
    }

    const data = await res.json()
    const parsed = extractJSON(data.content?.[0]?.text || '')

    const components = (Array.isArray(parsed.components) ? parsed.components : [])
      .map(c => ({
        name: String(c.name || 'Component').slice(0, 120),
        grams: Math.max(0, Number(c.grams) || 0),
        nutrition: pickNutritionFields(c),
      }))
      .filter(c => c.grams > 0)
      .slice(0, 12)

    if (components.length === 0) {
      return NextResponse.json({ error: 'NO_FOOD_DETECTED' }, { status: 422 })
    }

    return NextResponse.json({
      food_name: String(parsed.food_name || 'Photo meal').slice(0, 200),
      components,
    })
  } catch (error) {
    console.error('Food photo analysis error:', error)
    return NextResponse.json({ error: 'Photo analysis failed' }, { status: 500 })
  }
}
