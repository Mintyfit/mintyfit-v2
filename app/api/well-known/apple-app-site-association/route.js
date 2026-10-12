import { NextResponse } from 'next/server'

// ─── GET /.well-known/apple-app-site-association ─────────────────────────────
// (Rewritten here from /.well-known/apple-app-site-association — Next.js App
// Router ignores dot-prefixed folders, so the route lives under /api and
// next.config.mjs maps the well-known URL to it.)
//
// Apple App Site Association (AASA) — enables universal links: tapping a
// mintyfit.com link (magic-link login /auth/handle-session, shared recipes,
// deep links) opens the MintyFit iOS app instead of Safari. iOS fetches this
// file at app install and caches it via Apple's CDN.
//
// The Android equivalent is public/.well-known/assetlinks.json.
//
// Requires APPLE_TEAM_ID (10-char App Store Connect team id) in env. Returns
// 404 until it is set — Apple must never cache a malformed file, and the iOS
// app ships only after the developer account exists. Set it in Vercel once
// enrolled (see iOS repo AGENTS.md).
//
// Served as application/json with no file extension, per Apple's requirements.
// Cache is short + revalidate so the file can go live soon after the env var
// lands without waiting out a long CDN cache.

export const dynamic = 'force-dynamic'

const BUNDLE_ID = 'com.mintyfit.app'

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID
  if (!teamId) {
    return new NextResponse('Not found', { status: 404 })
  }

  const aasa = {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${BUNDLE_ID}`],
          components: [
            // All mintyfit.com paths open in the app — mirrors the Android
            // intent-filter (host mintyfit.com, scheme https, autoVerify).
            { '/': '*' },
          ],
        },
      ],
    },
  }

  return NextResponse.json(aasa, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  })
}
