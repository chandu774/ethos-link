import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

describe('Two-Way Assignment and Task Synchronization with PDF Support', () => {
  let facultyClient: any;
  let studentClient: any;
  let createdAssignmentId: string;
  let facultyUser: any;
  let studentUser: any;

  beforeAll(async () => {
    facultyClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    studentClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Authenticate Faculty
    const { data: facultyAuth, error: facultyAuthError } = await facultyClient.auth.signInWithPassword({
      email: '101@faculty.synapse.local',
      password: 'Sudhakar',
    });
    expect(facultyAuthError).toBeNull();
    expect(facultyAuth.user).toBeDefined();
    facultyUser = facultyAuth.user;

    // 2. Authenticate Student
    const { data: studentAuth, error: studentAuthError } = await studentClient.auth.signInWithPassword({
      email: '24501a0540@student.synapse.local',
      password: 'Synapse@123',
    });
    expect(studentAuthError).toBeNull();
    expect(studentAuth.user).toBeDefined();
    studentUser = studentAuth.user;
  });

  afterAll(async () => {
    // Cleanup created assignment (cascades to tasks and submissions)
    if (createdAssignmentId && facultyClient) {
      await facultyClient.from('assignments').delete().eq('id', createdAssignmentId);
    }
  });

  it('Faculty creates an assignment with attached PDF problem sheet', async () => {
    const deadline = new Date(Date.now() + 86400000 * 3).toISOString();

    const { data: assignment, error } = await facultyClient
      .from('assignments')
      .insert({
        title: 'Vitest Automated Assignment: Distributed Systems ACID',
        description: 'Comprehensive analysis of two-phase commit protocol and consensus algorithms.',
        topic: 'Distributed Systems',
        max_marks: 30,
        estimated_effort: '60 mins',
        deadline: deadline,
        attachment_url: 'https://ksvpugnibidxikuomidq.supabase.co/storage/v1/object/public/assignment-files/test-problem-sheet.pdf',
        attachment_name: 'Distributed_Systems_Problem_Sheet.pdf',
        created_by: facultyUser.id,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(assignment).toBeDefined();
    expect(assignment.attachment_name).toBe('Distributed_Systems_Problem_Sheet.pdf');
    expect(assignment.attachment_url).toContain('test-problem-sheet.pdf');
    createdAssignmentId = assignment.id;
  });

  it('Postgres trigger automatically creates an official task for the student in public.tasks', async () => {
    expect(createdAssignmentId).toBeDefined();

    // Query student tasks
    const { data: tasks, error } = await studentClient
      .from('tasks')
      .select('*')
      .eq('assignment_id', createdAssignmentId)
      .eq('assigned_to', studentUser.id);

    expect(error).toBeNull();
    expect(tasks).toBeDefined();
    expect(tasks.length).toBeGreaterThanOrEqual(1);

    const task = tasks[0];
    expect(task.title).toBe('Vitest Automated Assignment: Distributed Systems ACID');
    expect(task.is_official).toBe(true);
    expect(task.priority).toBe('HIGH');
    expect(task.status).toBe('todo');
  });

  it('Student queries the assignment and uploads solution report PDF', async () => {
    // Student fetches assignment
    const { data: assignments, error: fetchErr } = await studentClient
      .from('assignments')
      .select('*')
      .eq('id', createdAssignmentId);

    expect(fetchErr).toBeNull();
    expect(assignments.length).toBe(1);
    const assignment = assignments[0];
    expect(assignment.attachment_url).toContain('.pdf');

    // Student submits solution with PDF
    const { data: submission, error: submitErr } = await studentClient
      .from('assignment_submissions')
      .insert({
        assignment_id: createdAssignmentId,
        user_id: studentUser.id,
        submission_text: 'Attached solution report covering 2PC and Paxos edge cases.',
        attachment_url: 'https://ksvpugnibidxikuomidq.supabase.co/storage/v1/object/public/submission-files/test-solution.pdf',
        attachment_name: 'Prasanth_2PC_Solution.pdf',
        status: 'submitted',
      })
      .select()
      .single();

    expect(submitErr).toBeNull();
    expect(submission).toBeDefined();
    expect(submission.attachment_name).toBe('Prasanth_2PC_Solution.pdf');
  });

  it('Postgres trigger automatically marks student task as completed upon submission', async () => {
    const { data: tasks, error } = await studentClient
      .from('tasks')
      .select('*')
      .eq('assignment_id', createdAssignmentId)
      .eq('assigned_to', studentUser.id);

    expect(error).toBeNull();
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(tasks[0].status).toBe('completed');
  });

  it('Faculty views student submission with attached solution PDF', async () => {
    const { data: submissions, error } = await facultyClient
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', createdAssignmentId);

    expect(error).toBeNull();
    expect(submissions.length).toBe(1);
    expect(submissions[0].user_id).toBe(studentUser.id);
    expect(submissions[0].attachment_name).toBe('Prasanth_2PC_Solution.pdf');
    expect(submissions[0].attachment_url).toContain('test-solution.pdf');
  });
});
