import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { callIdeogramApi, extractIdeogramImageUrl, describeIdeogramError } from '@/lib/recipe/ideogramServer'
import { saveRecipeImage } from '@/lib/recipe/saveRecipeImageServer'

export const maxDuration = 90

// ─── POST /api/recipe/regenerate-image ───────────────────────────────────────
// Generates a fresh Ideogram photo for an EXISTING recipe (by id), saves it to
// permanent storage via saveRecipeImage(), and updates the recipe row.
// Used for (a) recipes whose image is the SVG placeholder, and (b) replacing a
// photo the user doesn't like. Only the recipe owner may regenerate.
//
// The Ideogram call and the storage save are made IN-PROCESS via the shared
// libs — never via fetch() back into our own API routes. Self-fetching hid the
// real provider error behind "Image provider returned no URL" and broke when
// the forwarded cookies were stale (refresh-token rotation race with the outer
// auth check) or the request origin didn't resolve publicly.
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

  // Call Ideogram directly (API key injected server-side by the lib)
  const ideo = await callIdeogramApi({
    prompt: imagePrompt,
    model: 'V_3',
    aspect_ratio: '16x9',
    style_type: 'REALISTIC',
    magic_prompt_option: 'AUTO',
    negative_prompt: 'blurry, low quality, distorted, cartoon, illustration, drawing, text, watermark',
  })
  if (!ideo.ok) {
    // Surface the provider's real reason (e.g. 402 insufficient_funds) so the
    // user sees the actual problem instead of "no URL".
    const reason = describeIdeogramError(ideo.data)
    console.error('regenerate-image: Ideogram error', ideo.status, reason)
    return NextResponse.json(
      { error: `Image generation failed (${ideo.status}): ${reason}` },
      { status: 502 }
    )
  }
  const imageUrl = extractIdeogramImageUrl(ideo.data)
  if (!imageUrl) {
    console.error('regenerate-image: Ideogram success body had no URL:', JSON.stringify(ideo.data).slice(0, 300))
    return NextResponse.json({ error: 'Image provider returned no URL' }, { status: 502 })
  }

  // Persist to permanent storage in-process
  const pathKey = `${Date.now()}-${user.id.slice(0, 8)}`
  const { detailUrl, thumbUrl, error: saveError } = await saveRecipeImage(imageUrl, pathKey)
  if (saveError) {
    console.error('regenerate-image: storage save failed:', saveError)
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

  revalidateTag('recipes')    // recipe detail public fast-path cache
  revalidatePath('/recipes')  // catalogue ISR page (time-based only — must be busted explicitly)
  return NextResponse.json({ image: finalImage, image_thumb: finalThumb })
}
