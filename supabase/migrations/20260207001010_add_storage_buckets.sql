-- Storage buckets for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-avatars', 'profile-avatars', true),
  ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for avatar buckets
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id IN ('profile-avatars', 'group-avatars'));

-- Authenticated users can upload avatars
CREATE POLICY "Authenticated upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('profile-avatars', 'group-avatars'));

-- Authenticated users can update avatars
CREATE POLICY "Authenticated update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('profile-avatars', 'group-avatars'));

-- Authenticated users can delete avatars
CREATE POLICY "Authenticated delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('profile-avatars', 'group-avatars'));
