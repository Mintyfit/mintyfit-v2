import BlogEditorClient from '@/components/blog/BlogEditorClient'

export const metadata = {
  title: 'New Post — Admin Blog',
  robots: { index: false, follow: false },
}

/* Access is gated by app/mintadmn/layout.jsx (super_admin only). */
export default function AdminNewBlogPostPage() {
  return <BlogEditorClient post={null} isNew={true} />
}
