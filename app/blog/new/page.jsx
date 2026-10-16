import { redirect } from 'next/navigation'

/* Blog management lives in the admin area now — keep this URL working. */
export default function LegacyNewBlogPostRedirect() {
  redirect('/mintadmn/blog/new')
}
