-- Add slug column to recipes table for clean URLs
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);

-- Populate slug from existing titles if null
UPDATE recipes SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-z0-9]+', '-', 'g'), '^-|-$', '', 'g')) || '-' || LEFT(id::TEXT, 6) WHERE slug IS NULL;