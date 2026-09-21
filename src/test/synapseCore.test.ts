import { describe, it, expect, beforeEach } from 'vitest';
import { SynapseCoreService } from '../services/synapseCore';

describe('SynapseCoreService', () => {
  let synapse: SynapseCoreService;

  beforeEach(() => {
    synapse = new SynapseCoreService();
    synapse.resetToDefaultDemo();
  });

  it('should initialize with rich academic demo state', () => {
    const state = synapse.getState();
    expect(state.learningHealth).toBe(74);
    expect(state.overallAttendance).toBe(82);
    expect(state.concepts.length).toBeGreaterThan(0);
    expect(state.recommendations.length).toBeGreaterThan(0);
    expect(state.classrooms.length).toBeGreaterThan(0);
  });

  it('should extract actionable tasks from course announcements', () => {
    const announcement = 'Reminder: Lab 4 on Normalization is due this Friday by 11:59 PM. Please submit on portal.';
    const actions = synapse.analyzeTextForAcademicActions(announcement);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].title).toBeDefined();
    expect(actions[0].subject).toBe('CS301');
  });

  it('should allow teacher to create classroom and student to join via code', () => {
    const created = synapse.createClassroom('Cloud Computing', 'CS405', 'CSE 4B', '2026-27', 'AWS, Azure, serverless', 'CLOUD26');
    expect(created.classCode).toBe('CLOUD26');
    expect(synapse.getState().classrooms.some(c => c.classCode === 'CLOUD26')).toBe(true);

    const joinResult = synapse.joinClassroom('CLOUD26');
    expect(joinResult.success).toBe(true);
    expect(joinResult.classroom?.name).toBe('Cloud Computing');
  });

  it('should automatically synchronize teacher assignments into student tasks', () => {
    const initialTasksCount = synapse.getState().tasks.length;
    const asg = synapse.createTeacherAssignment(
      'cls-dbms-3a',
      'DBMS Assignment 5: BCNF Synthesis',
      'Synthesize 3NF schemas into BCNF relations',
      'Normalization',
      'Next Monday',
      'Monday, 11:59 PM',
      25,
      35,
      'HIGH'
    );

    const updatedTasks = synapse.getState().tasks;
    expect(updatedTasks.length).toBe(initialTasksCount + 1);
    const syncedTask = updatedTasks.find(t => t.assignmentId === asg.id);
    expect(syncedTask).toBeDefined();
    expect(syncedTask?.title).toBe('DBMS Assignment 5: BCNF Synthesis');
    expect(syncedTask?.source).toBe('Official Classroom Assignment');
  });

  it('should mark assignment submitted and complete synchronized task upon submission', () => {
    const asg = synapse.createTeacherAssignment(
      'cls-dbms-3a',
      'DBMS Assignment 6: Indexing',
      'B-Tree vs Hash indexing comparison',
      'Storage',
      'Tomorrow',
      'Tomorrow, 5:00 PM',
      20,
      30
    );

    synapse.submitStudentAssignment(asg.id, 'cls-dbms-3a', 'Implemented B-Tree simulation in Python');

    const classroom = synapse.getState().classrooms.find(c => c.id === 'cls-dbms-3a')!;
    const assignment = classroom.assignments.find(a => a.id === asg.id)!;
    expect(assignment.status).toBe('submitted');

    const syncedTask = synapse.getState().tasks.find(t => t.assignmentId === asg.id)!;
    expect(syncedTask.status).toBe('completed');
  });

  it('should update concept mastery when student completes targeted 2NF quiz (Feedback Loop)', () => {
    const initial2NF = synapse.getState().concepts.find((c) => c.id === 'c-2nf')!;
    expect(initial2NF.mastery).toBe(46);
    expect(initial2NF.status).toBe('gap');

    // Simulate scoring 3 out of 3 on 2NF quiz (46% -> 78%)
    synapse.recordQuizResult('quiz-2nf-targeted', 3, 3, '2NF');

    const updated2NF = synapse.getState().concepts.find((c) => c.id === 'c-2nf')!;
    expect(updated2NF.mastery).toBe(78);
    expect(updated2NF.status).toBe('mastered');
    expect(synapse.getState().learningHealth).toBeGreaterThan(74);

    // Adaptive recommendation for 3NF should be unlocked
    expect(synapse.getState().recommendations.some(r => r.id === 'rec-3nf')).toBe(true);
  });

  it('should resolve missed class penalty upon completing recovery packet', () => {
    expect(synapse.getState().missedClass.status).toBe('pending');
    const initialAttendance = synapse.getState().overallAttendance;

    synapse.markMissedClassRecovered();

    expect(synapse.getState().missedClass.status).toBe('completed');
    expect(synapse.getState().overallAttendance).toBeGreaterThan(initialAttendance);
  });

  it('should safely extract string title when createTeacherAssignment is called with an object', () => {
    const asg = synapse.createTeacherAssignment('cls-dbms-3a', {
      title: 'DBMS Project Part 1',
      description: 'Design ER Diagram',
      dueDate: 'Friday, 5:00 PM',
      maxScore: 25,
    } as any);

    expect(typeof asg.title).toBe('string');
    expect(asg.title).toBe('DBMS Project Part 1');

    const syncedTask = synapse.getState().tasks.find(t => t.assignmentId === asg.id);
    expect(syncedTask).toBeDefined();
    expect(typeof syncedTask?.title).toBe('string');
    expect(syncedTask?.title).toBe('DBMS Project Part 1');
  });
});
