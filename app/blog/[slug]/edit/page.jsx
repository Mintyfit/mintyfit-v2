import { redirect } from 'next/navigation'

/* Blog management lives in the admin area now — keep this URL working. */
export default async function LegacyEditBlogPostRedirect({ params }) {
  const { slug } = await params
  redirect(`/mintadmn/blog/${slug}/edit`)
}
