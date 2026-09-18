-- Phase 1 Migration: Safe Demo Account Cleanup and Schema Verification
-- Preserves the administrator account and all schema structures.

-- 1. Identify all non-administrator profile IDs to safely delete their dependent records
DO $$
DECLARE
  v_non_admin_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO v_non_admin_ids
  FROM public.profiles
  WHERE role IS DISTINCT FROM 'administrator';

  IF v_non_admin_ids IS NOT NULL AND array_length(v_non_admin_ids, 1) > 0 THEN
    -- Delete child records belonging to non-admin accounts in safe dependency order
    DELETE FROM public.assignment_submissions WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.submissions WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.assignment_messages WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.group_message_reactions WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.group_messages WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.group_members WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.tasks WHERE created_by = ANY(v_non_admin_ids) OR assigned_to = ANY(v_non_admin_ids);
    DELETE FROM public.attendance WHERE student_id = ANY(v_non_admin_ids);
    DELETE FROM public.quiz_attempts WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.concept_mastery WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.recommendations WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.student_interventions WHERE student_id = ANY(v_non_admin_ids) OR faculty_id = ANY(v_non_admin_ids);
    DELETE FROM public.course_members WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.notes WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.note_likes WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.connections WHERE requester_id = ANY(v_non_admin_ids) OR receiver_id = ANY(v_non_admin_ids);
    DELETE FROM public.notifications WHERE user_id = ANY(v_non_admin_ids);
    DELETE FROM public.accessibility_preferences WHERE user_id = ANY(v_non_admin_ids);

    -- Delete courses created by non-admin faculty
    DELETE FROM public.courses WHERE teacher_id = ANY(v_non_admin_ids);

    -- Delete public.profiles for non-administrators
    DELETE FROM public.profiles WHERE id = ANY(v_non_admin_ids);

    -- Delete from auth.users for non-administrators
    DELETE FROM auth.users WHERE id = ANY(v_non_admin_ids);
  END IF;
END $$;

-- 2. Verify and enhance public.courses table for real classroom creation
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT;

-- 3. Ensure proper RLS policies on public.courses for faculty ownership
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Anyone can view courses" ON public.courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Faculty can create courses" ON public.courses;
CREATE POLICY "Faculty can create courses" ON public.courses
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'administrator'))
  );

DROP POLICY IF EXISTS "Faculty can update their courses" ON public.courses;
CREATE POLICY "Faculty can update their courses" ON public.courses
  FOR UPDATE USING (
    auth.uid() = teacher_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator')
  );

DROP POLICY IF EXISTS "Faculty can delete their courses" ON public.courses;
CREATE POLICY "Faculty can delete their courses" ON public.courses
  FOR DELETE USING (
    auth.uid() = teacher_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator')
  );

-- 4. Ensure public.course_members RLS for enrollment
ALTER TABLE public.course_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course members readable by enrolled or faculty" ON public.course_members;
CREATE POLICY "Course members readable by enrolled or faculty" ON public.course_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Faculty and admin can insert course members" ON public.course_members;
CREATE POLICY "Faculty and admin can insert course members" ON public.course_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'administrator'))
  );
