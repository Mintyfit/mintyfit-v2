import { createPublicClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import BlogContent from '@/components/blog/BlogContent'

export const revalidate = 300

async function getPost(slug) {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  if (error) {
    console.error(`[Blog] Failed to load post "${slug}":`, error.message)
    return null
  }
  return data
}

async function getRelated(categories, currentSlug) {
  const supabase = createPublicClient()
  if (!categories?.length) return []
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, image_url, published_at')
    .eq('status', 'published')
    .neq('slug', currentSlug)
    .contains('categories', categories.slice(0, 1))
    .limit(3)
  if (error) {
    console.error('[Blog] Failed to load related posts:', error.message)
    return []
  }
  return data || []
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Article Not Found — MintyFit' }
  return {
    title: `${post.seo_title || post.title} — MintyFit Blog`,
    description: post.seo_description || post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      images: post.image_url ? [{ url: post.image_url }] : [],
      type: 'article',
      publishedTime: post.published_at,
      authors: ['MintyFit'],
    },
    alternates: {
      canonical: `/blog/${slug}`,
    },
  }
}

function getCTA(categories) {
  const cats = Array.isArray(categories) ? categories.map(c => c.toLowerCase()) : []
  if (cats.some(c => c.includes('recipe'))) return { text: 'Generate a custom recipe for your family', href: '/recipes/generate', emoji: '🍳' }
  if (cats.some(c => c.includes('meal plan'))) return { text: 'Start planning your family meals', href: '/plan', emoji: '📅' }
  if (cats.some(c => c.includes('weight'))) return { text: 'Get a personalized nutrition plan', href: '/onboarding', emoji: '🎯' }
  return { text: 'See MintyFit in action — free for your family', href: '/onboarding', emoji: '🥗' }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const cats = Array.isArray(post.categories) ? post.categories : (post.categories ? [post.categories] : [])
  const related = await getRelated(cats, slug)
  const cta = getCTA(cats)
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const imageUrl = post.image_url || post.cover_url
  const authorName = post.author_name || 'MintyFit Team'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: imageUrl ? [imageUrl] : [],
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { '@type': 'Person', name: authorName },
    publisher: {
      '@type': 'Organization',
      name: 'MintyFit',
      logo: { '@type': 'ImageObject', url: '/favicon-192.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://mintyfit.com/blog/${slug}` },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)' }}>
          <Link href="/" style={{ color: '#10b981', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/blog" style={{ color: '#10b981', textDecoration: 'none' }}>Blog</Link>
          {' / '}
          <span>{post.title}</span>
        </nav>

        {/* Categories */}
        {cats.length > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {cats.map(c => (
              <span key={c} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#d1fae5', color: '#065f46' }}>
                {c}
              </span>
            ))}
          </div>
        )}

        <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '1rem', color: 'var(--text-primary, #111827)' }}>
          {post.title}
        </h1>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', color: 'var(--text-secondary, #6b7280)', fontSize: '0.875rem' }}>
          <span>By {authorName}</span>
          <span>·</span>
          <span>{date}</span>
        </div>

        {imageUrl && (
          <div style={{ position: 'relative', height: 400, borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '2.5rem' }}>
            <Image src={imageUrl} alt={post.title} fill style={{ objectFit: 'cover' }} priority />
          </div>
        )}

        {/* Content */}
        <BlogContent html={post.content || post.content_html || ''} />

        {/* CTA */}
        <div style={{ margin: '3rem 0', padding: '2rem', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{cta.emoji}</div>
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem', color: '#065f46' }}>{cta.text}</p>
          <Link href={cta.href}
            style={{ display: 'inline-block', padding: '0.75rem 2rem', background: '#10b981', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600 }}>
            Try MintyFit Free
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--text-primary, #111827)' }}>Related Articles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit', background: 'var(--card-bg, #f9fafb)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid var(--border-color, #e5e7eb)', display: 'block' }}>
                  {r.image_url && (
                    <div style={{ position: 'relative', height: 120, borderRadius: '0.375rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <Image src={r.image_url} alt={r.title} fill style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary, #111827)' }}>{r.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
          <Link href="/blog" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>
            ← Back to Blog
          </Link>
        </div>
      </div>
    </>
  )
}
