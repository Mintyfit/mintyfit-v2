import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── GET /api/version ────────────────────────────────────────────────────────
// Returns the running deployment's id. DeploymentCheck (mounted in the root
// layout) compares this against the id baked into the HTML it was loaded with;
// a mismatch means the client (typically the Android WebView, which has no
// service worker and may serve its own HTTP cache) is running a stale build
// and must hard-reload. Must never be cached.
export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    'dev'
  return NextResponse.json(
    { version },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
