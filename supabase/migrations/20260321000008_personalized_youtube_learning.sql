-- Migration: Personalized YouTube Learning Recommendations & Video Engagement Tracking
-- Description: Stores cached video recommendations from YouTube Data API v3 and tracks student watch progress and practice resolution.

CREATE TABLE IF NOT EXISTS public.learning_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID,
  subject_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  concept TEXT,
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_title TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration TEXT,
  reason TEXT NOT NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('WEAK_TOPIC', 'WEAK_CONCEPT', 'MISSED_CLASS', 'PRACTICE_SUPPORT')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISMISSED', 'EXPIRED')),
  has_captions BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_quiz_id UUID,
  CONSTRAINT unique_student_topic_concept_video UNIQUE (student_id, topic, concept, video_id)
);

CREATE TABLE IF NOT EXISTS public.student_video_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.learning_recommendations(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended', 'opened', 'started', 'completed')),
  opened_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  watch_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_recommendation_engagement UNIQUE (student_id, recommendation_id)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_learning_rec_student ON public.learning_recommendations(student_id, status);
CREATE INDEX IF NOT EXISTS idx_learning_rec_topic_concept ON public.learning_recommendations(topic, concept);
CREATE INDEX IF NOT EXISTS idx_video_engagements_student ON public.student_video_engagements(student_id, status);

-- Enable RLS
ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_video_engagements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_recommendations
DROP POLICY IF EXISTS "Students can view own recommendations" ON public.learning_recommendations;
CREATE POLICY "Students can view own recommendations"
  ON public.learning_recommendations
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'administrator' OR profiles.is_admin = true)
    ) OR
    EXISTS (
      -- Authorized faculty can view recommendations for enrolled students in their teaching cohorts
      SELECT 1 FROM public.teaching_assignments ta
      JOIN public.classroom_members cm ON cm.classroom_id = ta.classroom_id
      WHERE ta.faculty_id = auth.uid() AND cm.student_id = learning_recommendations.student_id
    )
  );

DROP POLICY IF EXISTS "Students can update status of own recommendations" ON public.learning_recommendations;
CREATE POLICY "Students can update status of own recommendations"
  ON public.learning_recommendations
  FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Service and authenticated users can insert recommendations" ON public.learning_recommendations;
CREATE POLICY "Service and authenticated users can insert recommendations"
  ON public.learning_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'administrator' OR is_admin = true)
  ));

-- RLS Policies for student_video_engagements
DROP POLICY IF EXISTS "Students can manage own video engagements" ON public.student_video_engagements;
CREATE POLICY "Students can manage own video engagements"
  ON public.student_video_engagements
  FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Faculty and admin can view video engagements" ON public.student_video_engagements;
CREATE POLICY "Faculty and admin can view video engagements"
  ON public.student_video_engagements
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'administrator' OR profiles.is_admin = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.teaching_assignments ta
      JOIN public.classroom_members cm ON cm.classroom_id = ta.classroom_id
      WHERE ta.faculty_id = auth.uid() AND cm.student_id = student_video_engagements.student_id
    )
  );
