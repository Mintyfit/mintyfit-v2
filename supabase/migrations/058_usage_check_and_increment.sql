-- ============================================================================
-- 058: Atomic server-side usage metering
--
-- checkAndIncrementUsage() in lib/usageLimits.js ran in the BROWSER with a
-- read-then-upsert race, and the AI proxy routes were unmetered — anyone
-- authenticated could bypass free-tier limits by calling /api/grok directly.
--
-- This RPC performs the check + increment atomically in a single UPDATE.
-- Called from /api/claude and /api/grok (user-context client, so we verify
-- auth.uid() matches despite SECURITY DEFINER).
-- ============================================================================

-- Anti-abuse catch-all counter for any AI proxy call
ALTER TABLE public.daily_usage
  ADD COLUMN IF NOT EXISTS ai_calls integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.usage_check_and_increment(
  p_user_id uuid,
  p_type    text,   -- 'recipe_generations' | 'food_journal_entries' | 'ai_calls'
  p_limit   integer -- NULL or negative = unlimited
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_count integer;
BEGIN
  -- Callers may only meter their own usage
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'forbidden');
  END IF;

  -- Unlimited tier
  IF p_limit IS NULL OR p_limit < 0 THEN
    RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1);
  END IF;

  INSERT INTO daily_usage (user_id, date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, date) DO NOTHING;

  -- Atomic conditional increment: only increments while under the limit
  IF p_type = 'recipe_generations' THEN
    UPDATE daily_usage SET recipe_generations = recipe_generations + 1
    WHERE user_id = p_user_id AND date = v_today AND recipe_generations < p_limit
    RETURNING recipe_generations INTO v_count;
  ELSIF p_type = 'food_journal_entries' THEN
    UPDATE daily_usage SET food_journal_entries = food_journal_entries + 1
    WHERE user_id = p_user_id AND date = v_today AND food_journal_entries < p_limit
    RETURNING food_journal_entries INTO v_count;
  ELSIF p_type = 'ai_calls' THEN
    UPDATE daily_usage SET ai_calls = ai_calls + 1
    WHERE user_id = p_user_id AND date = v_today AND ai_calls < p_limit
    RETURNING ai_calls INTO v_count;
  ELSE
    RETURN jsonb_build_object('allowed', false, 'error', 'unknown usage type');
  END IF;

  IF v_count IS NULL THEN
    -- Already at/over limit: report current count without incrementing
    EXECUTE format('SELECT %I FROM daily_usage WHERE user_id = $1 AND date = $2', p_type)
    INTO v_count USING p_user_id, v_today;
    RETURN jsonb_build_object('allowed', false, 'current', COALESCE(v_count, 0), 'limit', p_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'current', v_count, 'limit', p_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.usage_check_and_increment(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usage_check_and_increment(uuid, text, integer) TO authenticated;
