# Blog Post Page Fix — Cannot read properties of undefined

## Problem
Single blog posts were not opening, showing error:
```
Runtime TypeError: Cannot read properties of undefined (reading 'call')
app\blog\[slug]\page.jsx (175:11) @ BlogPostPage

> 175 |           <BlogPostHeader post={post} />
```

## Root Cause
`BlogPostHeader` was trying to use `useAuth()` hook inside a component that was wrapped with `AuthProvider`, but the AuthContext wasn't properly available in the server component context.

## Solution

### 1. Simplified BlogPostHeader
**File:** `components/blog/BlogPostHeader.jsx`

**Removed:**
- `useAuth()` hook call
- Dependency on AuthContext

**Added:**
- `isSuperAdmin` prop (passed from parent)

```javascript
export default function BlogPostHeader({ post, isSuperAdmin }) {
  const pathname = usePathname()
  const isEditPage = pathname?.endsWith('/edit')

  if (isEditPage) return null

  return (
    <div style={{ ... }}>
      <Link href="/blog">← Back to Blog</Link>
      {isSuperAdmin && post?.slug && (
        <Link href={`/blog/${post.slug}/edit`}>
          <Pencil size={13} />
          Edit Post
        </Link>
      )}
    </div>
  )
}
```

### 2. Server-Side Admin Check
**File:** `app/blog/[slug]/page.jsx`

**Added:**
```javascript
// Check if current user is super admin (server-side)
const { createClient } = await import('@/lib/supabase/server')
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
let isSuperAdmin = false
if (user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  isSuperAdmin = profile?.role === 'super_admin'
}
```

**Updated:**
```jsx
// Pass isSuperAdmin as prop
<BlogPostHeader post={post} isSuperAdmin={isSuperAdmin} />
```

### 3. Removed AuthProvider Wrapper
**Removed:**
- `AuthProvider` import
- `<AuthProvider>` wrapper around page content
- Closing `</AuthProvider>` tag

**Why:** Not needed anymore since admin check is done server-side.

---

## Files Changed

| File | Changes |
|------|---------|
| `components/blog/BlogPostHeader.jsx` | Removed useAuth, added isSuperAdmin prop |
| `app/blog/[slug]/page.jsx` | Added server-side admin check, removed AuthProvider |

---

## How It Works Now

### Server Component Flow
```
1. BlogPostPage (Server Component) loads
   ↓
2. Fetches post from database
   ↓
3. Checks current user's role from Supabase
   ↓
4. Determines isSuperAdmin (true/false)
   ↓
5. Passes isSuperAdmin to BlogPostHeader as prop
   ↓
6. BlogPostHeader (Client Component) renders
   ↓
7. Shows "Edit Post" button if isSuperAdmin = true
```

### Benefits
- ✅ No AuthContext dependency issues
- ✅ Faster (admin check on server, not client)
- ✅ More secure (role check on server)
- ✅ Simpler code (no provider nesting)

---

## Testing Checklist

### Single Blog Post
- [ ] Open `/blog/water-calculator`
- [ ] ✅ Page loads without errors
- [ ] ✅ Shows categories at top
- [ ] ✅ Shows excerpt (if available)
- [ ] ✅ Shows date and reading time
- [ ] ✅ Shows featured image
- [ ] ✅ Shows content with calculator
- [ ] ✅ Shows tags at bottom
- [ ] ✅ Shows related posts
- [ ] ✅ Shows CTA

### Admin Features
- [ ] Log in as super admin
- [ ] Open any blog post
- [ ] ✅ "Edit Post" button appears (top right)
- [ ] Click "Edit Post"
- [ ] ✅ Redirects to `/blog/[slug]/edit`
- [ ] Log out (non-admin user)
- [ ] Open same blog post
- [ ] ✅ "Edit Post" button does NOT appear

### Navigation
- [ ] Click "← Back to Blog"
- [ ] ✅ Returns to `/blog` archive page
- [ ] Click category chip
- [ ] ✅ Filters by category
- [ ] Click tag
- [ ] ✅ Filters by tag (if implemented)

---

## Error Prevention

### Before (Broken)
```javascript
// ❌ BlogPostHeader tried to use useAuth()
import { useAuth } from '@/contexts/AuthContext'

export default function BlogPostHeader({ post }) {
  const { isSuperAdmin } = useAuth()  // ← Error: AuthContext not available
  // ...
}

// ❌ Wrapped in AuthProvider (didn't help)
<AuthProvider>
  <BlogPostHeader post={post} />
</AuthProvider>
```

### After (Fixed)
```javascript
// ✅ BlogPostHeader receives isSuperAdmin as prop
export default function BlogPostHeader({ post, isSuperAdmin }) {
  // No useAuth needed
  // ...
}

// ✅ Admin check on server
const isSuperAdmin = profile?.role === 'super_admin'
<BlogPostHeader post={post} isSuperAdmin={isSuperAdmin} />
```

---

## Summary

| Issue | Status | Fix |
|-------|--------|-----|
| Blog posts not opening | ✅ Fixed | Removed AuthContext dependency |
| BlogPostHeader undefined | ✅ Fixed | Simplified component |
| Admin check not working | ✅ Fixed | Server-side role check |
| AuthProvider nesting | ✅ Removed | Not needed |

Blog posts now open correctly with proper admin edit button functionality!
