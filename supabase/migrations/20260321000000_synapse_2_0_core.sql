-- Synapse 2.0 Core Migration

-- 1. Enable RLS on message_reactions if disabled
ALTER TABLE IF EXISTS "public"."message_reactions" ENABLE ROW LEVEL SECURITY;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'Anyone can view reactions'
  ) THEN
    CREATE POLICY "Anyone can view reactions" ON "public"."message_reactions" FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'Authenticated users can add reactions'
  ) THEN
    CREATE POLICY "Authenticated users can add reactions" ON "public"."message_reactions" FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'Users can delete own reactions'
  ) THEN
    CREATE POLICY "Users can delete own reactions" ON "public"."message_reactions" FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$;

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  semester TEXT,
  instructor_name TEXT,
  description TEXT,
  color TEXT DEFAULT 'from-indigo-500 to-purple-600',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public courses are viewable by authenticated users" ON public.courses FOR SELECT USING (true);

-- 3. Course Members Table
CREATE TABLE IF NOT EXISTS public.course_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
ALTER TABLE public.course_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Course members viewable by all members" ON public.course_members FOR SELECT USING (true);
CREATE POLICY "Users can join courses" ON public.course_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Lectures Table
CREATE TABLE IF NOT EXISTS public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  sign_language_url TEXT,
  transcript TEXT,
  summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectures viewable by authenticated users" ON public.lectures FOR SELECT USING (true);

-- 5. Lecture Chapters Table
CREATE TABLE IF NOT EXISTS public.lecture_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL,
  title TEXT NOT NULL,
  concept_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lecture_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chapters viewable by authenticated users" ON public.lecture_chapters FOR SELECT USING (true);

-- 6. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  topic_covered TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Quizzes & Assessments
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  source_type TEXT DEFAULT 'course',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes viewable by all authenticated" ON public.quizzes FOR SELECT USING (true);

-- 8. Quiz Questions Table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  explanation TEXT,
  concept_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quiz questions viewable by all authenticated" ON public.quiz_questions FOR SELECT USING (true);

-- 9. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  answers JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own quiz attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Concept Mastery Table
CREATE TABLE IF NOT EXISTS public.concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  concept_name TEXT NOT NULL,
  mastery_percentage INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'mastered', 'in_progress', 'gap'
  attempts_count INTEGER NOT NULL DEFAULT 0,
  last_assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id, concept_name)
);
ALTER TABLE public.concept_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own concept mastery" ON public.concept_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own concept mastery" ON public.concept_mastery FOR ALL USING (auth.uid() = user_id);

-- 11. Recommendations ("What should I do next?")
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'review', 'assignment', 'recover_lecture', 'quiz'
  priority TEXT NOT NULL DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'LOW'
  estimated_time_minutes INTEGER NOT NULL DEFAULT 20,
  reason TEXT NOT NULL,
  related_gap TEXT,
  action_url TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recommendations" ON public.recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON public.recommendations FOR UPDATE USING (auth.uid() = user_id);

-- 12. Student Interventions / Risk Monitoring
CREATE TABLE IF NOT EXISTS public.student_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL DEFAULT 'MODERATE', -- 'LOW', 'MODERATE', 'CRITICAL'
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own interventions" ON public.student_interventions FOR SELECT USING (auth.uid() = user_id);

-- 13. Accessibility Preferences Table
CREATE TABLE IF NOT EXISTS public.accessibility_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  captions_enabled BOOLEAN NOT NULL DEFAULT true,
  sign_language_enabled BOOLEAN NOT NULL DEFAULT false,
  text_to_speech_enabled BOOLEAN NOT NULL DEFAULT false,
  high_contrast BOOLEAN NOT NULL DEFAULT false,
  text_size TEXT NOT NULL DEFAULT 'normal', -- 'small', 'normal', 'large'
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accessibility_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own accessibility preferences" ON public.accessibility_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own accessibility preferences" ON public.accessibility_preferences FOR ALL USING (auth.uid() = user_id);

-- 14. Opportunities / Scholarships Table
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  type TEXT NOT NULL, -- 'scholarship', 'mentorship', 'internship', 'fellowship'
  deadline DATE,
  description TEXT NOT NULL,
  amount_or_stipend TEXT,
  requirements JSONB DEFAULT '[]'::jsonb,
  match_criteria JSONB DEFAULT '{}'::jsonb,
  apply_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opportunities viewable by all authenticated" ON public.opportunities FOR SELECT USING (true);
