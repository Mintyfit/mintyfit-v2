-- Make blog-images and recipe-images buckets publicly readable
-- Without these policies, anonymous visitors see broken images on the landing page

-- Public SELECT on blog-images
DROP POLICY IF EXISTS "Public read blog-images" ON storage.objects;
CREATE POLICY "Public read blog-images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'blog-images');

-- Public SELECT on recipe-images
DROP POLICY IF EXISTS "Public read recipe-images" ON storage.objects;
CREATE POLICY "Public read recipe-images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'recipe-images');
