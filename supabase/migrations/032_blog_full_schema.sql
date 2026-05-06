-- Migrate blog schema to match old build structure
-- This creates proper junction tables for categories and tags

-- 1. Create blog_categories table if not exists
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text  NOT NULL UNIQUE,
  slug  text  NOT NULL UNIQUE,
  color text  DEFAULT '#2d6e2e',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create blog_tags table if not exists  
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id    uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text  NOT NULL UNIQUE,
  slug  text  NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create blog_post_categories junction table
CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  post_id      uuid  NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id  uuid  NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- 4. Create blog_post_tags junction table
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id  uuid  NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id   uuid  NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 5. Add sidebar_html to blog_posts table (per-post, not global)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS sidebar_html text DEFAULT '';

-- 6. Rename cover_url to image_url for consistency (if legacy column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'cover_url') THEN
    ALTER TABLE blog_posts RENAME COLUMN cover_url TO image_url;
  END IF;
END $$;

-- 7. Add author_id column (references profiles)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id);

-- Set existing posts' author_id to a default or leave NULL
-- This will be populated when editing

-- 8. Add is_published boolean (in addition to status)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Sync is_published with status
UPDATE blog_posts SET is_published = true WHERE status = 'published';

-- 9. Add proper indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- 10. Enable RLS on all tables
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- 11. Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "blog_categories_select_all" ON blog_categories;
DROP POLICY IF EXISTS "blog_categories_admin" ON blog_categories;
DROP POLICY IF EXISTS "blog_tags_select_all" ON blog_tags;
DROP POLICY IF EXISTS "blog_tags_admin" ON blog_tags;
DROP POLICY IF EXISTS "blog_post_categories_select_all" ON blog_post_categories;
DROP POLICY IF EXISTS "blog_post_categories_admin" ON blog_post_categories;
DROP POLICY IF EXISTS "blog_post_tags_select_all" ON blog_post_tags;
DROP POLICY IF EXISTS "blog_post_tags_admin" ON blog_post_tags;

-- 12. Create policies for blog_categories
CREATE POLICY "blog_categories_select_all"
  ON public.blog_categories FOR SELECT USING (true);

CREATE POLICY "blog_categories_admin"
  ON public.blog_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 13. Create policies for blog_tags
CREATE POLICY "blog_tags_select_all"
  ON public.blog_tags FOR SELECT USING (true);

CREATE POLICY "blog_tags_admin"
  ON public.blog_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 14. Create policies for blog_post_categories
CREATE POLICY "blog_post_categories_select_all"
  ON public.blog_post_categories FOR SELECT USING (true);

CREATE POLICY "blog_post_categories_admin"
  ON public.blog_post_categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 15. Create policies for blog_post_tags
CREATE POLICY "blog_post_tags_select_all"
  ON public.blog_post_tags FOR SELECT USING (true);

CREATE POLICY "blog_post_tags_admin"
  ON public.blog_post_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 16. Update blog_posts policies to handle is_published
DROP POLICY IF EXISTS "Public blog posts are viewable by everyone" ON blog_posts;

CREATE POLICY "Public blog posts are viewable by everyone"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Admin can see all
DROP POLICY IF EXISTS "blog_posts_select_admin" ON blog_posts;
CREATE POLICY "blog_posts_select_admin"
  ON blog_posts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

COMMENT ON COLUMN blog_posts.sidebar_html IS 'Per-post sidebar HTML for sticky right column';
COMMENT ON COLUMN blog_posts.image_url IS 'Featured image URL';
COMMENT ON COLUMN blog_posts.author_id IS 'Reference to profiles table for post author';
