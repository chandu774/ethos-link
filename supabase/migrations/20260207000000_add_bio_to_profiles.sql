-- Add bio column to profiles and expose it in the public view
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text;

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT
  id,
  name,
  username,
  bio,
  avatar_url,
  mode,
  interests,
  joined_communities,
  mindset_traits,
  created_at
FROM public.profiles;
