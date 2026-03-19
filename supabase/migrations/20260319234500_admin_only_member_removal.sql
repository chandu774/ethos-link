-- Restrict member removals to admins while still allowing users to leave groups.

DROP POLICY IF EXISTS "Admins can manage group memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Users can leave groups"
ON public.group_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage group memberships"
ON public.group_members FOR DELETE
TO authenticated
USING (public.group_member_role(group_id) = 'admin');
