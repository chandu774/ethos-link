-- Verify reaction constraints and policies

-- Constraints (unique per message + user)
SELECT
  c.conname AS constraint_name,
  c.conrelid::regclass AS table_name,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid IN ('public.message_reactions'::regclass, 'public.group_message_reactions'::regclass)
  AND c.contype = 'u'
ORDER BY table_name, constraint_name;

-- Policies (insert/update/delete)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('message_reactions', 'group_message_reactions')
ORDER BY tablename, cmd, policyname;
