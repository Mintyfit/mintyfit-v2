import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceUsageLimit, AI_PURPOSES } from '@/lib/usageLimits'

export const maxDuration = 60

// Client-supplied model is ignored unless whitelisted — never let callers
// pick arbitrary (expensive) upstream models.
const ALLOWED_MODELS = ['grok-3-fast', 'grok-3']
const DEFAULT_MODEL = 'grok-3-fast'
const MAX_TOKENS_CEILING = 16384

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { messages, model, max_tokens = 16384, purpose = 'food-parse', ...rest } = body

  // Server-side usage enforcement (atomic, tier-aware)
  if (!AI_PURPOSES[purpose]) {
    return NextResponse.json({ error: 'Unknown purpose' }, { status: 400 })
  }
  const usage = await enforceUsageLimit(supabase, user.id, purpose)
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'LIMIT_REACHED', current: usage.current, limit: usage.limit },
      { status: 429 }
    )
  }

  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) return NextResponse.json({ error: 'XAI_API_KEY missing' }, { status: 500 })

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL,
        messages,
        max_tokens: Math.min(Math.max(1, Number(max_tokens) || 1024), MAX_TOKENS_CEILING),
        temperature: 0.1,
        stream: false,
        ...rest,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json(err, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    let cleaned = content.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    }

    return NextResponse.json({ text: cleaned })
  } catch (error) {
    console.error('Grok proxy error:', error)
    return NextResponse.json({ error: 'Grok generation failed' }, { status: 500 })
  }
}
