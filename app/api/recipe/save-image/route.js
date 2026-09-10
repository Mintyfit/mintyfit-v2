import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveRecipeImage } from '@/lib/recipe/saveRecipeImageServer'

export const maxDuration = 60

// ─── POST /api/recipe/save-image ─────────────────────────────────────────────
// Thin authenticated wrapper around saveRecipeImage() (lib/recipe/saveRecipeImageServer.js)
// so CLIENT code can persist an ephemeral CDN image to permanent storage.
// Server-side code must call saveRecipeImage() directly.
//
// Body: { imageUrl: string, pathKey: string }
// Returns: { detailUrl, thumbUrl }  (either may be null on failure)
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let imageUrl, pathKey
  try {
    const body = await request.json()
    imageUrl = String(body.imageUrl || '')
    pathKey = String(body.pathKey || '').replace(/[^a-zA-Z0-9-]/g, '')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!imageUrl.startsWith('http')) {
    return NextResponse.json({ error: 'imageUrl must be an http(s) URL' }, { status: 400 })
  }
  if (!pathKey) {
    return NextResponse.json({ error: 'pathKey required' }, { status: 400 })
  }

  const { detailUrl, thumbUrl, error } = await saveRecipeImage(imageUrl, pathKey)
  if (error) {
    const status = error.startsWith('Storage upload failed') ? 500 : 502
    return NextResponse.json({ error }, { status })
  }
  return NextResponse.json({ detailUrl, thumbUrl })
}
