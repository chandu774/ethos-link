-- Storage bucket for community images
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete community images" ON storage.objects;

-- Public read access for community images
CREATE POLICY "Public read community images"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-images');

-- Authenticated users can upload community images
CREATE POLICY "Authenticated upload community images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-images');

-- Authenticated users can update community images
CREATE POLICY "Authenticated update community images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'community-images');

-- Authenticated users can delete community images
CREATE POLICY "Authenticated delete community images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'community-images');
