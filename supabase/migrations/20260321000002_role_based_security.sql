-- Add role column to profiles if not exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty'));

-- Set faculty role for demo/instructor accounts
UPDATE public.profiles 
  SET role = 'faculty' 
  WHERE email LIKE '%thorne%' OR email LIKE '%faculty%' OR is_admin = true;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS: Only faculty can create or modify official assignments
DROP POLICY IF EXISTS "Faculty can manage course assignments" ON public.assignments;
CREATE POLICY "Faculty can manage course assignments"
  ON public.assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'faculty'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'faculty'
    )
  );

-- Students can read assignments
DROP POLICY IF EXISTS "Students can view assignments" ON public.assignments;
CREATE POLICY "Students can view assignments"
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Assignment submissions:
-- Students can insert and view their own submissions
DROP POLICY IF EXISTS "Students manage own submissions" ON public.assignment_submissions;
CREATE POLICY "Students manage own submissions"
  ON public.assignment_submissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Faculty can view and grade all submissions for assignments
DROP POLICY IF EXISTS "Faculty view and grade submissions" ON public.assignment_submissions;
CREATE POLICY "Faculty view and grade submissions"
  ON public.assignment_submissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'faculty'
    )
  );

-- Announcements: only faculty can create/update announcements
DROP POLICY IF EXISTS "Faculty manage announcements" ON public.classroom_announcements;
CREATE POLICY "Faculty manage announcements"
  ON public.classroom_announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'faculty'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'faculty'
    )
  );

DROP POLICY IF EXISTS "Students read announcements" ON public.classroom_announcements;
CREATE POLICY "Students read announcements"
  ON public.classroom_announcements
  FOR SELECT
  TO authenticated
  USING (true);
