// ─── SERVER ONLY ─────────────────────────────────────────────────────────────
// Downloads a freshly-generated (ephemeral CDN) image server-side, resizes it
// with sharp, and stores both sizes in Supabase Storage using the SERVICE
// ROLE — bypassing the storage RLS that silently blocked direct client uploads
// (migration 052 only granted SELECT, no INSERT). This keeps permanent storage
// URLs in the recipes row instead of base64 data-URI fallbacks (which the
// catalogue/detail normalizer strips as >4KB, showing the 🍽️ icon).
//
// Never import from client code — client components call /api/recipe/save-image,
// which is a thin authenticated wrapper around this function.

import { createAdminClient } from '@/lib/supabase/server'
import sharp from 'sharp'

const BUCKET = 'recipe-images'

// Sizes matched to the recipe detail page viewport (was client-side canvas):
//   detail  640 × 360 px  JPEG q=0.85
//   thumb   320 × 180 px  JPEG q=0.80
const SIZES = [
  { w: 640, h: 360, suffix: 'detail', quality: 85 },
  { w: 320, h: 180, suffix: 'thumb', quality: 80 },
]

/**
 * Persist an ephemeral CDN image to permanent Supabase Storage.
 * Never throws.
 *
 * @param {string} imageUrl - http(s) URL of the source image
 * @param {string} pathKey  - sanitized unique path prefix (e.g. "1234567890-ab12cd34")
 * @returns {Promise<{detailUrl: string|null, thumbUrl: string|null, error?: string}>}
 */
export async function saveRecipeImage(imageUrl, pathKey) {
  // Download the source image
  let srcBuffer
  try {
    const upstream = await fetch(imageUrl)
    if (!upstream.ok) {
      return { detailUrl: null, thumbUrl: null, error: `Upstream fetch failed (${upstream.status})` }
    }
    srcBuffer = Buffer.from(await upstream.arrayBuffer())
  } catch (err) {
    return { detailUrl: null, thumbUrl: null, error: `Download failed: ${err.message}` }
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
        console.error(`saveRecipeImage upload failed (${suffix}):`, error.message)
        continue
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
      if (suffix === 'detail') out.detailUrl = urlData.publicUrl
      else out.thumbUrl = urlData.publicUrl
    } catch (err) {
      console.error(`saveRecipeImage resize/upload error (${suffix}):`, err.message)
    }
  }

  if (!out.detailUrl && !out.thumbUrl) {
    return { ...out, error: 'Storage upload failed' }
  }
  return out
}
