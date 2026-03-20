-- Make task visibility private to the creator.
-- Each user can only read and update tasks they created.

DROP POLICY IF EXISTS "Group members can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and moderators can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins moderators and assignees can update tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can read own created tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create own tasks in their groups" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own created tasks" ON public.tasks;

CREATE POLICY "Users can read own created tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can create own tasks in their groups"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.is_group_member(group_id)
);

CREATE POLICY "Users can update own created tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
