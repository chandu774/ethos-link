-- Update handle_new_user to set trust_score = 100 and use new mindset trait structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, mindset_traits, trust_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    '{"analytical": 50, "creative": 50, "emotional": 50, "logical": 50, "risk_taking": 50, "collaborative": 50}',
    100
  );
  RETURN NEW;
END;
$function$;

-- Update calculate_similarity to use new trait structure
CREATE OR REPLACE FUNCTION public.calculate_similarity(traits1 jsonb, traits2 jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  analytical_diff INTEGER;
  creative_diff INTEGER;
  emotional_diff INTEGER;
  logical_diff INTEGER;
  risk_taking_diff INTEGER;
  collaborative_diff INTEGER;
  total_diff INTEGER;
BEGIN
  analytical_diff := ABS(COALESCE((traits1->>'analytical')::INTEGER, 50) - COALESCE((traits2->>'analytical')::INTEGER, 50));
  creative_diff := ABS(COALESCE((traits1->>'creative')::INTEGER, 50) - COALESCE((traits2->>'creative')::INTEGER, 50));
  emotional_diff := ABS(COALESCE((traits1->>'emotional')::INTEGER, 50) - COALESCE((traits2->>'emotional')::INTEGER, 50));
  logical_diff := ABS(COALESCE((traits1->>'logical')::INTEGER, 50) - COALESCE((traits2->>'logical')::INTEGER, 50));
  risk_taking_diff := ABS(COALESCE((traits1->>'risk_taking')::INTEGER, 50) - COALESCE((traits2->>'risk_taking')::INTEGER, 50));
  collaborative_diff := ABS(COALESCE((traits1->>'collaborative')::INTEGER, 50) - COALESCE((traits2->>'collaborative')::INTEGER, 50));
  
  total_diff := (analytical_diff + creative_diff + emotional_diff + logical_diff + risk_taking_diff + collaborative_diff) / 6;
  RETURN 100 - total_diff;
END;
$function$;

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;