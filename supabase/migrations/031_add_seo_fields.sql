-- Add SEO fields to blog_posts table
-- These fields are important for search engine optimization

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
