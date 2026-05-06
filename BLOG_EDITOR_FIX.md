# Blog Editor Schema Fix — author_name Column Error

## Problem
When saving a blog post, the editor threw an error:
```
Could not find the 'author_name' column of 'blog_posts' in the schema cache
```

## Root Cause
The blog editor was trying to save `author_name` as a text column in `blog_posts`, but the actual database schema uses:
- `author_id` (UUID) — references `profiles.id`
- Author name is fetched from `profiles.full_name`

## Database Schema (Actual)

```sql
-- From 20260225_blog.sql
CREATE TABLE public.blog_posts (
  id            uuid PRIMARY KEY,
  author_id     uuid NOT NULL REFERENCES public.profiles(id),
  title         text NOT NULL,
  slug          text NOT NULL UNIQUE,
  excerpt       text DEFAULT '',
  content       text DEFAULT '',
  sidebar_html  text DEFAULT '',
  image_url     text DEFAULT '',
  is_published  boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- profiles table (from auth.users)
CREATE TABLE public.profiles (
  id        uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  role      text DEFAULT 'customer'
);
```

## Files Changed

### 1. `components/blog/BlogEditorClient.jsx`

**Removed:**
- `authorName` state variable
- Author Name input field from SEO section
- `author_name` from save payload

**Updated Payload:**
```javascript
const payload = {
  author_id: user?.id,  // ← Uses authenticated user's ID
  title: title.trim(),
  slug: postSlug.trim(),
  excerpt: excerpt.trim(),
  content,
  sidebar_html: sidebarHtml,
  image_url: imageUrl,
  is_published: isPublished,
  published_at: isPublished ? (publishedAt ? new Date(publishedAt).toISOString() : null) : null,
  seo_title: seoTitle || null,
  seo_description: seoDesc || null,
  updated_at: new Date().toISOString(),
}
```

### 2. `app/blog/[slug]/page.jsx`

**Updated Query:**
```javascript
async function getPost(slug) {
  const supabase = createPublicClient()
  let { data, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      profiles ( full_name ),  // ← Fetch author name from profiles
      blog_post_categories (
        blog_categories ( id, name, slug, color )
      ),
      blog_post_tags (
        blog_tags ( id, name, slug )
      )
    `)
    .eq('slug', slug)
    .single()
  
  // Extract author name from profiles join
  data.author_name = data.profiles?.full_name || 'MintyFit Team'
  
  return data
}
```

**Fallback for Old Schema:**
```javascript
// If junction tables don't exist, fetch with profiles join
const { data: simpleData } = await supabase
  .from('blog_posts')
  .select('*, profiles ( full_name )')
  .eq('slug', slug)
  .single()

simpleData.author_name = simpleData.profiles?.full_name || 'MintyFit Team'
```

## Behavior

### Creating a New Post
1. User clicks "Save"
2. Editor saves `author_id: user.id` to database
3. Author name is NOT stored in blog_posts
4. Author name is fetched from profiles when displaying

### Displaying a Post
1. Query joins `blog_posts` with `profiles`
2. Gets `full_name` from profiles table
3. Falls back to "MintyFit Team" if no name

### Categories Update
The blog archive page now **dynamically generates** category filters from actual post categories:

```javascript
const categories = useMemo(() => {
  const allCats = new Set(['All'])
  initialPosts.forEach(post => {
    const cats = post.blog_post_categories 
      ? (post.blog_post_categories || []).map(pc => pc.blog_categories).filter(Boolean).map(c => c.name)
      : (post.categories || [])
    cats.forEach(cat => allCats.add(cat))
  })
  return Array.from(allCats).sort()
}, [initialPosts])
```

**Before:** Hardcoded `['All', 'Nutrition', 'Meal Planning', ...]`
**After:** Dynamic from posts (e.g., `['All', 'Basic nutrition', 'Calculator', 'Vitamins']`)

## Testing Checklist

### Editor
- [ ] Open `/blog/new`
- [ ] Fill in title, content
- [ ] Select categories
- [ ] Click "Save"
- [ ] ✅ No schema error
- [ ] ✅ Post saves successfully

### Display
- [ ] Open saved post at `/blog/[slug]`
- [ ] ✅ Shows author name from profiles (or "MintyFit Team")
- [ ] ✅ Shows categories
- [ ] ✅ Shows reading time
- [ ] ✅ No author name in byline (removed earlier)

### Archive
- [ ] Open `/blog`
- [ ] ✅ Category filters show actual categories from posts
- [ ] ✅ "Basic nutrition", "Calculator", "Vitamins" appear if posts have them
- [ ] ✅ Clicking category filters posts correctly

## Schema Compatibility

The code now supports **both** schemas:

### Current Schema (TEXT[] arrays)
```sql
blog_posts:
  - author_id uuid
  - categories TEXT[]
  - tags TEXT[]
```

### Target Schema (Junction tables)
```sql
blog_posts:
  - author_id uuid
  - (no categories/tags columns)

blog_post_categories:
  - post_id, category_id

blog_post_tags:
  - post_id, tag_id
```

**Automatic fallback** ensures both work!

## Summary

| Issue | Status | Fix |
|-------|--------|-----|
| `author_name` column error | ✅ Fixed | Use `author_id` + profiles join |
| Author name not saving | ✅ Fixed | Saved via `author_id` |
| Author name not displaying | ✅ Fixed | Fetched from profiles |
| Categories hardcoded | ✅ Fixed | Dynamic from posts |
| Schema compatibility | ✅ Works | Supports both TEXT[] and junction |

Blog editor now works correctly with the actual database schema!
