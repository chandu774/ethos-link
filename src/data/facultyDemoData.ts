export interface FacultyStudent {
  id: string;
  name: string;
  avatarUrl?: string;
  classroom: string;
  courseCode: string;
  attendance: number;
  performance: number;
  supportStatus: "needs_support" | "monitoring" | "on_track";
  weakAreasCount: number;
  academicSnapshot: {
    overallPerformance: number;
    attendance: number;
    assignmentsCompleted: number;
    assignmentsTotal: number;
    quizAverage: number;
    lectureCompletion: number;
  };
  subjectPerformance: Record<string, number>;
  topicPerformance: Array<{
    topic: string;
    mastery: number;
    status: "mastered" | "improving" | "gap";
  }>;
  strengths: string[];
  areasNeedingSupport: Array<{ topic: string; mastery: number }>;
  trends: {
    quiz: number[];
    attendance: number[];
    assignmentCompletion: number[];
  };
  supportSignals: string[];
  recommendedInterventions: string[];
}

export const DEMO_FACULTY_STUDENTS: FacultyStudent[] = [
  {
    id: "stu-rahul",
    name: "Rahul Kumar",
    classroom: "DBMS - CSE 3A",
    courseCode: "CS301",
    attendance: 82,
    performance: 74,
    supportStatus: "needs_support",
    weakAreasCount: 2,
    academicSnapshot: {
      overallPerformance: 74,
      attendance: 82,
      assignmentsCompleted: 8,
      assignmentsTotal: 10,
      quizAverage: 71,
      lectureCompletion: 78,
    },
    subjectPerformance: {
      DBMS: 74,
      OS: 81,
      CN: 88,
    },
    topicPerformance: [
      { topic: "SQL", mastery: 91, status: "mastered" },
      { topic: "Transactions", mastery: 83, status: "mastered" },
      { topic: "Normalization", mastery: 54, status: "improving" },
      { topic: "2NF", mastery: 46, status: "gap" },
      { topic: "3NF", mastery: 51, status: "gap" },
    ],
    strengths: ["SQL (91%)", "Transactions (83%)"],
    areasNeedingSupport: [
      { topic: "2NF", mastery: 46 },
      { topic: "3NF", mastery: 51 },
    ],
    trends: {
      quiz: [82, 76, 61, 48],
      attendance: [92, 89, 82],
      assignmentCompletion: [95, 90, 80],
    },
    supportSignals: [
      "Attendance declined over recent 3 weeks",
      "2 assignments incomplete in normalization module",
      "2NF performance is low (46%)",
      "Recent quiz performance shows downward trend",
    ],
    recommendedInterventions: [
      "Share 2NF revision material & lecture recap",
      "Assign targeted practice checkpoint",
      "Verify completion of missed class recovery module",
      "Review Assignment 3 submission draft",
    ],
  },
  {
    id: "stu-alex",
    name: "Alex Chen",
    classroom: "DBMS - CSE 3A",
    courseCode: "CS301",
    attendance: 82,
    performance: 76,
    supportStatus: "needs_support",
    weakAreasCount: 1,
    academicSnapshot: {
      overallPerformance: 76,
      attendance: 82,
      assignmentsCompleted: 8,
      assignmentsTotal: 11,
      quizAverage: 74,
      lectureCompletion: 78,
    },
    subjectPerformance: {
      DBMS: 74,
      OS: 81,
      CN: 88,
    },
    topicPerformance: [
      { topic: "SQL", mastery: 91, status: "mastered" },
      { topic: "Transactions", mastery: 83, status: "mastered" },
      { topic: "1NF", mastery: 92, status: "mastered" },
      { topic: "2NF", mastery: 46, status: "gap" },
      { topic: "3NF", mastery: 51, status: "gap" },
    ],
    strengths: ["SQL (91%)", "1NF (92%)"],
    areasNeedingSupport: [{ topic: "2NF", mastery: 46 }],
    trends: {
      quiz: [81, 78, 61, 76],
      attendance: [92, 89, 78, 82],
      assignmentCompletion: [90, 85, 80],
    },
    supportSignals: [
      "Missed Lecture 14 on Relational Decomposition",
      "2NF diagnostic quiz score is 46%",
      "Upcoming Assignment 3 due in 2 days",
    ],
    recommendedInterventions: [
      "Assign 2NF Checkpoint Quiz",
      "Recommend Socratic AI Tutor walkthrough on 2NF",
    ],
  },
  {
    id: "stu-ananya",
    name: "Ananya Sharma",
    classroom: "DBMS - CSE 3A",
    courseCode: "CS301",
    attendance: 94,
    performance: 89,
    supportStatus: "on_track",
    weakAreasCount: 0,
    academicSnapshot: {
      overallPerformance: 89,
      attendance: 94,
      assignmentsCompleted: 10,
      assignmentsTotal: 10,
      quizAverage: 88,
      lectureCompletion: 95,
    },
    subjectPerformance: {
      DBMS: 89,
      OS: 87,
      CN: 92,
    },
    topicPerformance: [
      { topic: "SQL", mastery: 95, status: "mastered" },
      { topic: "Transactions", mastery: 90, status: "mastered" },
      { topic: "Normalization", mastery: 84, status: "mastered" },
      { topic: "2NF", mastery: 88, status: "mastered" },
      { topic: "3NF", mastery: 85, status: "mastered" },
    ],
    strengths: ["SQL (95%)", "Transactions (90%)", "2NF (88%)"],
    areasNeedingSupport: [],
    trends: {
      quiz: [88, 92, 85, 90],
      attendance: [95, 94, 94],
      assignmentCompletion: [100, 100, 100],
    },
    supportSignals: [],
    recommendedInterventions: ["Eligible for Advanced Research Assistantship"],
  },
  {
    id: "stu-priya",
    name: "Priya Patel",
    classroom: "OS - CSE 3A",
    courseCode: "CS302",
    attendance: 78,
    performance: 72,
    supportStatus: "monitoring",
    weakAreasCount: 1,
    academicSnapshot: {
      overallPerformance: 72,
      attendance: 78,
      assignmentsCompleted: 7,
      assignmentsTotal: 10,
      quizAverage: 70,
      lectureCompletion: 74,
    },
    subjectPerformance: {
      DBMS: 78,
      OS: 71,
      CN: 76,
    },
    topicPerformance: [
      { topic: "Process Scheduling", mastery: 85, status: "mastered" },
      { topic: "Memory Management", mastery: 68, status: "improving" },
      { topic: "Deadlocks & Semaphores", mastery: 52, status: "gap" },
    ],
    strengths: ["Process Scheduling (85%)"],
    areasNeedingSupport: [{ topic: "Deadlocks & Semaphores", mastery: 52 }],
    trends: {
      quiz: [78, 72, 68, 70],
      attendance: [85, 80, 78],
      assignmentCompletion: [80, 75, 70],
    },
    supportSignals: ["Attendance hovering near 75% baseline", "Semaphore quiz score low"],
    recommendedInterventions: ["Monitor upcoming attendance", "Provide IPC practice problems"],
  },
  {
    id: "stu-vikram",
    name: "Vikram Aditya",
    classroom: "DBMS - CSE 3A",
    courseCode: "CS301",
    attendance: 88,
    performance: 84,
    supportStatus: "on_track",
    weakAreasCount: 0,
    academicSnapshot: {
      overallPerformance: 84,
      attendance: 88,
      assignmentsCompleted: 9,
      assignmentsTotal: 10,
      quizAverage: 82,
      lectureCompletion: 86,
    },
    subjectPerformance: {
      DBMS: 84,
      OS: 82,
      CN: 85,
    },
    topicPerformance: [
      { topic: "SQL", mastery: 88, status: "mastered" },
      { topic: "Transactions", mastery: 82, status: "mastered" },
      { topic: "Normalization", mastery: 79, status: "mastered" },
    ],
    strengths: ["SQL (88%)", "Transactions (82%)"],
    areasNeedingSupport: [],
    trends: {
      quiz: [80, 84, 82, 85],
      attendance: [90, 88, 88],
      assignmentCompletion: [90, 90, 90],
    },
    supportSignals: [],
    recommendedInterventions: [],
  },
];

