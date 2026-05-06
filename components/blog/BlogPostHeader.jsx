'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'

export default function BlogPostHeader({ post, isSuperAdmin }) {
  const pathname = usePathname()
  const isEditPage = pathname?.endsWith('/edit')

  if (isEditPage) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <Link href="/blog" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>
        ← Back to Blog
      </Link>
      {isSuperAdmin && post?.slug && (
        <Link
          href={`/blog/${post.slug}/edit`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-subtle, #f3f4f6)',
            color: 'var(--text-2, #374151)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Pencil size={13} />
          Edit Post
        </Link>
      )}
    </div>
  )
}
