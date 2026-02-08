-- Fix PUBLIC_DATA_EXPOSURE: Restrict profile visibility

-- Create a public view with only non-sensitive fields for profile discovery
-- This allows users to browse potential connections without exposing sensitive data
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  avatar_url,
  mode,
  interests,
  joined_communities,
  mindset_traits,  -- Needed for similarity matching
  created_at
FROM public.profiles;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policy: users can only see their own full profile or profiles of accepted connections
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can view connected profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND receiver_id = profiles.id)
      OR (receiver_id = auth.uid() AND requester_id = profiles.id))
  )
);