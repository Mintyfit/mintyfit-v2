-- Allow authenticated users to INSERT/UPDATE recipe-images (fixes silent base64 fallback)
-- Migration 052 only granted SELECT on recipe-images + blog-images. Without an
-- INSERT policy, direct client-side uploads to recipe-images were denied by RLS,
-- so lib/recipe/imageGeneration.js fell back to base64 data URIs (which the
-- catalogue normalizer strips as >4KB -> 🍽️ icon). The save now goes through
-- /api/recipe/save-image (service role), but this policy also unblocks direct
-- authenticated uploads as defense-in-depth.

DROP POLICY IF EXISTS "Authenticated write recipe-images" ON storage.objects;
CREATE POLICY "Authenticated write recipe-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'recipe-images');

DROP POLICY IF EXISTS "Authenticated update recipe-images" ON storage.objects;
CREATE POLICY "Authenticated update recipe-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'recipe-images');
