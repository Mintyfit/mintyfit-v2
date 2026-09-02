import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceUsageLimit, AI_PURPOSES } from '@/lib/usageLimits'

export const maxDuration = 60

// Client-supplied model is ignored — the route fixes the model server-side.
const ALLOWED_MODELS = ['claude-haiku-4-5-20251001']
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS_CEILING = 16384

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { model, messages = [], max_tokens = 16384, temperature = 0.2, purpose = 'nutrition-estimate', ...rest } = body

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

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.error('ANTHROPIC_API_KEY missing')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // Extract system messages into the top-level system field.
  // Anthropic requires system to be a top-level string, not a messages entry.
  let systemPrompt = ''
  const cleanedMessages = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt += (systemPrompt ? '\n\n' : '') + (msg.content || '')
    } else {
      cleanedMessages.push(msg)
    }
  }

  if (cleanedMessages.length === 0 || cleanedMessages[0].role !== 'user') {
    return NextResponse.json(
      { error: 'First message must be "user" role after system extraction' },
      { status: 400 }
    )
  }

  const payload = {
    model: ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL,
    messages: cleanedMessages,
    max_tokens: Math.min(Math.max(1, Number(max_tokens) || 1024), MAX_TOKENS_CEILING),
    temperature,
    stream: false,
    ...(systemPrompt && { system: systemPrompt.trim() }),
    ...rest,
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('Anthropic error:', response.status, errData)
      return NextResponse.json(errData, { status: response.status })
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''

    // Strip markdown code fences if Claude ignored instructions
    let text = content.trim()
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    }

    return NextResponse.json({ text })
  } catch (error) {
    console.error('Claude proxy error:', error)
    return NextResponse.json({ error: 'Claude proxy failed' }, { status: 500 })
  }
}
