import { createPublicClient } from '@/lib/supabase/server'
import BlogListClient from '@/components/blog/BlogListClient'

export const metadata = {
  title: 'Family Nutrition Blog — MintyFit',
  description: 'Evidence-based nutrition articles, meal planning tips, and family health guides from the MintyFit team.',
  openGraph: {
    title: 'Family Nutrition Blog — MintyFit',
    description: 'Evidence-based nutrition articles, meal planning tips, and family health guides.',
    images: [{ url: '/MintyHero.webp', width: 1200, height: 630 }],
    type: 'website',
  },
}

export const revalidate = 300

async function getPosts() {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, content, image_url, categories, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[Blog] Failed to load posts:', error.message)
    return []
  }
  return data || []
}

export default async function BlogPage() {
  const posts = await getPosts()
  return <BlogListClient initialPosts={posts} />
}
