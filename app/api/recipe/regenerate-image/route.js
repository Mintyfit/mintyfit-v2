import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 90

// ─── POST /api/recipe/regenerate-image ───────────────────────────────────────
// Generates a fresh Ideogram photo for an EXISTING recipe (by id), saves it to
// permanent storage via /api/recipe/save-image, and updates the recipe row.
// Used for (a) recipes whose image is the SVG placeholder, and (b) replacing a
// photo the user doesn't like. Only the recipe owner may regenerate.
//
// Body: { recipeId: string }
// Returns: { image, image_thumb }
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let recipeId
  try {
    const body = await request.json()
    recipeId = String(body.recipeId || '')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 })

  // Load the recipe (RLS-scoped client) and verify ownership
  const { data: recipe, error: fetchErr } = await supabase
    .from('recipes')
    .select('id, profile_id, title, description, instructions')
    .eq('id', recipeId)
    .maybeSingle()
  if (fetchErr || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }
  if (recipe.profile_id !== user.id) {
    return NextResponse.json({ error: 'Only the recipe owner can regenerate the image' }, { status: 403 })
  }

  // Build the Ideogram prompt from existing recipe details
  const imagePrompt =
    `Professional food photography of ${recipe.title}` +
    (recipe.description ? `, ${recipe.description}` : '') +
    '. Freshly plated on a clean white ceramic dish, soft studio lighting with gentle shadows, ' +
    'shallow depth of field, appetizing colors, garnished with fresh herbs, rustic oak surface, ' +
    'high-resolution editorial quality, photorealistic';

  // Call our own Ideogram proxy (injects the API key server-side)
  const origin = new URL(request.url).origin
  let imageUrl = null
  try {
    const ideoRes = await fetch(`${origin}/api/ideogram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
      body: JSON.stringify({
        prompt: imagePrompt,
        model: 'V_3',
        aspect_ratio: '16x9',
        style_type: 'REALISTIC',
        magic_prompt_option: 'AUTO',
        negative_prompt: 'blurry, low quality, distorted, cartoon, illustration, drawing, text, watermark',
      }),
    })
    const ideoData = await ideoRes.json()
    imageUrl = ideoData?.data?.[0]?.url || ideoData?.images?.[0]?.url || null
  } catch (err) {
    return NextResponse.json({ error: `Image generation failed: ${err.message}` }, { status: 502 })
  }
  if (!imageUrl) {
    return NextResponse.json({ error: 'Image provider returned no URL' }, { status: 502 })
  }

  // Persist to permanent storage via our save-image route
  const pathKey = `${Date.now()}-${user.id.slice(0, 8)}`
  let detailUrl = null, thumbUrl = null
  try {
    const saveRes = await fetch(`${origin}/api/recipe/save-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
      body: JSON.stringify({ imageUrl, pathKey }),
    })
    if (saveRes.ok) {
      const saved = await saveRes.json()
      detailUrl = saved.detailUrl || null
      thumbUrl = saved.thumbUrl || null
    }
  } catch (err) {
    console.error('regenerate-image save failed:', err.message)
  }

  // Fall back to the ephemeral URL only if storage failed (better than nothing;
  // works until it expires). Prefer permanent URLs when we got them.
  const finalImage = detailUrl || imageUrl
  const finalThumb = thumbUrl || null

  // Update the recipe row
  const { error: updateErr } = await supabase
    .from('recipes')
    .update({ image_url: finalImage, image_thumb_url: finalThumb })
    .eq('id', recipeId)
  if (updateErr) {
    return NextResponse.json({ error: `Recipe update failed: ${updateErr.message}` }, { status: 500 })
  }

  return NextResponse.json({ image: finalImage, image_thumb: finalThumb })
}
