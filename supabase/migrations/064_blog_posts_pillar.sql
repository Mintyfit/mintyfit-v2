-- 064: SEO pillar attribution for blog posts (SEO-STRATEGY.md §3)
-- Every NEW post belongs to exactly one pillar A–E. Legacy pre-strategy
-- wellness posts stay NULL (they belong to no pillar — do not backfill them).
-- Apply manually in the Supabase SQL Editor (no Management API access).

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS pillar text;

ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_pillar_check;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_pillar_check
  CHECK (pillar IS NULL OR pillar IN ('A', 'B', 'C', 'D', 'E'));

COMMENT ON COLUMN blog_posts.pillar IS 'SEO pillar (A–E) from SEO-STRATEGY.md §3. NULL = legacy / no pillar.';

-- Tag the four pillar posts scheduled 2026-10-16 (idempotent, matches by slug).
-- The 8 legacy pre-strategy wellness posts deliberately stay NULL.
UPDATE blog_posts SET pillar = 'A' WHERE slug = 'weekly-dinner-themes' AND pillar IS NULL;
UPDATE blog_posts SET pillar = 'B' WHERE slug = '50-dollar-weekly-meal-plan-family-of-4' AND pillar IS NULL;
UPDATE blog_posts SET pillar = 'C' WHERE slug = 'build-your-own-dinner-ideas' AND pillar IS NULL;
UPDATE blog_posts SET pillar = 'D' WHERE slug = 'meal-plan-generator-family' AND pillar IS NULL;
