import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata = { title: 'Blog — Admin' }
export const dynamic = 'force-dynamic'

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }
const td = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f6f6f6', color: '#1f2937' }

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

function postStatus(p, now) {
  if (p.status !== 'published') {
    return { label: 'Draft', bg: '#f3f4f6', color: '#4b5563' }
  }
  if (p.published_at && new Date(p.published_at) > now) {
    return { label: `Scheduled · ${fmtDate(p.published_at)}`, bg: '#fef3c7', color: '#92400e' }
  }
  return { label: 'Live', bg: '#d1fae5', color: '#065f46' }
}

const PILLAR_LABELS = {
  A: 'A · Systems',
  B: 'B · Budget',
  C: 'C · Picky',
  D: 'D · System',
  E: 'E · Commercial',
}

export default async function AdminBlogPage() {
  const supabase = createAdminClient()
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, status, pillar, published_at, updated_at')
    .order('published_at', { ascending: false, nullsFirst: true })
    .limit(500)

  if (error) console.error('[Admin blog] Failed to load posts:', error.message)
  const now = new Date()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>Blog posts</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Add, review and manage all posts. Scheduled posts go live automatically on their publish date; super-admins can preview them any time.
          </p>
        </div>
        <Link
          href="/mintadmn/blog/new"
          style={{ padding: '0.5rem 1.25rem', background: '#2d6e2e', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
        >
          + New post
        </Link>
      </div>

      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={th}>Title</th>
              <th style={th}>Pillar</th>
              <th style={th}>Status</th>
              <th style={th}>Published</th>
              <th style={th}>Updated</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {(posts ?? []).length === 0 && (
              <tr><td colSpan={6} style={{ ...td, color: '#9ca3af', textAlign: 'center', padding: 32 }}>
                No posts yet — click "+ New post" to write the first one.
              </td></tr>
            )}
            {(posts ?? []).map((p) => {
              const s = postStatus(p, now)
              return (
                <tr key={p.id}>
                  <td style={td}>
                    <Link href={`/mintadmn/blog/${p.slug}/edit`} style={{ color: '#2d6e2e', fontWeight: 600, textDecoration: 'none' }}>
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>/blog/{p.slug}</div>
                  </td>
                  <td style={td}>
                    {p.pillar
                      ? <span style={{ fontSize: 12, padding: '0.15rem 0.55rem', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontWeight: 600 }}>{PILLAR_LABELS[p.pillar] ?? p.pillar}</span>
                      : <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 12, padding: '0.15rem 0.55rem', borderRadius: 999, background: s.bg, color: s.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.label}</span>
                  </td>
                  <td style={{ ...td, fontSize: 13 }}>{fmtDate(p.published_at)}</td>
                  <td style={{ ...td, fontSize: 13 }}>{fmtDate(p.updated_at)}</td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link href={`/mintadmn/blog/${p.slug}/edit`} style={{ color: '#2d6e2e', fontWeight: 600, textDecoration: 'none', marginRight: 12 }}>
                      Edit
                    </Link>
                    {p.status === 'published' && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noopener" style={{ color: '#6b7280', fontWeight: 600, textDecoration: 'none' }}>
                        Preview ↗
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
