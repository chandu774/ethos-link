-- Migration: 3-Tier Role Hierarchy & Real Data Tables
-- Roles: administrator, faculty, student

-- 1. Update role check constraint on profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('administrator', 'faculty', 'student'));

-- 2. Add columns to profiles for faculty and student identity
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roll_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS faculty_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS created_by_faculty UUID REFERENCES public.profiles(id);

-- Create indexes for quick roll_number and faculty_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_roll_number ON public.profiles(roll_number);
CREATE INDEX IF NOT EXISTS idx_profiles_faculty_id ON public.profiles(faculty_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Ensure assignments table has course_id, max_marks, topic, estimated_effort
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS max_marks NUMERIC(5,2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS estimated_effort TEXT DEFAULT '30 min';

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);

-- 4. Ensure tasks table has assignment_id and is_official
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_assignment_id ON public.tasks(assignment_id);

-- 5. Ensure quiz_questions table has topic, concept, difficulty
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS concept TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';

CREATE INDEX IF NOT EXISTS idx_quiz_questions_concept ON public.quiz_questions(concept);

-- 6. Ensure concept_mastery table has topic, trend, correct_count
ALTER TABLE public.concept_mastery
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS correct_count INTEGER DEFAULT 0;

-- 7. Ensure attendance table has notes, topic_covered
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS topic_covered TEXT,
  ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recovery_available BOOLEAN DEFAULT false;

-- 8. Idempotent Administrator Bootstrap Function in PostgreSQL
CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(
  p_admin_email TEXT,
  p_admin_password TEXT,
  p_admin_name TEXT DEFAULT 'Institutional Administrator'
)
RETURNS JSONB AS $$
DECLARE
  v_existing_admin_count INTEGER;
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- 1. Check whether an administrator already exists
  SELECT COUNT(*) INTO v_existing_admin_count FROM public.profiles WHERE role = 'administrator';
  IF v_existing_admin_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Administrator already exists', 'created', false);
  END IF;

  -- 2. Check if auth user exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_admin_email;
  
  IF v_user_id IS NULL THEN
    -- Generate new auth user directly
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_admin_password, gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      p_admin_email,
      v_encrypted_pw,
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'administrator'),
      jsonb_build_object('name', p_admin_name, 'role', 'administrator'),
      now(),
      now()
    );
  END IF;

  -- 3. Upsert profile with role = 'administrator'
  INSERT INTO public.profiles (
    id,
    email,
    name,
    username,
    role,
    is_admin,
    onboarding_completed,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_admin_email,
    p_admin_name,
    'admin',
    'administrator',
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'administrator',
    is_admin = true,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Initial administrator created successfully', 
    'created', true,
    'admin_email', p_admin_email,
    'admin_id', v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger to auto-sync assignment creation to student tasks
CREATE OR REPLACE FUNCTION public.sync_assignment_to_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert tasks for all students enrolled in the course
  INSERT INTO public.tasks (
    title,
    description,
    deadline,
    assigned_to,
    created_by,
    assignment_id,
    is_official,
    status
  )
  SELECT 
    NEW.title,
    COALESCE(NEW.description, 'Official Classroom Assignment'),
    NEW.deadline,
    cm.user_id,
    NEW.created_by,
    NEW.id,
    true,
    'pending'
  FROM public.course_members cm
  WHERE cm.course_id = NEW.course_id AND cm.role = 'student';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_assignment_to_tasks ON public.assignments;
CREATE TRIGGER trg_sync_assignment_to_tasks
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_assignment_to_tasks();

-- 10. Trigger to auto-update student tasks when faculty updates assignment deadline
CREATE OR REPLACE FUNCTION public.sync_assignment_deadline_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deadline IS DISTINCT FROM OLD.deadline THEN
    UPDATE public.tasks
    SET deadline = NEW.deadline, updated_at = now()
    WHERE assignment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_assignment_deadline_update ON public.assignments;
CREATE TRIGGER trg_sync_assignment_deadline_update
  AFTER UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_assignment_deadline_update();

-- 11. Trigger to mark task completed when student submits assignment
CREATE OR REPLACE FUNCTION public.sync_submission_to_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'completed', updated_at = now()
  WHERE assignment_id = NEW.assignment_id AND assigned_to = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_submission_to_task ON public.assignment_submissions;
CREATE TRIGGER trg_sync_submission_to_task
  AFTER INSERT OR UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_submission_to_task_completed();
