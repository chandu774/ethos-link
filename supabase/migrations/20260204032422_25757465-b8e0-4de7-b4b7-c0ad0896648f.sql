-- Add username column to profiles table with uniqueness constraint
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create an index for fast username searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- Update handle_new_user function to generate username from email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_username TEXT;
  new_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate base username from email (before @)
  base_username := LOWER(REGEXP_REPLACE(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  
  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;
  
  -- Try to find a unique username
  new_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := base_username || counter::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, name, email, username, mindset_traits, trust_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    new_username,
    '{"analytical": 50, "creative": 50, "emotional": 50, "logical": 50, "risk_taking": 50, "collaborative": 50}',
    100
  );
  RETURN NEW;
END;
$function$;

-- Update the profiles_public view to include username
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT 
  id,
  name,
  username,
  avatar_url,
  mode,
  interests,
  joined_communities,
  mindset_traits,
  created_at
FROM public.profiles;

-- Update existing profiles to have a username if they don't have one
UPDATE public.profiles 
SET username = LOWER(REGEXP_REPLACE(split_part(email, '@', 1), '[^a-z0-9]', '', 'g')) || id::text
WHERE username IS NULL;