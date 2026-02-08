-- Add platform admin flag
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Extend communities for hybrid creation workflow
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_user_created boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS category text;

-- Ensure community members have roles
ALTER TABLE public.community_members
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Tighten community visibility policies
DROP POLICY IF EXISTS "Users can view communities" ON public.communities;
DROP POLICY IF EXISTS "Public can view communities" ON public.communities;

-- Approved communities visible to everyone
CREATE POLICY "Approved communities are public"
ON public.communities FOR SELECT
TO anon, authenticated
USING (approval_status = 'approved');

-- Creators can view their own communities (pending/rejected)
CREATE POLICY "Creators can view their communities"
ON public.communities FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Platform admins can view all communities
CREATE POLICY "Admins can view all communities"
ON public.communities FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

-- Allow authenticated users to request communities
CREATE POLICY "Users can request communities"
ON public.communities FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND is_user_created = true
  AND approval_status = 'pending'
);

-- Allow admins to update communities (approve/reject)
CREATE POLICY "Admins can update communities"
ON public.communities FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
))
WITH CHECK (true);

-- Admins can manage community memberships (for role assignment)
CREATE POLICY "Admins can manage community members"
ON public.community_members FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can update community members"
ON public.community_members FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
))
WITH CHECK (true);

-- Restrict community joins to approved communities
DROP POLICY IF EXISTS "Authenticated users can join communities" ON public.community_members;
CREATE POLICY "Users can join approved communities"
ON public.community_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.communities
    WHERE communities.id = community_members.community_id
      AND communities.approval_status = 'approved'
  )
);
