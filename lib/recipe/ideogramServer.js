// ─── SERVER ONLY ─────────────────────────────────────────────────────────────
// Ideogram API calls. Uses IDEOGRAM_API_KEY — never import from client code.
// Client components must call the /api/ideogram proxy route instead.
//
// Single source of truth for talking to Ideogram: both the /api/ideogram HTTP
// proxy (client-side callers) and /api/recipe/regenerate-image (server-side
// caller) go through callIdeogramApi(). Server routes must call it DIRECTLY —
// never via a fetch() back into our own API (self-fetch breaks on origin
// resolution, cookie staleness/rotation and deployment protection, and hid the
// real provider error behind "Image provider returned no URL").

const IDEOGRAM_URL = 'https://api.ideogram.ai/v1/ideogram-v3/generate'

/**
 * Call the Ideogram v3 generate endpoint.
 * Never throws.
 *
 * @param {object} body - Ideogram v3 request body (prompt, model, aspect_ratio, …)
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 *   ok/status mirror the upstream HTTP response; data is the parsed JSON body
 *   ({} when the body is not JSON).
 */
export async function callIdeogramApi(body) {
  const apiKey = process.env.IDEOGRAM_API_KEY
  if (!apiKey) {
    return { ok: false, status: 500, data: { error: 'IDEOGRAM_API_KEY is not configured' } }
  }

  try {
    const response = await fetch(IDEOGRAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, data }
  } catch (err) {
    console.error('Ideogram request failed:', err.message)
    return { ok: false, status: 502, data: { error: `Ideogram request failed: ${err.message}` } }
  }
}

/** Extract the generated image URL from an Ideogram success body. */
export function extractIdeogramImageUrl(data) {
  return data?.data?.[0]?.url || data?.images?.[0]?.url || null
}

/** Human-readable description of an Ideogram error body. */
export function describeIdeogramError(data) {
  const raw = data?.error || data?.message
  const msg = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : ''
  return msg || JSON.stringify(data).slice(0, 200) || 'unknown error'
}