export interface FacultyAssignmentItem {
  id: string;
  title: string;
  courseCode?: string;
  classroom?: string;
  topic?: string;
  dueDate: string;
  maxMarks: number;
  estimatedEffort?: string;
  submissionsCount?: number;
  totalStudents?: number;
  gradedCount?: number;
  description?: string;
  attachment_url?: string;
  attachment_name?: string;
}

export const DEMO_FACULTY_ASSIGNMENTS: FacultyAssignmentItem[] = [];

export const DEMO_FACULTY_QUIZZES = [
  {
    id: "fac-quiz-1",
    title: "Second Normal Form (2NF) Diagnostic Checkpoint",
    courseCode: "CS301",
    topic: "Normalization",
    difficulty: "Medium",
    questionsCount: 3,
    attemptedCount: 54,
    totalStudents: 62,
    averageScore: 68,
    struggleQuestion: "Question 2: Identifying partial dependencies with composite PKs (42% accuracy)",
  },
  {
    id: "fac-quiz-2",
    title: "Transaction ACID Properties Assessment",
    courseCode: "CS301",
    topic: "Transactions",
    difficulty: "Easy",
    questionsCount: 5,
    attemptedCount: 60,
    totalStudents: 62,
    averageScore: 84,
    struggleQuestion: "Question 4: Strict Two-Phase Locking vs 2PL (68% accuracy)",
  },
  {
    id: "fac-quiz-3",
    title: "Deadlocks & Concurrency Control Diagnostic",
    courseCode: "CS302",
    topic: "Deadlocks",
    difficulty: "Hard",
    questionsCount: 4,
    attemptedCount: 46,
    totalStudents: 58,
    averageScore: 62,
    struggleQuestion: "Question 3: Banker's Algorithm Safety State Computation (38% accuracy)",
  },
];
