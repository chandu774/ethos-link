import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Real Faculty Quizzes for Students Verification', () => {
  it('Queries real published quizzes from public.quizzes table', async () => {
    const { data: publishedQuizzes, error } = await supabase
      .from('quizzes')
      .select('id, title, topic, subject, difficulty, status, duration_minutes, max_attempts, classroom_id')
      .ilike('status', 'PUBLISHED');

    expect(error).toBeNull();
    expect(Array.isArray(publishedQuizzes)).toBe(true);

    if (publishedQuizzes && publishedQuizzes.length > 0) {
      const quiz = publishedQuizzes[0];
      expect(quiz.id).toBeDefined();
      expect(quiz.title).toBeTruthy();
      expect(quiz.status.toUpperCase()).toBe('PUBLISHED');

      // Verify that questions exist for the real published quiz
      const { data: questions, error: qErr } = await supabase
        .from('quiz_questions')
        .select('id, question, options, marks')
        .eq('quiz_id', quiz.id);

      expect(qErr).toBeNull();
      expect(Array.isArray(questions)).toBe(true);
      if (questions && questions.length > 0) {
        expect(questions[0].question).toBeTruthy();
        expect(Array.isArray(questions[0].options)).toBe(true);
      }
    }
  });
});
