import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import sharp from 'sharp'

export const maxDuration = 60

const BUCKET = 'recipe-images'

// Sizes matched to the recipe detail page viewport (was client-side canvas):
//   detail  640 × 360 px  JPEG q=0.85
//   thumb   320 × 180 px  JPEG q=0.80
const SIZES = [
  { w: 640, h: 360, suffix: 'detail', quality: 85 },
  { w: 320, h: 180, suffix: 'thumb', quality: 80 },
]

// ─── POST /api/recipe/save-image ─────────────────────────────────────────────
// Downloads a freshly-generated (ephemeral CDN) image server-side, resizes it
// with sharp, and stores both sizes in Supabase Storage using the SERVICE
// ROLE — bypassing the storage RLS that silently blocked direct client uploads
// (migration 052 only granted SELECT, no INSERT). This keeps permanent storage
// URLs in the recipes row instead of base64 data-URI fallbacks (which the
// catalogue/detail normalizer strips as >4KB, showing the 🍽️ icon).
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

  // Download the source image
  let srcBuffer
  try {
    const upstream = await fetch(imageUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream fetch failed (${upstream.status})` }, { status: 502 })
    }
    srcBuffer = Buffer.from(await upstream.arrayBuffer())
  } catch (err) {
    return NextResponse.json({ error: `Download failed: ${err.message}` }, { status: 502 })
  }

  // Upload through the admin client (service role bypasses storage RLS).
  const admin = createAdminClient()
  const out = { detailUrl: null, thumbUrl: null }

  for (const { w, h, suffix, quality } of SIZES) {
    try {
      const resized = await sharp(srcBuffer)
        .resize(w, h, { fit: 'cover', position: 'centre' })
        .jpeg({ quality })
        .toBuffer()

      const storagePath = `${pathKey}-${suffix}.jpg`
      const { error } = await admin.storage
        .from(BUCKET)
        .upload(storagePath, resized, { contentType: 'image/jpeg', upsert: true })
      if (error) {
        console.error(`save-image upload failed (${suffix}):`, error.message)
        continue
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
      if (suffix === 'detail') out.detailUrl = urlData.publicUrl
      else out.thumbUrl = urlData.publicUrl
    } catch (err) {
      console.error(`save-image resize/upload error (${suffix}):`, err.message)
    }
  }

  if (!out.detailUrl && !out.thumbUrl) {
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }
  return NextResponse.json(out)
}
