-- Allow assignment deletion for admins and moderators

DROP POLICY IF EXISTS "Admins and moderators can delete assignments" ON public.assignments;

CREATE POLICY "Admins and moderators can delete assignments"
ON public.assignments FOR DELETE
TO authenticated
USING (public.group_member_role(group_id) IN ('admin', 'moderator'));
