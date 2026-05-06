'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

const CATEGORY_OPTIONS = ['Nutrition', 'Meal Planning', 'Family Health', 'Recipes', 'Weight Loss', 'Kids']

export default function BlogEditorClient({ post, isNew }) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(post?.title || '')
  const [slug, setSlug] = useState(post?.slug || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState(post?.content || '')
  const [coverUrl, setCoverUrl] = useState(post?.image_url || post?.cover_url || '')
  const [categories, setCategories] = useState(post?.categories || [])
  const [status, setStatus] = useState(post?.status || 'draft')
  const [seoTitle, setSeoTitle] = useState(post?.seo_title || '')
  const [seoDesc, setSeoDesc] = useState(post?.seo_description || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (isNew && title && !slug) {
      setSlug(slugify(title))
    }
  }, [title, isNew])

  function toggleCategory(cat) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  async function handleSave() {
    if (!title || !slug) { setMessage({ type: 'error', text: 'Title and slug are required' }); return }
    setSaving(true)
    setMessage(null)

    const payload = {
      title, slug, excerpt, content, image_url: coverUrl, categories, status,
      seo_title: seoTitle, seo_description: seoDesc,
      is_published: status === 'published',
      published_at: status === 'published' ? (post?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    }

    let error
    if (isNew) {
      const res = await supabase.from('blog_posts').insert(payload)
      error = res.error
    } else {
      const res = await supabase.from('blog_posts').update(payload).eq('id', post.id)
      error = res.error
    }

    setSaving(false)
    if (error) { setMessage({ type: 'error', text: error.message }); return }
    setMessage({ type: 'success', text: 'Post saved!' })
    if (isNew) router.push(`/blog/${slug}/edit`)
  }

  async function handleDelete() {
    if (!confirm('Delete this post? This cannot be undone.')) return
    await supabase.from('blog_posts').delete().eq('id', post.id)
    router.push('/blog')
  }

  const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color, #d1d5db)', fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--input-bg, #fff)', color: 'var(--text-primary, #111827)' }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{isNew ? 'New Post' : 'Edit Post'}</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isNew && (
            <button onClick={handleDelete}
              style={{ padding: '0.5rem 1rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}>
              Delete
            </button>
          )}
          {!isNew && (
            <a href={`/blog/${slug}`} target="_blank" rel="noopener"
              style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: 600 }}>
              Preview ↗
            </a>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '0.5rem 1.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.5rem',
          background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#dc2626' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Slug *</label>
          <input value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="url-friendly-slug" style={inputStyle} />
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>URL: /blog/{slug}</p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Excerpt</label>
          <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3}
            placeholder="Short description shown in listings..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Cover Image URL</label>
          <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 500 }}>Categories</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORY_OPTIONS.map(cat => (
              <button key={cat} onClick={() => toggleCategory(cat)} type="button"
                style={{ padding: '0.35rem 0.9rem', borderRadius: '999px', border: '1.5px solid',
                  borderColor: categories.includes(cat) ? '#10b981' : '#d1d5db',
                  background: categories.includes(cat) ? '#10b981' : 'transparent',
                  color: categories.includes(cat) ? '#fff' : '#374151',
                  cursor: 'pointer', fontSize: '0.875rem' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ ...inputStyle, width: 'auto' }}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>Content (HTML)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={20}
            placeholder="<p>Your article content here...</p>"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.875rem' }} />
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>HTML is supported. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;, etc.</p>
        </div>

        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '0.75rem' }}>SEO Fields</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem' }}>SEO Title (leave blank to use post title)</label>
              <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem' }}>SEO Description</label>
              <textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} rows={2}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
