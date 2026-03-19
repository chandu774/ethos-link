-- Ensure groups.invite_code is always generated server-side.

ALTER TABLE public.groups
  ALTER COLUMN invite_code SET DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

UPDATE public.groups
SET invite_code = upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10))
WHERE invite_code IS NULL OR btrim(invite_code) = '';

CREATE OR REPLACE FUNCTION public.ensure_group_invite_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR btrim(NEW.invite_code) = '' THEN
    NEW.invite_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));
  ELSE
    NEW.invite_code := upper(NEW.invite_code);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS groups_ensure_invite_code ON public.groups;
CREATE TRIGGER groups_ensure_invite_code
BEFORE INSERT OR UPDATE OF invite_code ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.ensure_group_invite_code();
