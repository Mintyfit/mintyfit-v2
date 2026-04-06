import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request) {
  const body = await request.json()
  const { model, messages = [], max_tokens = 16384, temperature = 0.2, ...rest } = body

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
    model: model || 'claude-haiku-4-5-20251001',
    messages: cleanedMessages,
    max_tokens,
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
