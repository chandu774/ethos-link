-- 20260321000006_quiz_system_rebuild.sql
-- Rebuild Quiz Generation and Performance/Analysis Schema

-- 1. Enhance quiz_attempts table
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS percentage integer DEFAULT 0;

-- 2. Create quiz_attempt_answers table
CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option integer,
  correct_option integer,
  is_correct boolean NOT NULL DEFAULT false,
  marks_awarded integer NOT NULL DEFAULT 0,
  subject text,
  topic text,
  concept text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt ON public.quiz_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_student ON public.quiz_attempt_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_quiz ON public.quiz_attempt_answers(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_concept ON public.quiz_attempt_answers(concept);

-- 3. Create student_concept_history table
CREATE TABLE IF NOT EXISTS public.student_concept_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  subject text,
  topic text,
  concept text NOT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  accuracy integer NOT NULL DEFAULT 0,
  assessed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_history_student ON public.student_concept_history(student_id);
CREATE INDEX IF NOT EXISTS idx_concept_history_concept ON public.student_concept_history(student_id, concept);
CREATE INDEX IF NOT EXISTS idx_concept_history_assessed ON public.student_concept_history(assessed_at DESC);

-- 4. Enhance concept_mastery table
ALTER TABLE public.concept_mastery
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS total_questions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incorrect_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latest_accuracy integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historical_accuracy integer DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_concept_mastery_user_concept'
  ) THEN
    ALTER TABLE public.concept_mastery
      ADD CONSTRAINT uq_concept_mastery_user_concept UNIQUE (user_id, concept_name);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 5. Row Level Security
DROP POLICY IF EXISTS "Students manage own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Students view own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Students insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to quiz_attempt_answers"
  ON public.quiz_attempt_answers FOR ALL
  TO authenticated
  USING (is_administrator())
  WITH CHECK (is_administrator());

CREATE POLICY "Students view own quiz answers"
  ON public.quiz_attempt_answers FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students insert own quiz answers"
  ON public.quiz_attempt_answers FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Faculty view answers for teaching quizzes"
  ON public.quiz_attempt_answers FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_attempt_answers.quiz_id
      AND (
        q.created_by = auth.uid()
        OR q.teaching_assignment_id IN (SELECT get_faculty_teaching_assignment_ids(auth.uid()))
      )
    )
  );

ALTER TABLE public.student_concept_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to student_concept_history"
  ON public.student_concept_history FOR ALL
  TO authenticated
  USING (is_administrator())
  WITH CHECK (is_administrator());

CREATE POLICY "Students view own concept history"
  ON public.student_concept_history FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students insert own concept history"
  ON public.student_concept_history FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Faculty view concept history for teaching quizzes"
  ON public.student_concept_history FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = student_concept_history.quiz_id
      AND (
        q.created_by = auth.uid()
        OR q.teaching_assignment_id IN (SELECT get_faculty_teaching_assignment_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin full access to concept_mastery" ON public.concept_mastery;
CREATE POLICY "Admin full access to concept_mastery"
  ON public.concept_mastery FOR ALL
  TO authenticated
  USING (is_administrator())
  WITH CHECK (is_administrator());

DROP POLICY IF EXISTS "Faculty view concept mastery for cohorts" ON public.concept_mastery;
CREATE POLICY "Faculty view concept mastery for cohorts"
  ON public.concept_mastery FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      JOIN public.teaching_assignments ta ON ta.classroom_id = cm.classroom_id
      WHERE cm.student_id = concept_mastery.user_id
      AND ta.faculty_id = auth.uid()
    )
  );
