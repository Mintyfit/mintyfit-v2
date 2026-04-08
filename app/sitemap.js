import { createPublicClient } from '@/lib/supabase/server'

const BASE_URL = 'https://mintyfit.com'

export default async function sitemap() {
  const supabase = createPublicClient()

  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/recipes`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/pages/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/pages/terms-of-service`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // Public recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select('slug, updated_at')
    .eq('is_public', true)
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(2000)

  const recipeUrls = (recipes || []).map(r => ({
    url: `${BASE_URL}/recipes/${r.slug}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // Published blog posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(500)

  const blogUrls = (posts || []).map(p => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // Public menus
  const { data: menus } = await supabase
    .from('menus')
    .select('slug, updated_at')
    .eq('is_public', true)
    .not('slug', 'is', null)
    .limit(500)
    .then(r => r)
    .catch(() => ({ data: [] }))

  const menuUrls = (menus || []).map(m => ({
    url: `${BASE_URL}/menus/${m.slug}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // CMS pages
  const { data: cmsPages } = await supabase
    .from('pages')
    .select('slug, updated_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .limit(100)
    .then(r => r)
    .catch(() => ({ data: [] }))

  const cmsUrls = (cmsPages || []).map(p => ({
    url: `${BASE_URL}/pages/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'yearly',
    priority: 0.4,
  }))

  return [...staticPages, ...recipeUrls, ...blogUrls, ...menuUrls, ...cmsUrls]
}
