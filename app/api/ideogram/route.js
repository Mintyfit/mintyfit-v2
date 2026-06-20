import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const apiKey = process.env.IDEOGRAM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'IDEOGRAM_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Ideogram proxy error:', error)
    return NextResponse.json({ error: 'Ideogram generation failed' }, { status: 500 })
  }
}
