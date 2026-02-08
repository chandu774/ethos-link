-- Ensure communities + community_members exist with latest schema and policies

DO $$
BEGIN
  IF to_regclass('public.communities') IS NULL THEN
    CREATE TABLE public.communities (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text,
      icon text,
      color text,
      avatar_url text,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      is_user_created boolean NOT NULL DEFAULT false,
      approval_status text NOT NULL DEFAULT 'approved',
      category text
    );
  END IF;

  -- Ensure columns exist (for older schema)
  ALTER TABLE public.communities
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_user_created boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS category text;

  ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

  -- Ensure admin flag exists for policy checks
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_communities_updated_at'
      AND tgrelid = 'public.communities'::regclass
  ) THEN
    CREATE TRIGGER update_communities_updated_at
    BEFORE UPDATE ON public.communities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Policies
  DROP POLICY IF EXISTS "Users can view communities" ON public.communities;
  DROP POLICY IF EXISTS "Public can view communities" ON public.communities;
  DROP POLICY IF EXISTS "Approved communities are public" ON public.communities;
  DROP POLICY IF EXISTS "Creators can view their communities" ON public.communities;
  DROP POLICY IF EXISTS "Admins can view all communities" ON public.communities;
  DROP POLICY IF EXISTS "Users can request communities" ON public.communities;
  DROP POLICY IF EXISTS "Admins can update communities" ON public.communities;
  DROP POLICY IF EXISTS "Authenticated users can update communities" ON public.communities;

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
END $$;

DO $$
BEGIN
  IF to_regclass('public.community_members') IS NULL THEN
    CREATE TABLE public.community_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      community_id text NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      joined_at timestamp with time zone NOT NULL DEFAULT now(),
      role text NOT NULL DEFAULT 'member'
    );
  END IF;

  ALTER TABLE public.community_members
    ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

  ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Public can view community members" ON public.community_members;
  DROP POLICY IF EXISTS "Authenticated users can join communities" ON public.community_members;
  DROP POLICY IF EXISTS "Authenticated users can leave communities" ON public.community_members;
  DROP POLICY IF EXISTS "Users can join approved communities" ON public.community_members;
  DROP POLICY IF EXISTS "Admins can manage community members" ON public.community_members;
  DROP POLICY IF EXISTS "Admins can update community members" ON public.community_members;

  CREATE POLICY "Public can view community members"
  ON public.community_members FOR SELECT
  TO anon, authenticated
  USING (true);

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

  CREATE POLICY "Authenticated users can leave communities"
  ON public.community_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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
END $$;
