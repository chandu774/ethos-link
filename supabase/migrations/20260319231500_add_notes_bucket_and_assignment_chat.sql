-- Notes Hub bucket alignment + Assignment discussion chat

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  file_url text NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_group_created_at_idx ON public.notes (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assignment_messages_assignment_created_idx ON public.assignment_messages (assignment_id, created_at DESC);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can read notes" ON public.notes;
DROP POLICY IF EXISTS "Group members can insert notes" ON public.notes;
DROP POLICY IF EXISTS "Owners can update notes" ON public.notes;
DROP POLICY IF EXISTS "Owners can delete notes" ON public.notes;

CREATE POLICY "Group members can read notes"
ON public.notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = notes.group_id
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can insert notes"
ON public.notes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = notes.group_id
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update notes"
ON public.notes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete notes"
ON public.notes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group members can read assignment messages" ON public.assignment_messages;
DROP POLICY IF EXISTS "Group members can insert assignment messages" ON public.assignment_messages;

CREATE POLICY "Group members can read assignment messages"
ON public.assignment_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.group_members gm ON gm.group_id = a.group_id
    WHERE a.id = assignment_messages.assignment_id
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can insert assignment messages"
ON public.assignment_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.assignments a
    JOIN public.group_members gm ON gm.group_id = a.group_id
    WHERE a.id = assignment_messages.assignment_id
      AND gm.user_id = auth.uid()
  )
);

ALTER TABLE public.assignment_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'assignment_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_messages;
  END IF;
END
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Notes bucket upload for group members" ON storage.objects;
DROP POLICY IF EXISTS "Notes bucket read for group members" ON storage.objects;
DROP POLICY IF EXISTS "Notes bucket delete for uploader" ON storage.objects;

CREATE POLICY "Notes bucket upload for group members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes'
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id::text = (storage.foldername(name))[1]
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Notes bucket read for group members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes'
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id::text = (storage.foldername(name))[1]
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Notes bucket delete for uploader"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notes'
  AND owner = auth.uid()
);
