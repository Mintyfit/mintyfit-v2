/**
 * Blog publishing activity from the MintyFit database — the SEO strategy
 * requires 1 post/week (SEO-STRATEGY.md §4.8), so the weekly report tracks
 * what shipped and warns when cadence slips.
 */

import { createAdminClient } from '@/lib/supabase/server'

/**
 * Posts published within the report window plus cadence stats.
 * Window: the current 7-day period extended to "now" (publishing is
 * real-time, unlike the ~2-day-lagged GSC/GA4 data).
 */
export async function pullBlogActivity(period, now = new Date()) {
  const supabase = createAdminClient()

  // `pillar` comes from migration 064 — degrade gracefully until it is applied.
  let { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, published_at, pillar')
    .eq('is_published', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(200)
  if (error && /pillar/i.test(error.message ?? '')) {
    ;({ data, error } = await supabase
      .from('blog_posts')
      .select('title, slug, published_at')
      .eq('is_published', true)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(200))
  }

  if (error) throw new Error(`blog_posts: ${error.message}`)

  const posts = (data ?? []).map((p) => ({ ...p, pillar: p.pillar ?? null }))
  const windowStart = new Date(`${period.start}T00:00:00Z`)
  const prevStart = new Date(`${period.prevStart}T00:00:00Z`)
  const prevEnd = new Date(`${period.prevEnd}T23:59:59Z`)

  // Only LIVE posts count — scheduled posts (published_at in the future) are
  // excluded so cadence reflects what readers could actually see.
  const isLive = (p) => new Date(p.published_at) <= now
  const publishedThisWeek = posts.filter((p) => new Date(p.published_at) >= windowStart && isLive(p))
  const publishedPrevWeek = posts.filter((p) => {
    const d = new Date(p.published_at)
    return d >= prevStart && d <= prevEnd
  })
  const scheduled = posts.filter((p) => !isLive(p))

  const live = posts.filter(isLive)
  const latest = live[0] ?? null
  const daysSinceLastPost = latest
    ? Math.floor((now.getTime() - new Date(latest.published_at).getTime()) / 86_400_000)
    : null

  return {
    publishedThisWeek: publishedThisWeek.map((p) => ({ title: p.title, slug: p.slug, pillar: p.pillar, publishedAt: p.published_at })),
    scheduledUpcoming: scheduled.map((p) => ({ title: p.title, slug: p.slug, pillar: p.pillar, publishedAt: p.published_at })),
    prevWeekCount: publishedPrevWeek.length,
    totalPublished: live.length,
    daysSinceLastPost,
  }
}
