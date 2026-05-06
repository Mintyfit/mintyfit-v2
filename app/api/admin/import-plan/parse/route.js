import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { text } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) return NextResponse.json({ error: 'XAI_API_KEY missing' }, { status: 500 })

  const systemPrompt = `You are a meal plan parser. Given a raw text meal plan, extract the structure.
Return ONLY valid JSON matching this schema:
{
  "menuName": "string",
  "recipes": [
    {
      "name": "string",
      "meal_type": "breakfast|snack|lunch|snack2|dinner",
      "description": "string",
      "ingredients": [{"name": "string", "amount": number, "unit": "string"}],
      "instructions": ["step 1", "step 2"]
    }
  ]
}`

  const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiKey}` },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 8000,
      temperature: 0.1,
    }),
  })

  if (!grokRes.ok) {
    const err = await grokRes.json()
    return NextResponse.json({ error: err.error?.message || 'AI parse failed' }, { status: 500 })
  }

  const grokData = await grokRes.json()
  const raw = grokData.choices?.[0]?.message?.content || ''

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const plan = JSON.parse(jsonMatch?.[0] || raw)
    return NextResponse.json({ plan })
  } catch {
    return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 500 })
  }
}
