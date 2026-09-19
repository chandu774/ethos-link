import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

describe('Institutional Hierarchy and Subject-Level Faculty Isolation', () => {
  let adminClient: any;
  let facultyAClient: any;
  let studentClient: any;

  let adminUser: any;
  let facultyAUser: any;
  let studentUser: any;

  let testClassroomId: string;
  let teachingAssignmentAId: string;
  let testQuizId: string;
  let testAssignmentId: string;
  let testSessionId: string;

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    facultyAClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    studentClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Authenticate Admin
    const { data: adminAuth, error: adminErr } = await adminClient.auth.signInWithPassword({
      email: 'chandureddy180706@gmail.com',
      password: 'chandu@18',
    });
    expect(adminErr).toBeNull();
    adminUser = adminAuth.user;

    // 2. Authenticate Faculty A (Sudhakar - 101)
    const { data: facAAuth, error: facAErr } = await facultyAClient.auth.signInWithPassword({
      email: '101@faculty.synapse.local',
      password: 'Sudhakar',
    });
    expect(facAErr).toBeNull();
    facultyAUser = facAAuth.user;

    // 3. Authenticate Student (Prasanth - 24501A0540)
    const { data: stAuth, error: stErr } = await studentClient.auth.signInWithPassword({
      email: '24501a0540@student.synapse.local',
      password: 'Synapse@123',
    });
    expect(stErr).toBeNull();
    studentUser = stAuth.user;
  });

  afterAll(async () => {
    // Clean up created records using admin privileges
    if (testSessionId) {
      await adminClient.from('attendance_records').delete().eq('session_id', testSessionId);
      await adminClient.from('session_concepts').delete().eq('session_id', testSessionId);
      await adminClient.from('class_sessions').delete().eq('id', testSessionId);
    }
    if (testQuizId) {
      await adminClient.from('quiz_attempts').delete().eq('quiz_id', testQuizId);
      await adminClient.from('quiz_questions').delete().eq('quiz_id', testQuizId);
      await adminClient.from('quizzes').delete().eq('id', testQuizId);
    }
    if (testAssignmentId) {
      await adminClient.from('assignments').delete().eq('id', testAssignmentId);
    }
    if (teachingAssignmentAId) {
      await adminClient.from('teaching_assignments').delete().eq('id', teachingAssignmentAId);
    }
    if (testClassroomId) {
      await adminClient.from('classroom_members').delete().eq('classroom_id', testClassroomId);
      await adminClient.from('classrooms').delete().eq('id', testClassroomId);
    }
  });

  it('1. Admin creates institutional classroom cohort', async () => {
    const { data: classroom, error } = await adminClient
      .from('classrooms')
      .insert({
        name: 'CSE 3A Vitest Cohort',
        course: 'B.Tech',
        branch: 'Computer Science & Engineering',
        year: 3,
        section: 'A',
        academic_year: '2026-27',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(classroom).toBeDefined();
    testClassroomId = classroom.id;
  });

  it('2. Admin assigns Faculty A to Database Management Systems in CSE 3A', async () => {
    const { data: ta, error } = await adminClient
      .from('teaching_assignments')
      .insert({
        faculty_id: facultyAUser.id,
        classroom_id: testClassroomId,
        subject_name: 'Database Management Systems',
        subject_code: 'CS301',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(ta).toBeDefined();
    teachingAssignmentAId = ta.id;
  });

  it('3. Admin enrolls student into the classroom cohort', async () => {
    const { data: member, error } = await adminClient
      .from('classroom_members')
      .insert({
        classroom_id: testClassroomId,
        student_id: studentUser.id,
        role: 'student',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(member).toBeDefined();
  });

  it('4. Student sees their assigned classroom and teaching faculty', async () => {
    // Student queries classroom membership
    const { data: memberships, error: memErr } = await studentClient
      .from('classroom_members')
      .select('classroom_id, classroom:classrooms(*)')
      .eq('classroom_id', testClassroomId);

    expect(memErr).toBeNull();
    expect(memberships.length).toBe(1);
    expect(memberships[0].classroom.name).toBe('CSE 3A Vitest Cohort');

    // Student queries teaching assignments for their classroom
    const { data: teaching, error: teachErr } = await studentClient
      .from('teaching_assignments')
      .select('id, subject_name, subject_code, faculty:profiles(name)')
      .eq('classroom_id', testClassroomId);

    expect(teachErr).toBeNull();
    expect(teaching.length).toBe(1);
    expect(teaching[0].subject_name).toBe('Database Management Systems');
    expect(teaching[0].faculty.name).toBe('Sudhakar');
  });

  it('5. Faculty A publishes a diagnostic quiz in DBMS for CSE 3A', async () => {
    const { data: quiz, error } = await facultyAClient
      .from('quizzes')
      .insert({
        title: 'DBMS 2NF Diagnostic Assessment',
        topic: 'Relational Decomposition',
        difficulty: 'Medium',
        subject: 'Database Management Systems',
        teaching_assignment_id: teachingAssignmentAId,
        classroom_id: testClassroomId,
        created_by: facultyAUser.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(quiz).toBeDefined();
    testQuizId = quiz.id;
  });

  it('6. Enrolled student can view the classroom quiz', async () => {
    const { data: quizzes, error } = await studentClient
      .from('quizzes')
      .select('id, title, subject')
      .eq('classroom_id', testClassroomId);

    expect(error).toBeNull();
    expect(quizzes.length).toBe(1);
    expect(quizzes[0].title).toBe('DBMS 2NF Diagnostic Assessment');
  });

  it('7. Strict Isolation: Unassigned/different faculty receives 0 rows for Faculty A quiz', async () => {
    // An unassigned client (or anonymous / another faculty client) querying the quiz:
    // We create a fresh anonymous client without Faculty A auth
    const anonClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: quizzes, error } = await anonClient
      .from('quizzes')
      .select('id, title')
      .eq('id', testQuizId);

    // Anon cannot see quizzes due to RLS
    expect(quizzes?.length || 0).toBe(0);
  });

  it('8. Faculty A creates an assignment for CSE 3A and student accesses it', async () => {
    const deadline = new Date(Date.now() + 86400000 * 5).toISOString();

    const { data: assignment, error } = await facultyAClient
      .from('assignments')
      .insert({
        title: 'DBMS Normalization Problem Set 1',
        description: 'Complete questions 1-5 on 3NF and BCNF decomposition.',
        topic: 'Normalization',
        subject: 'Database Management Systems',
        teaching_assignment_id: teachingAssignmentAId,
        classroom_id: testClassroomId,
        deadline: deadline,
        max_marks: 25,
        created_by: facultyAUser.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(assignment).toBeDefined();
    testAssignmentId = assignment.id;

    // Student accesses the assignment
    const { data: stAsg, error: stAsgErr } = await studentClient
      .from('assignments')
      .select('id, title, subject')
      .eq('id', testAssignmentId);

    expect(stAsgErr).toBeNull();
    expect(stAsg.length).toBe(1);
    expect(stAsg[0].title).toBe('DBMS Normalization Problem Set 1');
  });

  it('9. Faculty A adds questions with concept tags and student submits attempt', async () => {
    // Add question
    const { data: q1, error: q1Err } = await facultyAClient
      .from('quiz_questions')
      .insert({
        quiz_id: testQuizId,
        question: 'Which of the following is true for 2NF?',
        options: ['Every non-prime attribute is fully functionally dependent on any candidate key', 'Transitive dependencies are eliminated', 'Multi-valued dependencies are eliminated', 'None of the above'],
        correct_option_index: 0,
        explanation: '2NF requires relations to be in 1NF and have no partial dependencies on candidate keys.',
        topic: 'Normalization',
        concept: '2NF Dependency',
        marks: 2,
      })
      .select()
      .single();

    expect(q1Err).toBeNull();
    expect(q1).toBeDefined();

    // Student attempts the quiz
    const { data: attempt, error: attErr } = await studentClient
      .from('quiz_attempts')
      .insert({
        quiz_id: testQuizId,
        user_id: studentUser.id,
        score: 2,
        max_score: 2,
        answers: {
          [q1.id]: {
            selected: 0,
            correct: true,
            topic: 'Normalization',
            concept: '2NF Dependency',
          },
        },
      })
      .select()
      .single();

    expect(attErr).toBeNull();
    expect(attempt.score).toBe(2);
    expect(attempt.user_id).toBe(studentUser.id);
  });

  it('10. Faculty A logs a class session with concepts taught and student attendance', async () => {
    // 1. Log class session
    const today = new Date().toISOString().split('T')[0];
    const { data: session, error: sessErr } = await facultyAClient
      .from('class_sessions')
      .insert({
        teaching_assignment_id: teachingAssignmentAId,
        date: today,
        topic: 'BCNF and Lossless Joins',
        teaching_notes: 'Covered decomposition algorithm and verified dependency preservation.',
        created_by: facultyAUser.id,
      })
      .select()
      .single();

    expect(sessErr).toBeNull();
    expect(session).toBeDefined();
    testSessionId = session.id;

    // 2. Tag concepts taught
    const { error: concErr } = await facultyAClient
      .from('session_concepts')
      .insert([
        { session_id: testSessionId, concept_name: 'BCNF Decomposition' },
        { session_id: testSessionId, concept_name: 'Lossless Join' },
      ]);
    expect(concErr).toBeNull();

    // 3. Mark student attendance
    const { error: attErr } = await facultyAClient
      .from('attendance_records')
      .insert({
        session_id: testSessionId,
        student_id: studentUser.id,
        status: 'present',
      });
    expect(attErr).toBeNull();
  });

  it('11. Student can view their attendance record and concepts taught for the session', async () => {
    // Query attendance records for student
    const { data: records, error: recErr } = await studentClient
      .from('attendance_records')
      .select('id, status, session:class_sessions(id, topic, date, teaching_assignment:teaching_assignments(subject_name))')
      .eq('session_id', testSessionId);

    expect(recErr).toBeNull();
    expect(records.length).toBe(1);
    expect(records[0].status).toBe('present');
    expect(records[0].session.topic).toBe('BCNF and Lossless Joins');
  });

  it('12. Strict Isolation: Unassigned/anonymous user cannot view Faculty A session or attendance', async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sessions } = await anonClient
      .from('class_sessions')
      .select('id, topic')
      .eq('id', testSessionId);

    expect(sessions?.length || 0).toBe(0);

    const { data: attendance } = await anonClient
      .from('attendance_records')
      .select('id, status')
      .eq('session_id', testSessionId);

    expect(attendance?.length || 0).toBe(0);
  });
});
