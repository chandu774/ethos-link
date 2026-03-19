-- Student collaboration platform schema extensions

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_code text;

UPDATE public.groups
SET invite_code = COALESCE(invite_code, upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10)));

ALTER TABLE public.groups
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS groups_invite_code_key ON public.groups (invite_code);
CREATE INDEX IF NOT EXISTS groups_created_by_idx ON public.groups (creator_id);
CREATE INDEX IF NOT EXISTS groups_is_private_idx ON public.groups (is_private);

ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.group_members
  DROP CONSTRAINT IF EXISTS group_members_role_check;

ALTER TABLE public.group_members
  ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('admin', 'moderator', 'member'));

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deadline timestamp with time zone NOT NULL,
  attachment_url text,
  attachment_name text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url text,
  file_name text,
  status text NOT NULL DEFAULT 'pending',
  comment text,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id),
  CONSTRAINT submissions_status_check CHECK (status IN ('pending', 'submitted'))
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'todo',
  deadline timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'completed'))
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignments_group_deadline_idx ON public.assignments (group_id, deadline DESC);
CREATE INDEX IF NOT EXISTS submissions_assignment_idx ON public.submissions (assignment_id, status);
CREATE INDEX IF NOT EXISTS submissions_user_idx ON public.submissions (user_id, status);
CREATE INDEX IF NOT EXISTS tasks_group_deadline_idx ON public.tasks (group_id, deadline DESC);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to, status);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS group_messages_group_created_idx ON public.group_messages (group_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assignments_set_updated_at ON public.assignments;
CREATE TRIGGER assignments_set_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS submissions_set_updated_at ON public.submissions;
CREATE TRIGGER submissions_set_updated_at
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE group_id = gid
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.group_member_role(gid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.group_members
  WHERE group_id = gid
    AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.join_group_with_invite(target_invite_code text)
RETURNS public.group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_group public.groups;
  membership public.group_members;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO target_group
  FROM public.groups
  WHERE invite_code = upper(target_invite_code);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite code not found';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (target_group.id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;

  SELECT * INTO membership
  FROM public.group_members
  WHERE group_id = target_group.id
    AND user_id = auth.uid();

  RETURN membership;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification_for_group_members(
  target_group_id uuid,
  actor_user_id uuid,
  notification_type text,
  notification_content text,
  meta jsonb DEFAULT '{}'::jsonb,
  linked_assignment_id uuid DEFAULT NULL,
  linked_task_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (
    user_id,
    group_id,
    assignment_id,
    task_id,
    type,
    content,
    metadata
  )
  SELECT
    gm.user_id,
    target_group_id,
    linked_assignment_id,
    linked_task_id,
    notification_type,
    notification_content,
    meta
  FROM public.group_members gm
  WHERE gm.group_id = target_group_id
    AND gm.user_id <> actor_user_id;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_group_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification_for_group_members(
    NEW.group_id,
    NEW.sender_id,
    'new_message',
    CASE
      WHEN NEW.type = 'file' THEN 'New file shared in group'
      ELSE 'New message in group chat'
    END,
    jsonb_build_object('message_id', NEW.id, 'type', NEW.type)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification_for_group_members(
    NEW.group_id,
    NEW.created_by,
    'new_assignment',
    'New assignment: ' || NEW.title,
    jsonb_build_object('deadline', NEW.deadline),
    NEW.id,
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (
      user_id,
      group_id,
      task_id,
      type,
      content,
      metadata
    ) VALUES (
      NEW.assigned_to,
      NEW.group_id,
      NEW.id,
      'task_assigned',
      'New task assigned: ' || NEW.title,
      jsonb_build_object('deadline', NEW.deadline, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS group_messages_notify_members ON public.group_messages;
CREATE TRIGGER group_messages_notify_members
AFTER INSERT ON public.group_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_group_message();

DROP TRIGGER IF EXISTS assignments_notify_members ON public.assignments;
CREATE TRIGGER assignments_notify_members
AFTER INSERT ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_assignment_created();

DROP TRIGGER IF EXISTS tasks_notify_assignee ON public.tasks;
CREATE TRIGGER tasks_notify_assignee
AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_task_assigned();

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('assignment-files', 'assignment-files', false),
  ('submission-files', 'submission-files', false),
  ('shared-files', 'shared-files', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Members can read group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can insert group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can update own group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can delete own group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can read assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins and moderators can create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins and moderators can update assignments" ON public.assignments;
DROP POLICY IF EXISTS "Group members can read submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Group members can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and moderators can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins moderators and assignees can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Authenticated users can view groups"
ON public.groups FOR SELECT
TO authenticated
USING (
  is_private = false
  OR public.is_group_member(id)
  OR creator_id = auth.uid()
);

CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Group admins can update groups"
ON public.groups FOR UPDATE
TO authenticated
USING (
  creator_id = auth.uid()
  OR public.group_member_role(id) IN ('admin', 'moderator')
)
WITH CHECK (
  creator_id = auth.uid()
  OR public.group_member_role(id) IN ('admin', 'moderator')
);

CREATE POLICY "Members can view group memberships"
ON public.group_members FOR SELECT
TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY "Users can insert own memberships through approved flows"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.group_member_role(group_id) IN ('admin', 'moderator')
);

CREATE POLICY "Admins can manage group memberships"
ON public.group_members FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.group_member_role(group_id) IN ('admin', 'moderator')
);

CREATE POLICY "Members can read group messages"
ON public.group_messages FOR SELECT
TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY "Members can send group messages"
ON public.group_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_group_member(group_id)
);

CREATE POLICY "Members can read assignments"
ON public.assignments FOR SELECT
TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY "Admins and moderators can create assignments"
ON public.assignments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.group_member_role(group_id) IN ('admin', 'moderator')
);

CREATE POLICY "Admins and moderators can update assignments"
ON public.assignments FOR UPDATE
TO authenticated
USING (public.group_member_role(group_id) IN ('admin', 'moderator'))
WITH CHECK (public.group_member_role(group_id) IN ('admin', 'moderator'));

CREATE POLICY "Group members can read submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.id = assignment_id
      AND public.is_group_member(a.group_id)
  )
);

CREATE POLICY "Users can manage own submissions"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
ON public.submissions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group members can read tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY "Admins and moderators can create tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.group_member_role(group_id) IN ('admin', 'moderator')
);

CREATE POLICY "Admins moderators and assignees can update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  public.group_member_role(group_id) IN ('admin', 'moderator')
  OR assigned_to = auth.uid()
)
WITH CHECK (
  public.group_member_role(group_id) IN ('admin', 'moderator')
  OR assigned_to = auth.uid()
);

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Assignment files access" ON storage.objects;
DROP POLICY IF EXISTS "Submission files access" ON storage.objects;
DROP POLICY IF EXISTS "Shared files access" ON storage.objects;

CREATE POLICY "Assignment files access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'assignment-files')
WITH CHECK (bucket_id = 'assignment-files');

CREATE POLICY "Submission files access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'submission-files')
WITH CHECK (bucket_id = 'submission-files');

CREATE POLICY "Shared files access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'shared-files')
WITH CHECK (bucket_id = 'shared-files');
