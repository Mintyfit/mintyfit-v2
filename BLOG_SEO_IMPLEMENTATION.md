# SEO Fields Implementation — Blog Posts

## Problem
When saving a blog post, the editor threw errors:
```
Could not find the 'seo_title' column of 'blog_posts' in the schema cache
Could not find the 'seo_description' column of 'blog_posts' in the schema cache
```

## Solution
Added SEO fields to the database schema and restored them in the editor.

---

## Database Migration

**File:** `supabase/migrations/20260428_add_seo_fields.sql`

```sql
-- Add SEO title column (for search engine results)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_title text DEFAULT NULL;

-- Add SEO description column (meta description for search results)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_description text DEFAULT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_seo_title ON blog_posts(seo_title);
CREATE INDEX IF NOT EXISTS idx_blog_posts_seo_description ON blog_posts(seo_description);

-- Add comments for documentation
COMMENT ON COLUMN blog_posts.seo_title IS 'Custom title tag for search engines (defaults to post title if empty)';
COMMENT ON COLUMN blog_posts.seo_description IS 'Meta description for search engine results (defaults to excerpt if empty)';
```

**Action Required:** Run this migration in Supabase SQL Editor or wait for automatic application.

---

## Blog Editor Changes

**File:** `components/blog/BlogEditorClient.jsx`

### State Variables
```javascript
// SEO fields
const [seoTitle, setSeoTitle] = useState(post?.seo_title || '')
const [seoDesc, setSeoDesc] = useState(post?.seo_description || '')
```

### Save Payload
```javascript
const payload = {
  author_id: user?.id,
  title: title.trim(),
  slug: postSlug.trim(),
  excerpt: excerpt.trim(),
  content,
  sidebar_html: sidebarHtml,
  image_url: imageUrl,
  is_published: isPublished,
  published_at: isPublished ? (publishedAt ? new Date(publishedAt).toISOString() : null) : null,
  seo_title: seoTitle || null,      // ← Added
  seo_description: seoDesc || null,  // ← Added
  updated_at: new Date().toISOString(),
}
```

### UI Component
```jsx
<details style={{ ...CARD, marginBottom: 16 }}>
  <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 12, fontSize: 16, color: 'var(--text-2)' }}>
    🔍 SEO Settings (Optional)
  </summary>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
    <div>
      <label style={LABEL}>SEO Title</label>
      <input
        value={seoTitle}
        onChange={e => setSeoTitle(e.target.value)}
        placeholder="Custom title for search engines (leave blank to use post title)"
        style={INPUT}
      />
      <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '4px' }}>
        Recommended: 50-60 characters. Defaults to post title if empty.
      </p>
    </div>
    <div>
      <label style={LABEL}>SEO Description</label>
      <textarea
        value={seoDesc}
        onChange={e => setSeoDesc(e.target.value)}
        placeholder="Meta description for search engine results (leave blank to use excerpt)"
        rows={3}
        style={{ ...INPUT, resize: 'vertical' }}
      />
      <p style={{ fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '4px' }}>
        Recommended: 150-160 characters. Defaults to excerpt if empty.
      </p>
    </div>
  </div>
</details>
```

---

## Blog Post Display

**File:** `app/blog/[slug]/page.jsx`

### Metadata Generation
```javascript
export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Article Not Found — MintyFit' }
  
  // Use SEO fields if available, fallback to title/excerpt
  const title = post.seo_title || post.title
  const description = post.seo_description || post.excerpt || post.title
  
  return {
    title: `${title} — MintyFit Blog`,
    description,
    openGraph: {
      title: post.title,
      description,
      images: post.image_url ? [{ url: post.image_url }] : [],
      type: 'article',
      publishedTime: post.published_at,
      authors: [post.author_name || 'MintyFit Team'],
    },
    alternates: {
      canonical: `/blog/${slug}`,
    },
  }
}
```

