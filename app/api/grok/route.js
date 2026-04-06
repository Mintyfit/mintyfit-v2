import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request) {
  const body = await request.json()
  const { messages, model = 'grok-3', max_tokens = 16384, ...rest } = body

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
        model,
        messages,
        max_tokens,
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
