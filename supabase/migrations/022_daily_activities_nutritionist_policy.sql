-- Allow nutritionists to read their clients' daily activities
CREATE POLICY "Nutritionists read client activities"
  ON public.daily_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_client_links
      WHERE nutritionist_id = auth.uid()
        AND client_id = daily_activities.profile_id
        AND status = 'active'
    )
  );
