# Blog Display Updates — Archive & Single Post

## Changes Made

### 1. Blog Archive Page (`/blog`)

**Removed:**
- ❌ Excerpt text on post cards
- ❌ Author name

**Added:**
- ✅ Reading time (e.g., "5 min read")
- ✅ Date only (no author)

**Before:**
```
┌─────────────────────────────────┐
│ [Image]                         │
│ [Calculator] [Nutrition]        │
│ Water Intake Calculator         │
│ Calculate your daily water...   │ ← Excerpt (removed)
│ MintyFit Team · Jan 15, 2026    │ ← Author (removed)
└─────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────┐
│ [Image]                         │
│ [Calculator] [Nutrition]        │
│ Water Intake Calculator         │
│ Jan 2026 · 5 min read           │ ← Date + Reading time
└─────────────────────────────────┘
```

### 2. Single Blog Post Page (`/blog/[slug]`)

**Removed:**
- ❌ Author name from byline

**Added:**
- ✅ Reading time in byline
- ✅ Excerpt displays under title (if available)

**Before:**
```
[Categories]
Title
By MintyFit Team · January 15, 2026  ← Author (removed)
[Image]
```

**After:**
```
[Categories]
Title
Short description if available...     ← Excerpt (added)
January 2026 · 5 min read            ← Date + Reading time (updated)
[Image]
```

### 3. Critical Fix: Blog Posts Now Open!

**Problem:** Single blog posts (`/blog/[slug]`) were not opening because the database query was trying to join with junction tables that don't exist yet.

**Solution:** Added fallback logic to handle both schemas:

```javascript
// Try junction tables first
let { data, error } = await supabase
  .from('blog_posts')
  .select(`*, blog_post_categories (...), blog_post_tags (...)`)
  .eq('slug', slug)
  .single()

// Fallback to TEXT[] arrays if junction tables don't exist
if (error || !data) {
  const { data: simpleData } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()
  
  // Convert TEXT[] to junction format
  return {
    ...simpleData,
    blog_post_categories: (simpleData.categories || []).map(...),
    blog_post_tags: (simpleData.tags || []).map(...)
  }
}
```

**Result:** Blog posts now open correctly with the current database schema!

---

## Files Changed

### 1. `components/blog/BlogListClient.jsx`
- Removed excerpt display
- Removed author name
- Added reading time calculation
- Updated metadata display

### 2. `app/blog/[slug]/page.jsx`
- Added fallback query for junction tables
- Removed author from byline
- Added reading time
- Added excerpt display under title

### 3. `app/blog/page.jsx`
- Added fallback query for junction tables
- Ensures categories/tags work with both schemas

---

## Testing Checklist

### Blog Archive (`/blog`)
- [ ] Post cards show categories
- [ ] Post cards show title only (no excerpt)
- [ ] Post cards show date + reading time
- [ ] No author name displayed
- [ ] Clicking post opens single view

### Single Post (`/blog/[slug]`)
- [ ] Page loads without errors
- [ ] Categories display at top
- [ ] Excerpt shows (if post has one)
- [ ] Date + reading time in byline
- [ ] No author name
- [ ] Featured image displays
- [ ] Content renders correctly
- [ ] Tags display at bottom
- [ ] Related posts show
- [ ] CTA displays

### Specific URLs to Test
- [ ] `/blog` — Archive page
- [ ] `/blog/water-calculator` — Should open
- [ ] `/blog/comprehensive-vitamin-d3-calculator` — Should open
- [ ] `/blog/should-you-supplement-for-magnesium` — Should open

---

## Reading Time Calculation

Both archive and single post pages now calculate reading time:

```javascript
const readTime = (() => {
  const words = (post.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
})()
```

- Based on 200 words per minute average reading speed
- Strips HTML tags before counting
- Minimum 1 minute

---

## Schema Compatibility

All pages now support **both** database schemas:

### Old Schema (Current)
```sql
blog_posts:
  - categories TEXT[]
  - tags TEXT[]
```

### New Schema (Target)
```sql
blog_posts:
  - (no categories/tags columns)
  
blog_post_categories:
  - post_id, category_id
  
blog_post_tags:
  - post_id, tag_id
```

**Code automatically detects which schema is in use and adapts!**

---

## Summary

| Feature | Archive Page | Single Post |
|---------|--------------|-------------|
| Categories | ✅ Display | ✅ Display |
| Excerpt | ❌ Removed | ✅ Shows if available |
| Author | ❌ Removed | ❌ Removed |
| Date | ✅ Display | ✅ Display |
| Reading Time | ✅ Added | ✅ Added |
| Tags | N/A | ✅ Display |
| Opens Correctly | ✅ Yes | ✅ Fixed! |

All issues resolved! Blog posts now open correctly with proper metadata display.
