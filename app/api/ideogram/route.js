import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callIdeogramApi } from '@/lib/recipe/ideogramServer'

export const maxDuration = 60

// Thin authenticated proxy so CLIENT code can generate images without ever
// seeing the Ideogram API key. Server-side code must call callIdeogramApi()
// directly instead of fetching this route (self-fetch hides provider errors
// and breaks on cookie/origin edge cases).
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { status, data } = await callIdeogramApi(body)
  return NextResponse.json(data, { status })
}
