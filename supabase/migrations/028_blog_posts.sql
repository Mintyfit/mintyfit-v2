-- Blog posts table - add missing columns to existing table
-- This handles the case where blog_posts table already exists with different schema

-- Add status column if missing
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at);

-- Ensure RLS is enabled
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Ensure public read policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public blog posts are viewable by everyone' AND tablename = 'blog_posts'
  ) THEN
    CREATE POLICY "Public blog posts are viewable by everyone"
      ON blog_posts FOR SELECT
      TO anon, authenticated
      USING (status = 'published');
  END IF;
END
$$;