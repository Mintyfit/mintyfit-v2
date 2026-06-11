-- ============================================================================
-- Migration 057: Allow nutritionists to write client calendar entries
-- ============================================================================
-- Policy 009 only allowed SELECT. This adds INSERT/UPDATE/DELETE so
-- nutritionists can manage client meal plans from the /plan page.

-- nutritionist_client_links table already has RLS allowing nutritionists
-- to read their own links (migration 003) and clients to manage theirs (055).

-- Allow nutritionists full CRUD on client calendar entries
DROP POLICY IF EXISTS "Nutritionists manage client calendars" ON public.calendar_entries;
CREATE POLICY "Nutritionists manage client calendars"
  ON public.calendar_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = calendar_entries.profile_id
        AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = calendar_entries.profile_id
        AND status = 'active'
    )
  );
