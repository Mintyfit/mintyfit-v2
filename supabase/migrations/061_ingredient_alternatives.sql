-- Shared cache of AI-generated ingredient swap suggestions.
-- Keyed by normalized ingredient name. Stores the raw AI suggestions with
-- ABSOLUTE amounts ({name, amount, unit, reason}) — the route computes
-- amount_factor per request against the caller's original quantity, so one
-- cached row correctly serves any recipe quantity.
-- No profile_id — this is reference data shared across all users.

CREATE TABLE IF NOT EXISTS ingredient_alternatives (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_normalized text NOT NULL,  -- lowercase, trimmed, single-spaced
  alternatives    jsonb NOT NULL, -- [{"name":"artichoke hearts","amount":400,"unit":"g","reason":"..."}]
  source          text NOT NULL DEFAULT 'ai',  -- 'ai' | 'manual'
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ingredient_alternatives_name_idx ON ingredient_alternatives (name_normalized);

-- RLS
ALTER TABLE ingredient_alternatives ENABLE ROW LEVEL SECURITY;

-- Everyone can read (generic reference data)
CREATE POLICY "ingredient_alternatives_select" ON ingredient_alternatives FOR SELECT USING (true);

-- No client write policy: writes happen only in /api/ingredient-alternatives
-- via the service role (bypasses RLS). Curation via service role / dashboard.
