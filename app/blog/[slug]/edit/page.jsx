import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import BlogEditorClient from '@/components/blog/BlogEditorClient'

export const metadata = {
  title: 'Edit Post — MintyFit Blog',
  robots: { index: false, follow: false },
}

export default async function EditBlogPostPage({ params }) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/')

  const publicClient = createPublicClient()
  const { data: post } = await publicClient.from('blog_posts').select('*').eq('slug', slug).single()
  if (!post) notFound()

  return <BlogEditorClient post={post} isNew={false} />
}
