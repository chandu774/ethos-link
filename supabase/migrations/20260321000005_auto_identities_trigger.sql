-- Migration: Ensure all created auth users automatically receive an auth.identities record
-- Fixes Supabase GoTrue 500 error on token generation

CREATE OR REPLACE FUNCTION public.ensure_user_identity()
RETURNS trigger AS $$
BEGIN
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.id::text,
    jsonb_build_object('sub', NEW.id::text, 'email', NEW.email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_user_identity ON auth.users;
CREATE TRIGGER trg_ensure_user_identity
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_identity();
