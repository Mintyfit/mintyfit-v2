-- Allow anonymous users to read recipes marked as public
-- Previously only 'authenticated' role had a policy to see public recipes,
-- so the /recipes page returned 0 results for unauthenticated visitors.
CREATE POLICY "Public recipes visible to all"
ON recipes
FOR SELECT
TO public
USING (is_public = true);
