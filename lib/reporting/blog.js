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

  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, published_at')
    .eq('is_published', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(`blog_posts: ${error.message}`)

  const posts = data ?? []
  const windowStart = new Date(`${period.start}T00:00:00Z`)
  const prevStart = new Date(`${period.prevStart}T00:00:00Z`)
  const prevEnd = new Date(`${period.prevEnd}T23:59:59Z`)

  const publishedThisWeek = posts.filter((p) => new Date(p.published_at) >= windowStart)
  const publishedPrevWeek = posts.filter((p) => {
    const d = new Date(p.published_at)
    return d >= prevStart && d <= prevEnd
  })

  const latest = posts[0] ?? null
  const daysSinceLastPost = latest
    ? Math.floor((now.getTime() - new Date(latest.published_at).getTime()) / 86_400_000)
    : null

  return {
    publishedThisWeek: publishedThisWeek.map((p) => ({ title: p.title, slug: p.slug, publishedAt: p.published_at })),
    prevWeekCount: publishedPrevWeek.length,
    totalPublished: posts.length,
    daysSinceLastPost,
  }
}
