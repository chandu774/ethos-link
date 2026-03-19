-- Notes Hub: notes + likes + storage + RLS

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  subject text NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notes_likes_count_non_negative CHECK (likes_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.note_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(note_id, user_id)
);

CREATE INDEX IF NOT EXISTS notes_group_created_idx ON public.notes (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notes_subject_idx ON public.notes (subject);
CREATE INDEX IF NOT EXISTS notes_likes_count_idx ON public.notes (likes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS note_likes_note_idx ON public.note_likes (note_id);
CREATE INDEX IF NOT EXISTS note_likes_user_idx ON public.note_likes (user_id);

CREATE OR REPLACE FUNCTION public.sync_note_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.notes
    SET likes_count = likes_count + 1
    WHERE id = NEW.note_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.notes
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.note_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS note_likes_count_insert ON public.note_likes;
CREATE TRIGGER note_likes_count_insert
AFTER INSERT ON public.note_likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_note_likes_count();

DROP TRIGGER IF EXISTS note_likes_count_delete ON public.note_likes;
CREATE TRIGGER note_likes_count_delete
AFTER DELETE ON public.note_likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_note_likes_count();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view notes" ON public.notes;
DROP POLICY IF EXISTS "Members can upload notes" ON public.notes;
DROP POLICY IF EXISTS "Owners can update notes" ON public.notes;
DROP POLICY IF EXISTS "Owners can delete notes" ON public.notes;
DROP POLICY IF EXISTS "Members can view note likes" ON public.note_likes;
DROP POLICY IF EXISTS "Members can like notes" ON public.note_likes;
DROP POLICY IF EXISTS "Users can unlike own notes" ON public.note_likes;

CREATE POLICY "Members can view notes"
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

CREATE POLICY "Members can upload notes"
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

CREATE POLICY "Members can view note likes"
ON public.note_likes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.notes n
    JOIN public.group_members gm ON gm.group_id = n.group_id
    WHERE n.id = note_likes.note_id
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can like notes"
ON public.note_likes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.notes n
    JOIN public.group_members gm ON gm.group_id = n.group_id
    WHERE n.id = note_likes.note_id
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can unlike own notes"
ON public.note_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('notes-files', 'notes-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Notes files upload by group members" ON storage.objects;
DROP POLICY IF EXISTS "Notes files read by group members" ON storage.objects;
DROP POLICY IF EXISTS "Notes files delete by uploader" ON storage.objects;

CREATE POLICY "Notes files upload by group members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes-files'
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id::text = (storage.foldername(name))[1]
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Notes files read by group members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes-files'
  AND EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id::text = (storage.foldername(name))[1]
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Notes files delete by uploader"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notes-files'
  AND owner = auth.uid()
);
