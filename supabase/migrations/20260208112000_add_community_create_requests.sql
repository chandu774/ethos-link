-- Community creation requests flow

CREATE TABLE IF NOT EXISTS public.community_create_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_name text NOT NULL,
  description text,
  category text,
  avatar_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_create_requests ENABLE ROW LEVEL SECURITY;

-- Constraints
CREATE UNIQUE INDEX IF NOT EXISTS community_create_requests_pending_per_user
  ON public.community_create_requests (user_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS community_create_requests_pending_name_unique
  ON public.community_create_requests (lower(community_name))
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS communities_name_unique
  ON public.communities (lower(name));

-- RLS policies
DROP POLICY IF EXISTS "Users can create community requests" ON public.community_create_requests;
DROP POLICY IF EXISTS "Users can view own community requests" ON public.community_create_requests;
DROP POLICY IF EXISTS "Admins can view community requests" ON public.community_create_requests;
DROP POLICY IF EXISTS "Admins can update community requests" ON public.community_create_requests;

CREATE POLICY "Users can create community requests"
ON public.community_create_requests FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

CREATE POLICY "Users can view own community requests"
ON public.community_create_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view community requests"
ON public.community_create_requests FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can update community requests"
ON public.community_create_requests FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
))
WITH CHECK (true);

-- Approval / rejection functions (transaction-safe)
CREATE OR REPLACE FUNCTION public.approve_community_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req record;
  base_id text;
  new_id text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO req
  FROM public.community_create_requests
  WHERE id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.communities
    WHERE lower(name) = lower(req.community_name)
  ) THEN
    RAISE EXCEPTION 'Community name already exists';
  END IF;

  base_id := regexp_replace(lower(req.community_name), '[^a-z0-9]+', '-', 'g');
  base_id := regexp_replace(base_id, '(^-|-$)', '', 'g');
  IF base_id = '' THEN
    base_id := 'community';
  END IF;
  new_id := base_id;

  IF EXISTS (SELECT 1 FROM public.communities WHERE id = new_id) THEN
    new_id := base_id || '-' || right(replace(request_id::text, '-', ''), 5);
  END IF;

  INSERT INTO public.communities (
    id,
    name,
    description,
    category,
    avatar_url,
    created_by,
    is_user_created,
    approval_status
  ) VALUES (
    new_id,
    req.community_name,
    req.description,
    req.category,
    req.avatar_url,
    req.user_id,
    true,
    'approved'
  );

  INSERT INTO public.community_members (
    community_id,
    user_id,
    role
  ) VALUES (
    new_id,
    req.user_id,
    'admin'
  );

  UPDATE public.community_create_requests
  SET status = 'approved'
  WHERE id = request_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_community_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.community_create_requests
  SET status = 'rejected'
  WHERE id = request_id
    AND status = 'pending';
END $$;

REVOKE ALL ON FUNCTION public.approve_community_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_community_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_community_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_community_request(uuid) TO authenticated;
