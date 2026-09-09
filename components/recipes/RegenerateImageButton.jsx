'use client'

import { useState } from 'react'
import { ImagePlus } from 'lucide-react'

/**
 * RegenerateImageButton — lets the recipe owner request a fresh AI photo.
 *
 * Rendered next to the recipe image. Handles two cases:
 *  - the saved image is an SVG placeholder (generation/upload failed)
 *  - the user simply doesn't like the current photo
 *
 * Calls POST /api/recipe/regenerate-image (owner-only), then updates the local
 * recipe state via onGenerated(newImage, newThumb).
 */
export default function RegenerateImageButton({ recipe, onGenerated, variant = 'overlay' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Only meaningful when we have a recipe id to target
  if (!recipe?.id) return null

  const isSvgPlaceholder =
    typeof recipe?.image === 'string' && recipe.image.startsWith('data:image/svg')

  async function regenerate() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/recipe/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Regeneration failed')
      // Bust the localStorage catalogue cache (private recipes list) so the
      // new photo shows up on /recipes without waiting for the TTL.
      const { invalidateCache } = await import('@/hooks/useCachedData')
      invalidateCache('recipes:')
      onGenerated?.(data.image, data.image_thumb)
    } catch (err) {
      setError(err.message || 'Could not regenerate the image — try again.')
    } finally {
      setBusy(false)
    }
  }

  const overlay = variant === 'overlay'
  return (
    <div style={overlay ? { position: 'absolute', right: '0.75rem', bottom: '0.75rem', zIndex: 2 } : { marginTop: '0.5rem' }}>
      <button
        onClick={regenerate}
        disabled={busy}
        title={isSvgPlaceholder ? 'Generate a photo for this recipe' : 'Generate a new photo'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.45rem 0.8rem', borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.15)',
          background: busy ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.95)',
          // Hardcoded dark text — the button background is always light, so a
          // theme variable would go white-on-white in dark mode.
          color: '#111827', fontWeight: 600, fontSize: '0.8rem',
          cursor: busy ? 'default' : 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <ImagePlus size={15} />
        {busy ? 'Generating…' : (isSvgPlaceholder ? 'Generate photo' : 'New photo')}
      </button>
      {error && (
        <div style={{ marginTop: '0.4rem', background: 'rgba(255,255,255,0.95)', color: '#b91c1c', fontSize: '0.72rem', padding: '0.3rem 0.5rem', borderRadius: '6px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
