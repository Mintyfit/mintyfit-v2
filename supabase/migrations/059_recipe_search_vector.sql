-- ============================================================================
-- 059: Full-text search vector on recipes
--
-- Powers the assistant's recipe search (hybrid FTS + LLM rerank).
-- Generated column keeps the vector in sync automatically.
-- English stemming; title weighs most via plain concat order (tsvector
-- ranking handles position implicitly well enough for our catalogue size).
-- ============================================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(cuisine_type, '') || ' ' ||
      coalesce(meal_type, '') || ' ' ||
      coalesce(food_type, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS recipes_search_vector_idx
  ON public.recipes USING GIN (search_vector);
