import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import BlogEditorClient from '@/components/blog/BlogEditorClient'

export const metadata = {
  title: 'Edit Post — Admin Blog',
  robots: { index: false, follow: false },
}

/* Access is gated by app/mintadmn/layout.jsx (super_admin only). The admin client
   loads any status — drafts and scheduled posts included. */
export default async function AdminEditBlogPostPage({ params }) {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data: post } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()
  if (!post) notFound()

  return <BlogEditorClient post={post} isNew={false} />
}
