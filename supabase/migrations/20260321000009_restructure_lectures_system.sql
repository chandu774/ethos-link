-- Migration: Restructure Lectures System for YouTube Video Integration
-- Removes legacy video file upload dependencies and ties lectures strictly to Teaching Assignments

-- 1. Drop legacy lecture_chapters table if exists (empty table)
DROP TABLE IF EXISTS public.lecture_chapters CASCADE;

-- 2. Drop legacy foreign key constraint from attendance if any
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_lecture_id_fkey' AND table_name = 'attendance'
  ) THEN
    ALTER TABLE public.attendance DROP CONSTRAINT attendance_lecture_id_fkey;
  END IF;
END $$;

-- 3. Drop existing lectures table and recreate with clean schema
DROP TABLE IF EXISTS public.lectures CASCADE;

CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teaching_assignment_id UUID NOT NULL REFERENCES public.teaching_assignments(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  channel_name TEXT,
  duration TEXT DEFAULT '15:00',
  has_captions BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'ARCHIVED')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reconnect attendance foreign key if attendance table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'lecture_id') THEN
    ALTER TABLE public.attendance 
      ADD CONSTRAINT attendance_lecture_id_fkey 
      FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_lectures_teaching_assignment ON public.lectures(teaching_assignment_id);
CREATE INDEX IF NOT EXISTS idx_lectures_faculty ON public.lectures(faculty_id);
CREATE INDEX IF NOT EXISTS idx_lectures_classroom_status ON public.lectures(classroom_id, status);
CREATE INDEX IF NOT EXISTS idx_lectures_subject_topic ON public.lectures(subject_name, topic);

-- 5. Enable Row Level Security
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Policy A: SELECT
-- Administrators can view all lectures.
-- Faculty can view lectures belonging to their teaching assignments or posted by them.
-- Students can view PUBLISHED lectures belonging to their enrolled classroom.
CREATE POLICY "Lectures select policy" ON public.lectures
  FOR SELECT
  USING (
    -- Admin
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
    OR
    -- Faculty: own teaching assignment or own post
    (
      faculty_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.teaching_assignments ta 
        WHERE ta.id = lectures.teaching_assignment_id AND ta.faculty_id = auth.uid()
      )
    )
    OR
    -- Student: published lectures for classrooms student belongs to
    (
      status = 'PUBLISHED'
      AND
      EXISTS (
        SELECT 1 FROM public.classroom_members cm 
        WHERE cm.classroom_id = lectures.classroom_id AND cm.student_id = auth.uid()
      )
    )
  );

-- Policy B: INSERT
-- Faculty can ONLY insert for their own authorized teaching assignments.
-- Administrators can insert.
CREATE POLICY "Lectures insert policy" ON public.lectures
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
    OR
    (
      faculty_id = auth.uid()
      AND
      EXISTS (
        SELECT 1 FROM public.teaching_assignments ta 
        WHERE ta.id = teaching_assignment_id AND ta.faculty_id = auth.uid()
      )
    )
  );

-- Policy C: UPDATE
-- Faculty can ONLY update their own lectures.
-- Administrators can update.
CREATE POLICY "Lectures update policy" ON public.lectures
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
    OR
    (
      faculty_id = auth.uid()
      AND
      EXISTS (
        SELECT 1 FROM public.teaching_assignments ta 
        WHERE ta.id = lectures.teaching_assignment_id AND ta.faculty_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
    OR
    (
      faculty_id = auth.uid()
      AND
      EXISTS (
        SELECT 1 FROM public.teaching_assignments ta 
        WHERE ta.id = teaching_assignment_id AND ta.faculty_id = auth.uid()
      )
    )
  );

-- Policy D: DELETE
-- Faculty can ONLY delete their own lectures.
-- Administrators can delete.
CREATE POLICY "Lectures delete policy" ON public.lectures
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
    OR
    faculty_id = auth.uid()
  );
