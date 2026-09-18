-- Add Classroom & Announcement enhancements to courses
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS class_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2026-27',
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_courses_class_code ON public.courses(class_code);

CREATE TABLE IF NOT EXISTS public.classroom_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'announcement',
  has_extracted_task BOOLEAN DEFAULT false,
  extracted_action_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late', 'resubmitted')),
  marks_obtained NUMERIC(5,2),
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, user_id)
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
