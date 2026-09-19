import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Faculty Analytics Query & Schema Integrity', () => {
  it('Queries classroom_members joined with student profiles using correct column "name"', async () => {
    const { data: members, error } = await supabase
      .from('classroom_members')
      .select(`
        classroom_id,
        student_id,
        student:profiles!classroom_members_student_id_fkey (
          id,
          name,
          roll_number,
          email
        )
      `)
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(members)).toBe(true);
    if (members && members.length > 0) {
      expect(members[0].student).toBeDefined();
      expect(typeof (members[0].student as any).name).toBe('string');
    }
  });

  it('Queries quizzes and quiz_attempts using column "user_id"', async () => {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        topic,
        teaching_assignment_id,
        quiz_attempts (
          id,
          user_id,
          score,
          max_score,
          percentage
        )
      `)
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(quizzes)).toBe(true);
  });

  it('Queries class_sessions and attendance_records for session turnout', async () => {
    const { data: sessions, error } = await supabase
      .from('class_sessions')
      .select(`
        id,
        date,
        topic,
        teaching_assignment_id,
        attendance_records (
          id,
          student_id,
          status
        )
      `)
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(sessions)).toBe(true);
  });
});
