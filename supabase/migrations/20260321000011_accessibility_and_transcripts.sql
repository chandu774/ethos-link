-- 20260321000011_accessibility_and_transcripts.sql
-- Accessibility Preferences enhancements and On-Demand Lecture Transcripts

-- 1. Enhance accessibility_preferences table
ALTER TABLE public.accessibility_preferences
  ADD COLUMN IF NOT EXISTS voice_assistance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transcript_assistance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS speech_rate numeric NOT NULL DEFAULT 1.0;

-- Ensure RLS on accessibility_preferences
ALTER TABLE public.accessibility_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accessibility preferences" ON public.accessibility_preferences;
CREATE POLICY "Users can view own accessibility preferences"
  ON public.accessibility_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accessibility preferences" ON public.accessibility_preferences;
CREATE POLICY "Users can insert own accessibility preferences"
  ON public.accessibility_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accessibility preferences" ON public.accessibility_preferences;
CREATE POLICY "Users can update own accessibility preferences"
  ON public.accessibility_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full access to accessibility preferences" ON public.accessibility_preferences;
CREATE POLICY "Admin full access to accessibility preferences"
  ON public.accessibility_preferences FOR ALL
  TO authenticated
  USING (is_administrator())
  WITH CHECK (is_administrator());

-- 2. Create lecture_transcripts table
CREATE TABLE IF NOT EXISTS public.lecture_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  transcript_text text NOT NULL,
  transcript_segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  key_concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  language text NOT NULL DEFAULT 'en',
  source text NOT NULL DEFAULT 'on_demand',
  status text NOT NULL DEFAULT 'READY' CHECK (status IN ('NOT_GENERATED', 'GENERATING', 'READY', 'FAILED')),
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_lecture_transcripts_lecture UNIQUE (lecture_id)
);

CREATE INDEX IF NOT EXISTS idx_lecture_transcripts_lecture ON public.lecture_transcripts(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_transcripts_status ON public.lecture_transcripts(status);

-- 3. Row Level Security for lecture_transcripts
ALTER TABLE public.lecture_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Classroom students and faculty view lecture transcripts" ON public.lecture_transcripts;
CREATE POLICY "Classroom students and faculty view lecture transcripts"
  ON public.lecture_transcripts FOR SELECT
  TO authenticated
  USING (
    is_administrator()
    OR EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = lecture_transcripts.lecture_id
      AND (
        l.classroom_id IN (SELECT classroom_id FROM public.classroom_members WHERE student_id = auth.uid())
        OR l.faculty_id = auth.uid()
        OR l.classroom_id IN (SELECT classroom_id FROM public.teaching_assignments WHERE faculty_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Classroom members can create or update lecture transcripts" ON public.lecture_transcripts;
CREATE POLICY "Classroom members can create or update lecture transcripts"
  ON public.lecture_transcripts FOR ALL
  TO authenticated
  USING (
    is_administrator()
    OR EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = lecture_transcripts.lecture_id
      AND (
        l.classroom_id IN (SELECT classroom_id FROM public.classroom_members WHERE student_id = auth.uid())
        OR l.faculty_id = auth.uid()
        OR l.classroom_id IN (SELECT classroom_id FROM public.teaching_assignments WHERE faculty_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    is_administrator()
    OR EXISTS (
      SELECT 1 FROM public.lectures l
      WHERE l.id = lecture_transcripts.lecture_id
      AND (
        l.classroom_id IN (SELECT classroom_id FROM public.classroom_members WHERE student_id = auth.uid())
        OR l.faculty_id = auth.uid()
        OR l.classroom_id IN (SELECT classroom_id FROM public.teaching_assignments WHERE faculty_id = auth.uid())
      )
    )
  );
