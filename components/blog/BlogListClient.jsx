'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const CATEGORIES = ['All', 'Nutrition', 'Meal Planning', 'Family Health', 'Recipes', 'Weight Loss', 'Kids']

function getPlainText(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getExcerpt(post) {
  return post.excerpt?.trim() || getPlainText(post.content).slice(0, 180)
}

function PostCard({ post }) {
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  const cats = Array.isArray(post.categories) ? post.categories : (post.categories ? [post.categories] : [])
  const imageUrl = post.image_url || post.cover_url
  const excerpt = getExcerpt(post)

  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article style={{
        background: 'var(--card-bg, #fff)', borderRadius: '0.75rem', overflow: 'hidden',
        border: '1px solid var(--border-color, #e5e7eb)', transition: 'box-shadow 0.2s',
        display: 'flex', flexDirection: 'column', height: '100%',
      }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.10)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        {imageUrl && (
          <div style={{ position: 'relative', height: 200, flexShrink: 0 }}>
            <Image src={imageUrl} alt={post.title} fill style={{ objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {cats.length > 0 && (
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {cats.map(c => (
                <span key={c} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#d1fae5', color: '#065f46' }}>
                  {c}
                </span>
              ))}
            </div>
          )}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.35, color: 'var(--text-primary, #111827)' }}>
            {post.title}
          </h2>
          {excerpt && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)', lineHeight: 1.6, flex: 1, marginBottom: '1rem' }}>
              {excerpt.length > 140 ? excerpt.slice(0, 140) + '...' : excerpt}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary, #9ca3af)', marginTop: 'auto' }}>
            <span>MintyFit Team</span>
            <span>{date}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function BlogListClient({ initialPosts }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 12

  const filtered = initialPosts.filter(p => {
    const cats = Array.isArray(p.categories) ? p.categories : (p.categories ? [p.categories] : [])
    const query = search.toLowerCase()
    const matchesCat = activeCategory === 'All' || cats.includes(activeCategory)
    const matchesSearch = !query || p.title?.toLowerCase().includes(query) ||
      getExcerpt(p).toLowerCase().includes(query)
    return matchesCat && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pagePosts = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary, #111827)' }}>
          Family Nutrition Blog
        </h1>
        <p style={{ color: 'var(--text-secondary, #6b7280)', maxWidth: 500, margin: '0 auto' }}>
          Evidence-based articles on family nutrition, meal planning, and healthy living.
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search articles..."
          style={{ width: '100%', maxWidth: 400, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color, #d1d5db)', fontSize: '1rem', boxSizing: 'border-box', color: 'var(--text-primary, #111827)', background: 'var(--input-bg, #fff)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setActiveCategory(cat); setPage(1) }}
            style={{
              padding: '0.4rem 1rem', borderRadius: '999px', border: '1.5px solid',
              borderColor: activeCategory === cat ? '#10b981' : 'var(--border-color, #d1d5db)',
              background: activeCategory === cat ? '#10b981' : 'transparent',
              color: activeCategory === cat ? '#fff' : 'var(--text-secondary, #6b7280)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: activeCategory === cat ? 600 : 400,
            }}>
            {cat}
          </button>
        ))}
      </div>

      {pagePosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary, #9ca3af)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>No articles</div>
          <p>No articles found. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {pagePosts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => { setPage(p); window.scrollTo(0, 0) }}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid', borderColor: page === p ? '#10b981' : 'var(--border-color, #d1d5db)', background: page === p ? '#10b981' : 'transparent', color: page === p ? '#fff' : 'var(--text-primary, #374151)', cursor: 'pointer' }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
