// TEMPORARY diagnostic — /pages/* 500s on Vercel but works locally.
// Probes each part of the content/[slug] module graph and reports which step
// fails. Remove after the incident is resolved.
export const dynamic = 'force-dynamic'

export async function GET() {
  const steps = {}

  try {
    const m = await import('isomorphic-dompurify')
    steps.dompurifyImport = 'ok'
    const dp = m.default || m
    steps.dompurifySanitize = dp.sanitize('<p>probe</p>')
  } catch (e) {
    steps.dompurifyError = String((e && e.stack) || e).slice(0, 2000)
  }

  try {
    const s = await import('@/lib/supabase/server')
    const c = s.createPublicClient()
    steps.supabasePublicClient = c ? 'ok' : 'null'
  } catch (e) {
    steps.supabaseError = String((e && e.stack) || e).slice(0, 2000)
  }

  try {
    await import('@/app/content/[slug]/page')
    steps.pageModuleImport = 'ok'
  } catch (e) {
    steps.pageModuleError = String((e && e.stack) || e).slice(0, 2000)
  }

  return Response.json(steps)
}
