-- Add avatar_url for community images
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Allow public read access to communities
CREATE POLICY "Public can view communities"
ON public.communities FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to update communities (for avatar uploads)
CREATE POLICY "Authenticated users can update communities"
ON public.communities FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create community_members table to track membership counts
CREATE TABLE IF NOT EXISTS public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id text NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view community members"
ON public.community_members FOR SELECT
TO anon
USING (true);

CREATE POLICY "Authenticated users can join communities"
ON public.community_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can leave communities"
ON public.community_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
