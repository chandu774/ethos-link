-- Restructure Notes System: Automatic Classroom Assignment & Scoping
-- Migration: 20260321000010_restructure_notes_system.sql

-- 1. Alter public.notes table to link to classrooms
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE;

-- Allow group_id to be nullable so notes belong to classrooms
ALTER TABLE public.notes 
  ALTER COLUMN group_id DROP NOT NULL;

-- Create indexes for high performance querying
CREATE INDEX IF NOT EXISTS notes_classroom_created_idx ON public.notes (classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notes_classroom_subject_idx ON public.notes (classroom_id, subject);

-- 2. Server-Side Enforcement Trigger:
-- Automatically determines and assigns classroom_id from student's active classroom_members record.
-- Overwrites or rejects any unauthorized client-sent classroom_id.
CREATE OR REPLACE FUNCTION public.assign_note_classroom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classroom_id uuid;
  v_user_role text;
BEGIN
  -- Always bind uploader to the authenticated user ID
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Determine user role
  SELECT role INTO v_user_role FROM public.profiles WHERE id = NEW.user_id;

  -- If user is a student (or role not yet set, check classroom_members):
  IF v_user_role = 'student' OR v_user_role IS NULL THEN
    SELECT classroom_id INTO v_classroom_id
    FROM public.classroom_members
    WHERE student_id = NEW.user_id
    LIMIT 1;

    IF v_classroom_id IS NULL THEN
      RAISE EXCEPTION 'Student has no active classroom membership. Cannot upload note.';
    END IF;

    -- Strict server-side override: Ensure note is assigned to student's genuine classroom
    NEW.classroom_id := v_classroom_id;

  ELSIF v_user_role = 'faculty' THEN
    IF NEW.classroom_id IS NULL THEN
      -- Default to first teaching assignment classroom if not provided
      SELECT classroom_id INTO v_classroom_id
      FROM public.teaching_assignments
      WHERE faculty_id = NEW.user_id
      LIMIT 1;

      IF v_classroom_id IS NULL THEN
        RAISE EXCEPTION 'Faculty is not assigned to any classroom.';
      END IF;
      NEW.classroom_id := v_classroom_id;
    ELSE
      -- Verify faculty actually teaches in this classroom
      IF NOT EXISTS (
        SELECT 1 FROM public.teaching_assignments
        WHERE faculty_id = NEW.user_id AND classroom_id = NEW.classroom_id
      ) THEN
        RAISE EXCEPTION 'Faculty is not authorized to post notes to this classroom.';
      END IF;
    END IF;

  ELSIF v_user_role = 'admin' THEN
    IF NEW.classroom_id IS NULL THEN
      RAISE EXCEPTION 'classroom_id must be provided for note.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_assign_classroom_trigger ON public.notes;
CREATE TRIGGER notes_assign_classroom_trigger
BEFORE INSERT ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.assign_note_classroom();

-- 3. Row Level Security Policies for public.notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can read notes" ON public.notes;
DROP POLICY IF EXISTS "Group members can insert notes" ON public.notes;
DROP POLICY IF EXISTS "Members can view notes" ON public.notes;
DROP POLICY IF EXISTS "Members can upload notes" ON public.notes;
DROP POLICY IF EXISTS "Owners can update notes" ON public.notes;
DROP POLICY IF EXISTS "Owners can delete notes" ON public.notes;
DROP POLICY IF EXISTS "Notes classroom view" ON public.notes;
DROP POLICY IF EXISTS "Notes classroom insert" ON public.notes;
DROP POLICY IF EXISTS "Notes classroom update" ON public.notes;
DROP POLICY IF EXISTS "Notes classroom delete" ON public.notes;

CREATE POLICY "Notes classroom view"
ON public.notes FOR SELECT
TO authenticated
USING (
  (classroom_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.classroom_members cm WHERE cm.classroom_id = notes.classroom_id AND cm.student_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teaching_assignments ta WHERE ta.classroom_id = notes.classroom_id AND ta.faculty_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ))
  OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid()))
);

CREATE POLICY "Notes classroom insert"
ON public.notes FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    (classroom_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.classroom_members cm WHERE cm.classroom_id = notes.classroom_id AND cm.student_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.teaching_assignments ta WHERE ta.classroom_id = notes.classroom_id AND ta.faculty_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ))
    OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = notes.group_id AND gm.user_id = auth.uid()))
  )
);

CREATE POLICY "Notes classroom update"
ON public.notes FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Notes classroom delete"
ON public.notes FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR (classroom_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.teaching_assignments ta 
    WHERE ta.classroom_id = notes.classroom_id AND ta.faculty_id = auth.uid()
  ))
);

-- 4. Storage Policies for 'notes' bucket
DROP POLICY IF EXISTS "Notes bucket upload for group members" ON storage.objects;
DROP POLICY IF EXISTS "Notes bucket read for group members" ON storage.objects;
DROP POLICY IF EXISTS "Notes bucket delete for uploader" ON storage.objects;
DROP POLICY IF EXISTS "Notes bucket classroom upload" ON storage.objects;
DROP POLICY IF EXISTS "Notes bucket classroom read" ON storage.objects;
DROP POLICY IF EXISTS "Notes bucket classroom delete" ON storage.objects;

CREATE POLICY "Notes bucket classroom upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes'
  AND (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm 
      WHERE (cm.classroom_id)::text = (storage.foldername(name))[1] 
        AND cm.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.teaching_assignments ta 
      WHERE (ta.classroom_id)::text = (storage.foldername(name))[1] 
        AND ta.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE (gm.group_id)::text = (storage.foldername(name))[1] 
        AND gm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Notes bucket classroom read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes'
  AND (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm 
      WHERE (cm.classroom_id)::text = (storage.foldername(name))[1] 
        AND cm.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.teaching_assignments ta 
      WHERE (ta.classroom_id)::text = (storage.foldername(name))[1] 
        AND ta.faculty_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE (gm.group_id)::text = (storage.foldername(name))[1] 
        AND gm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Notes bucket classroom delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notes'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.teaching_assignments ta 
      WHERE (ta.classroom_id)::text = (storage.foldername(name))[1] 
        AND ta.faculty_id = auth.uid()
    )
  )
);

-- 5. Classroom Notifications on Note Creation
CREATE OR REPLACE FUNCTION public.notify_on_note_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.classroom_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      content,
      metadata
    )
    SELECT
      cm.student_id,
      'new_note',
      'New note shared in your classroom: ' || NEW.title,
      jsonb_build_object('subject', NEW.subject, 'note_id', NEW.id, 'classroom_id', NEW.classroom_id)
    FROM public.classroom_members cm
    WHERE cm.classroom_id = NEW.classroom_id
      AND cm.student_id <> NEW.user_id;
  ELSIF NEW.group_id IS NOT NULL THEN
    PERFORM public.create_notification_for_group_members(
      NEW.group_id,
      NEW.user_id,
      'new_note',
      'New note uploaded: ' || NEW.title,
      jsonb_build_object('subject', NEW.subject, 'note_id', NEW.id),
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_notify_members ON public.notes;
CREATE TRIGGER notes_notify_members
AFTER INSERT ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_note_created();
