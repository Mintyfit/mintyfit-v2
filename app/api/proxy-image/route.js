import { NextResponse } from 'next/server'

/**
 * Server-side image proxy — fetches an external image URL and returns it,
 * bypassing CORS restrictions for client-side Canvas processing.
 *
 * Usage: GET /api/proxy-image?url=<encodedUrl>
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Allowlist of image CDN hostnames — prevents open-proxy abuse.
  let targetUrl
  try {
    targetUrl = decodeURIComponent(url)
    const parsed = new URL(targetUrl)
    const allowed = [
      'ideogram.ai', 'cdn.ideogram.ai',
      'storage.googleapis.com',
      'fal.media', 'v3.fal.media',
    ]
    const isAllowed = allowed.some(
      h => parsed.hostname === h || parsed.hostname.endsWith('.' + h)
    )
    if (!isAllowed) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const upstream = await fetch(targetUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