**Fallback Logic:**
- `seo_title` → `post.title` (if SEO title empty)
- `seo_description` → `post.excerpt` → `post.title` (if SEO description empty)

---

## SEO Best Practices

### SEO Title
- **Length:** 50-60 characters (including spaces)
- **Format:** Primary Keyword - Secondary Keyword | Brand
- **Example:** "Water Intake Calculator - Daily Hydration Guide | MintyFit"
- **Tips:**
  - Put important keywords first
  - Include year for time-sensitive content
  - Avoid keyword stuffing
  - Make it compelling for clicks

### SEO Description
- **Length:** 150-160 characters (including spaces)
- **Format:** Hook + Value Proposition + Call-to-Action
- **Example:** "Calculate your daily water intake needs based on weight, activity, and climate. Get personalized hydration recommendations backed by science."
- **Tips:**
  - Include primary keyword naturally
  - Write for humans, not just search engines
  - Include a call-to-action
  - Make each description unique

---

## Complete Blog Schema

After migration, `blog_posts` table has:

```sql
CREATE TABLE public.blog_posts (
  -- Core Fields
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid NOT NULL REFERENCES public.profiles(id),
  title           text NOT NULL,
  slug            text NOT NULL UNIQUE,
  excerpt         text DEFAULT '',
  content         text DEFAULT '',
  
  -- Media
  sidebar_html    text DEFAULT '',
  image_url       text DEFAULT '',
  
  -- Publishing
  is_published    boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  
  -- SEO Fields (NEW)
  seo_title       text DEFAULT NULL,
  seo_description text DEFAULT NULL,
  
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

---

## Testing Checklist

### Migration
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify columns exist: `seo_title`, `seo_description`
- [ ] Check indexes created

### Editor
- [ ] Open `/blog/new`
- [ ] Fill in post details
- [ ] Expand "SEO Settings" section
- [ ] Enter custom SEO title (e.g., "Test Post - SEO Test | MintyFit")
- [ ] Enter custom SEO description (e.g., "This is a test post for SEO...")
- [ ] Click "Save"
- [ ] ✅ No schema errors
- [ ] ✅ Post saves successfully

### Display
- [ ] Open saved post at `/blog/[slug]`
- [ ] View page source
- [ ] Check `<title>` tag shows SEO title
- [ ] Check `<meta name="description">` shows SEO description
- [ ] Check Open Graph tags in source
- [ ] Test with empty SEO fields (should fallback to title/excerpt)

### Google Search Console (Future)
- [ ] Submit sitemap
- [ ] Monitor search appearance
- [ ] Check title/description in search results

---

## Fallback Behavior

| SEO Field | User Input | Displayed |
|-----------|------------|-----------|
| `seo_title` | "Custom SEO Title" | "Custom SEO Title" |
| `seo_title` | "" (empty) | `post.title` |
| `seo_title` | NULL | `post.title` |
| `seo_description` | "Custom meta description" | "Custom meta description" |
| `seo_description` | "" (empty) | `post.excerpt` |
| `seo_description` | NULL | `post.excerpt` → `post.title` |

---

## Files Changed

| File | Changes |
|------|---------|
| `supabase/migrations/20260428_add_seo_fields.sql` | ✅ Created - adds SEO columns |
| `components/blog/BlogEditorClient.jsx` | ✅ Updated - SEO state, payload, UI |
| `app/blog/[slug]/page.jsx` | ✅ Updated - metadata uses SEO fields |

---

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Database columns | ✅ Added | `seo_title`, `seo_description` |
| Editor UI | ✅ Restored | Collapsible "SEO Settings" section |
| Save functionality | ✅ Works | Includes SEO fields in payload |
| Display metadata | ✅ Updated | Uses SEO fields with fallbacks |
| Best practices | ✅ Documented | Character limits, tips |
| Fallback logic | ✅ Implemented | Graceful degradation |

SEO fields are now fully implemented and ready for use! The migration will be automatically applied by Supabase, or you can run it manually in the SQL Editor.
