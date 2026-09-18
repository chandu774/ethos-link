import {
  DemoChapter,
  DemoTranscriptItem,
  DemoLecture,
  DemoQuiz,
  ConceptMasteryItem,
  DemoRecommendation,
  DemoOpportunity,
  DemoCourse,
  DEMO_COURSES,
  DEMO_CONCEPTS,
  DEMO_LECTURES,
  DEMO_QUIZZES,
  DEMO_RECOMMENDATIONS,
  DEMO_MISSED_CLASS,
  DEMO_OPPORTUNITIES,
  DEMO_FACULTY_INSIGHTS,
  Classroom,
  ClassroomAnnouncement,
  ClassroomAssignment,
  ClassroomResource,
  LearningEvent,
  DEMO_CLASSROOMS,
  DEMO_LEARNING_EVENTS,
} from '@/data/demoData';

export interface HackathonDemoStep {
  id: number;
  title: string;
  description: string;
  route: string;
  actionText: string;
  badge: string;
  roleTarget?: 'student' | 'teacher';
}

export const HACKATHON_DEMO_STEPS: HackathonDemoStep[] = [
  {
    id: 1,
    title: "1. Teacher Creates Classroom",
    description: "Dr. Rao creates 'DBMS - CSE 3A' with code DBMS3A26 and 62 enrolled students.",
    route: "/classrooms",
    actionText: "Classrooms Hub",
    badge: "Teacher View",
    roleTarget: "teacher",
  },
  {
    id: 2,
    title: "2. Class Feed & Announcement",
    description: "Teacher posts 'DBMS Assignment 3 due Monday & Normalization quiz Friday' → Synapse auto-detects tasks.",
    route: "/classrooms/cls-dbms-3a?tab=announcements",
    actionText: "Class Feed",
    badge: "Announcements",
    roleTarget: "teacher",
  },
  {
    id: 3,
    title: "3. Assignment Created → Auto Task Sync",
    description: "Teacher creates 'DBMS Assignment 3' (20 marks) → automatically appears in student Tasks list.",
    route: "/classrooms/cls-dbms-3a?tab=assignments",
    actionText: "Assignments & Tasks",
    badge: "Task Sync",
    roleTarget: "teacher",
  },
  {
    id: 4,
    title: "4. AI Lecture Understanding",
    description: "Teacher uploads lecture → Synapse generates searchable transcript, timestamps, summary & quiz.",
    route: "/lectures/lec-dbms-norm",
    actionText: "Lecture Platform",
    badge: "AI Video",
    roleTarget: "student",
  },
  {
    id: 5,
    title: "5. Missed Class Recovery",
    description: "Student is absent → Synapse converts missed attendance into a curated 30-minute recovery plan.",
    route: "/attendance-recovery",
    actionText: "Start Recovery",
    badge: "Recovery Hub",
    roleTarget: "student",
  },
  {
    id: 6,
    title: "6. Assessment & Gap Detection",
    description: "Student takes checkpoint quiz → detects critical topic weakness in 2NF (46% mastery).",
    route: "/assessments/quiz-norm-mastery",
    actionText: "Take Assessment",
    badge: "Diagnostic",
    roleTarget: "student",
  },
  {
    id: 7,
    title: "7. Knowledge Map Inspection",
    description: "Visual concept map reveals 2NF in red (46%) with direct lecture timestamps and tutor links.",
    route: "/my-learning?concept=c-2nf",
    actionText: "Knowledge Map",
    badge: "Concept Mastery",
    roleTarget: "student",
  },
  {
    id: 8,
    title: "8. Accessible Video & Sign Language",
    description: "Student jumps to 19:42 in lecture with side-by-side ASL Sign Language panel and live captions.",
    route: "/lectures/lec-dbms-norm?t=1182",
    actionText: "Watch with ASL",
    badge: "🤟 Accessibility",
    roleTarget: "student",
  },
  {
    id: 9,
    title: "9. Context-Aware AI Tutor",
    description: "Student asks 'I don't understand 2NF' → AI tutor provides syllabus-grounded Socratic explanation.",
    route: "/ai-tutor?concept=2NF",
    actionText: "AI Academic Tutor",
    badge: "Socratic AI",
    roleTarget: "student",
  },
  {
    id: 10,
    title: "10. Targeted Practice Checkpoint",
    description: "Student completes 3-question targeted practice → mastery elevates from 46% to 78%.",
    route: "/assessments/quiz-2nf-targeted",
    actionText: "Targeted Quiz",
    badge: "Feedback Loop",
    roleTarget: "student",
  },
  {
    id: 11,
    title: "11. Adaptive Roadmap Update",
    description: "Synapse marks 2NF resolved, updates Learning Health (74% → 85%), and generates 3NF next step.",
    route: "/dashboard",
    actionText: "Updated Dashboard",
    badge: "Personalized Roadmap",
    roleTarget: "student",
  },
  {
    id: 12,
    title: "12. Teacher Insights & Heatmap",
    description: "Dr. Rao views class topic difficulty heatmap (Normalization 53% → 68%) and student risk signals.",
    route: "/faculty",
    actionText: "Faculty Insights",
    badge: "Classroom Analytics",
    roleTarget: "teacher",
  },
];

const STORAGE_KEY = "synapse_academic_state_v3";

export interface ExtractedAcademicAction {
  id: string;
  type: 'assignment' | 'quiz' | 'reading' | 'lab';
  title: string;
  subject: string;
  deadlineText: string;
  dueDateISO: string;
  estimatedMinutes: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  originalMessage: string;
  isAddedToTasks: boolean;
}

export interface StudentTask {
  id: string;
  title: string;
  subject: string;
  description: string;
  deadline: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'pending' | 'in_progress' | 'completed';
  estimatedMinutes: number;
  source: 'Official Classroom Assignment' | 'Teacher Announcement' | 'Synapse AI Intervention' | 'Personal';
  assignmentId?: string;
  classroomId?: string;
}

export interface AccessibilitySettings {
  captionsEnabled: boolean;
  signLanguageEnabled: boolean;
  textToSpeechEnabled: boolean;
  highContrast: boolean;
  textSize: 'small' | 'normal' | 'large';
  reducedMotion: boolean;
}

export interface SynapseState {
  currentRole: 'student' | 'teacher';
  learningHealth: number;
  overallAttendance: number;
  classrooms: Classroom[];
  concepts: ConceptMasteryItem[];
  recommendations: DemoRecommendation[];
  missedClass: typeof DEMO_MISSED_CLASS;
  extractedActions: ExtractedAcademicAction[];
  accessibility: AccessibilitySettings;
  activeDemoStep: number;
  quizHistory: Record<string, { score: number; maxScore: number; date: string }>;
  tasks: StudentTask[];
  learningEvents: LearningEvent[];
}

const DEFAULT_EXTRACTED_ACTIONS: ExtractedAcademicAction[] = [
  {
    id: "act-1",
    type: "assignment",
    title: "DBMS Assignment 3: Relational Decomposition",
    subject: "CS301",
    deadlineText: "Monday, 11:59 PM",
    dueDateISO: new Date(Date.now() + 86400000 * 2).toISOString(),
    estimatedMinutes: 30,
    priority: "HIGH",
    originalMessage: "Complete DBMS Assignment 3 by Monday. There will be a quiz on normalization Friday.",
    isAddedToTasks: true,
  },
  {
    id: "act-2",
    type: "quiz",
    title: "DBMS Assessment: Normalization Checkpoint",
    subject: "CS301",
    deadlineText: "Friday, in-class",
    dueDateISO: new Date(Date.now() + 86400000 * 5).toISOString(),
    estimatedMinutes: 20,
    priority: "HIGH",
    originalMessage: "Complete DBMS Assignment 3 by Monday. There will be a quiz on normalization Friday.",
    isAddedToTasks: false,
  },
];

const INITIAL_STATE: SynapseState = {
  currentRole: 'student',
  learningHealth: 74,
  overallAttendance: 82,
  classrooms: DEMO_CLASSROOMS,
  concepts: DEMO_CONCEPTS,
  recommendations: DEMO_RECOMMENDATIONS,
  missedClass: DEMO_MISSED_CLASS,
  extractedActions: DEFAULT_EXTRACTED_ACTIONS,
  accessibility: {
    captionsEnabled: true,
    signLanguageEnabled: false,
    textToSpeechEnabled: false,
    highContrast: false,
    textSize: "normal",
    reducedMotion: false,
  },
  activeDemoStep: 1,
  quizHistory: {},
  tasks: [
    {
      id: "task-1",
      title: "DBMS Assignment 3: Relational Decomposition",
      subject: "CS301",
      description: "Decompose schemas into 2NF and 3NF without losing functional dependencies. (Official Assignment)",
      deadline: "Tomorrow, 11:59 PM",
      priority: "HIGH",
      status: "in_progress",
      estimatedMinutes: 30,
      source: "Official Classroom Assignment",
      assignmentId: "asg-dbms-3",
      classroomId: "cls-dbms-3a",
    },
    {
      id: "task-2",
      title: "Operating Systems Page Replacement Lab",
      subject: "CS302",
      description: "Submit LRU cache simulation in C++ on classroom portal.",
      deadline: "Thursday, 5:00 PM",
      priority: "MEDIUM",
      status: "pending",
      estimatedMinutes: 45,
      source: "Official Classroom Assignment",
      assignmentId: "asg-os-1",
      classroomId: "cls-os-3a",
    },
    {
      id: "task-3",
      title: "Review 2NF Partial Dependencies",
      subject: "CS301",
      description: "Self-study intervention recommended by Synapse AI after Quiz 3.",
      deadline: "Today",
      priority: "HIGH",
      status: "pending",
      estimatedMinutes: 20,
      source: "Synapse AI Intervention",
    },
  ],
  learningEvents: DEMO_LEARNING_EVENTS,
};

export class SynapseCoreService {
  private state: SynapseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): SynapseState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...INITIAL_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to load Synapse state from storage:", e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Failed to save Synapse state:", e);
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("Listener error in synapseCore:", e);
      }
    });
  }

  public getState(): SynapseState {
    return this.state;
  }

  // Switch role between student and teacher
  public switchRole(role: 'student' | 'teacher') {
    this.state.currentRole = role;
    this.saveState();
  }

  // Set active demo walkthrough step
  public setDemoStep(step: number) {
    this.state.activeDemoStep = step;
    const currentStep = HACKATHON_DEMO_STEPS.find(s => s.id === step);
    if (currentStep?.roleTarget) {
      this.state.currentRole = currentStep.roleTarget;
    }
    this.saveState();
  }

  // ==================== CLASSROOMS ENGINE ====================

  public createClassroom(
    name: string,
    code: string,
    section: string,
    academicYear: string,
    description: string,
    classCode?: string
  ): Classroom {
    const generatedCode = classCode?.trim() || (code.replace(/[^A-Za-z0-9]/g, '') + section.replace(/[^A-Za-z0-9]/g, '') + '26').toUpperCase();
    const newClassroom: Classroom = {
      id: 'cls-' + Date.now(),
      name,
      code,
      section,
      academicYear: academicYear || '2026-27',
      classCode: generatedCode,
      teacherName: 'Dr. Aris Rao',
      description,
      studentsCount: 1, // Start with current student
      assignmentsCount: 0,
      upcomingCount: 0,
      averagePerformance: 80,
      color: 'from-blue-600 via-indigo-600 to-indigo-800',
      announcements: [],
      assignments: [],
      resources: [],
    };

    this.state.classrooms.unshift(newClassroom);
    this.logLearningEvent('ASSIGNMENT_CREATED', `Created Classroom: ${name} (${section})`, code, `Class Code: ${generatedCode}`);
    this.saveState();
    return newClassroom;
  }

  public joinClassroom(classCode: string): { success: boolean; message: string; classroom?: Classroom } {
    const cleanCode = classCode.trim().toUpperCase();
    const found = this.state.classrooms.find(c => c.classCode.toUpperCase() === cleanCode);
    if (!found) {
      return { success: false, message: "Invalid class code. Please check with your teacher." };
    }
    found.studentsCount += 1;
    this.logLearningEvent('ATTENDED_CLASS', `Joined Classroom: ${found.name}`, found.code, `Section: ${found.section}`);
    this.saveState();
    return { success: true, message: `Successfully joined ${found.name} (${found.section})!`, classroom: found };
  }

  // Teacher posts announcement → Synapse auto-detects academic tasks
  public postClassroomAnnouncement(
    classroomId: string,
    title: string,
    content: string,
    type: ClassroomAnnouncement['type'] = 'announcement'
  ) {
    const classroom = this.state.classrooms.find(c => c.id === classroomId);
    if (!classroom) return;

    // Detect tasks from announcement text
    const extracted = this.analyzeTextForAcademicActions(content);
    let extractedTaskData = undefined;

    if (extracted.length > 0) {
      const topAction = extracted[0];
      extractedTaskData = {
        id: topAction.id,
        title: topAction.title,
        deadline: topAction.deadlineText,
        priority: topAction.priority,
        estimatedMinutes: topAction.estimatedMinutes,
        isAddedToTasks: true,
      };

      // Automatically sync task into student tasks!
      this.state.tasks.unshift({
        id: 'task-ann-' + Date.now(),
        title: topAction.title,
        subject: classroom.code,
        description: `Auto-synchronized from teacher announcement: "${content}"`,
        deadline: topAction.deadlineText,
        priority: topAction.priority,
        status: 'pending',
        estimatedMinutes: topAction.estimatedMinutes,
        source: 'Teacher Announcement',
        classroomId: classroom.id,
      });
    }

    classroom.announcements.unshift({
      id: 'ann-' + Date.now(),
      classroomId,
      authorName: 'Dr. Aris Rao',
      authorRole: 'teacher',
      date: 'Just now',
      title,
      content,
      type,
      extractedTask: extractedTaskData,
    });

    this.saveState();
  }

  // Teacher creates official assignment → Automatically creates student Task
  public createTeacherAssignment(
    classroomId: string,
    title: string,
    description: string,
    topic: string,
    dueDate: string,
    dueDateTime: string,
    maxMarks: number = 20,
    estimatedMinutes: number = 30,
    priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'
  ): ClassroomAssignment {
    const classroom = this.state.classrooms.find(c => c.id === classroomId);
    const asgId = 'asg-' + Date.now();

    const newAssignment: ClassroomAssignment = {
      id: asgId,
      classroomId,
      title,
      description,
      topic,
      dueDate,
      dueDateTime: dueDateTime || dueDate,
      maxMarks,
      estimatedMinutes,
      priority,
      status: 'assigned',
    };

    if (classroom) {
      classroom.assignments.unshift(newAssignment);
      classroom.assignmentsCount += 1;
      classroom.upcomingCount += 1;
    }

    // AUTOMATIC TASK SYNCHRONIZATION
    this.state.tasks.unshift({
      id: 'task-asg-' + Date.now(),
      title,
      subject: classroom ? classroom.code : 'Academic',
      description: `${description} (${maxMarks} Marks)`,
      deadline: dueDateTime || dueDate,
      priority,
      status: 'pending',
      estimatedMinutes,
      source: 'Official Classroom Assignment',
      assignmentId: asgId,
      classroomId,
    });

    // Update recommendations based on new workload
    this.recalculateWorkloadAndRecommendations();

    this.logLearningEvent('ASSIGNMENT_CREATED', title, classroom?.code || 'CS301', `Due: ${dueDate}, Topic: ${topic}`);
    this.saveState();
    return newAssignment;
  }

  // Student submits assignment → marks assignment submitted & completes student task
  public submitStudentAssignment(assignmentId: string, classroomId: string, submissionText: string) {
    const classroom = this.state.classrooms.find(c => c.id === classroomId);
    if (classroom) {
      const asg = classroom.assignments.find(a => a.id === assignmentId);
      if (asg) {
        asg.status = 'submitted';
        asg.submission = {
          submittedAt: 'Just now',
          text: submissionText,
        };
        classroom.upcomingCount = Math.max(0, classroom.upcomingCount - 1);
      }
    }

    // Complete corresponding student task
    const task = this.state.tasks.find(t => t.assignmentId === assignmentId);
    if (task) {
      task.status = 'completed';
    }

    this.state.learningHealth = Math.min(96, this.state.learningHealth + 4);
    this.logLearningEvent('ASSIGNMENT_SUBMITTED', 'Assignment Submitted', classroom?.code || 'CS301', 'Marked completed on portal');
    this.saveState();
  }

  // Continuous Learning Event Logging
  public logLearningEvent(
    type: LearningEvent['type'],
    title: string,
    courseCode: string,
    detail: string
  ) {
    this.state.learningEvents.unshift({
      id: 'evt-' + Date.now(),
      type,
      title,
      courseCode,
      timestamp: 'Just now',
      detail,
    });
  }

  // Recalculate workload & priorities
  private recalculateWorkloadAndRecommendations() {
    const urgentAssignments = this.state.tasks.filter(t => t.status !== 'completed' && t.priority === 'HIGH');
    if (urgentAssignments.length > 0) {
      const topTask = urgentAssignments[0];
      const existingRec = this.state.recommendations.find(r => r.id === 'rec-2');
      if (existingRec) {
        existingRec.title = `Complete ${topTask.title}`;
        existingRec.reason = "Approaching deadline + associated with high weightage topic.";
      }
    }
  }

  // AI Chat task extraction engine
  public analyzeTextForAcademicActions(text: string): ExtractedAcademicAction[] {
    const results: ExtractedAcademicAction[] = [];
    const lower = text.toLowerCase();

    // Pattern 1: Assignment or Lab announcements
    if (lower.includes("assignment") || lower.includes("homework") || lower.includes("worksheet") || lower.includes("project") || lower.includes("lab") || (lower.includes("due") && (lower.includes("portal") || lower.includes("submit")))) {
      const deadlineMatch = text.match(/(?:by|due|before|deadline:?)\s+([A-Za-z0-9, :]+?)(?:\.|$)/i);
      const deadline = deadlineMatch ? deadlineMatch[1].trim() : "Upcoming";
      
      results.push({
        id: "extracted-" + Date.now() + "-1",
        type: "assignment",
        title: "DBMS Assignment 3: Relational Decomposition",
        subject: lower.includes("dbms") || lower.includes("normalization") || lower.includes("relational") || lower.includes("sql") ? "CS301" : lower.includes("os") ? "CS302" : "Computer Science",
        deadlineText: deadline,
        dueDateISO: new Date(Date.now() + 86400000 * 2).toISOString(),
        estimatedMinutes: 30,
        priority: "HIGH",
        originalMessage: text,
        isAddedToTasks: false,
      });
    }

    // Pattern 2: Quiz or assessment announcements
    if (lower.includes("quiz") || lower.includes("exam") || lower.includes("test") || lower.includes("assessment")) {
      const dateMatch = text.match(/(?:on|by|this|next)\s+([A-Za-z]+day|[A-Za-z0-9, ]+?)(?:\.|$)/i);
      const dateText = dateMatch ? dateMatch[1].trim() : "Scheduled";

      results.push({
        id: "extracted-" + Date.now() + "-2",
        type: "quiz",
        title: "Class Assessment: " + (lower.includes("normalization") ? "Normalization Quiz" : "Topic Quiz"),
        subject: lower.includes("dbms") || lower.includes("normalization") || lower.includes("relational") || lower.includes("sql") ? "CS301" : lower.includes("os") ? "CS302" : "Computer Science",
        deadlineText: dateText,
        dueDateISO: new Date(Date.now() + 86400000 * 5).toISOString(),
        estimatedMinutes: 20,
        priority: "HIGH",
        originalMessage: text,
        isAddedToTasks: false,
      });
    }

    return results;
  }

  public addExtractedActionToTasks(actionId: string) {
    const action = this.state.extractedActions.find((a) => a.id === actionId);
    if (!action) return;

    // Avoid duplicate
    const exists = this.state.tasks.some((t) => t.title.toLowerCase() === action.title.toLowerCase());
    if (!exists) {
      this.state.tasks.unshift({
        id: "task-" + Date.now(),
        title: action.title,
        subject: action.subject,
        description: `Auto-extracted from class announcement: "${action.originalMessage}"`,
        deadline: action.deadlineText,
        priority: action.priority,
        status: "pending",
        estimatedMinutes: action.estimatedMinutes,
        source: "Teacher Announcement",
      });
    }

    action.isAddedToTasks = true;
    this.saveState();
  }

  // Update concept mastery after quiz attempt (THE CORE FEEDBACK LOOP)
  public recordQuizResult(quizId: string, score: number, maxScore: number, conceptTag: string) {
    const pct = Math.round((score / maxScore) * 100);
    this.state.quizHistory[quizId] = {
      score,
      maxScore,
      date: new Date().toISOString(),
    };

    // If it is 2NF quiz and student scored well
    if (conceptTag.includes("2NF") || quizId.includes("2nf")) {
      const concept = this.state.concepts.find((c) => c.id === "c-2nf");
      if (concept) {
        concept.mastery = Math.min(100, Math.max(concept.mastery, pct >= 70 ? 78 : 65));
        concept.status = concept.mastery >= 75 ? "mastered" : concept.mastery >= 60 ? "improving" : "gap";
        concept.trend = "up";
        concept.practiceCount += 1;
      }

      // Mark the 2NF recommendation as completed
      const rec = this.state.recommendations.find((r) => r.id === "rec-1");
      if (rec && pct >= 70) {
        rec.completed = true;
      }

      // Add next adaptive recommendation: 3NF
      const nextRecExists = this.state.recommendations.some(r => r.id === 'rec-3nf');
      if (!nextRecExists) {
        this.state.recommendations.push({
          id: 'rec-3nf',
          type: 'quiz',
          title: 'Advance to 3NF (Transitive Dependencies)',
          subject: 'CS301',
          estimatedMinutes: 15,
          priority: 'MEDIUM',
          reason: '2NF mastered! Progress to Third Normal Form to complete schema decomposition.',
          whyEvidence: [
            '2NF mastery upgraded to 78% (Mastered)',
            'Prerequisite for BCNF schema synthesis',
          ],
          actionRoute: '/assessments/quiz-norm-mastery',
          actionText: 'Start 3NF Practice',
          completed: false,
          conceptTag: '3NF',
        });
      }

      // Boost overall learning health
      this.state.learningHealth = Math.min(94, this.state.learningHealth + 11);

      this.logLearningEvent('QUIZ_COMPLETED', 'Completed 2NF Targeted Practice', 'CS301', `Score: ${score}/${maxScore} (${pct}%). 2NF Mastery increased to 78%.`);
    }

    this.saveState();
  }

  // Missed class recovery
  public markMissedClassRecovered() {
    this.state.missedClass.status = "completed";
    this.state.overallAttendance = Math.min(92, this.state.overallAttendance + 4);
    this.state.learningHealth = Math.min(96, this.state.learningHealth + 6);
    
    // Remove or complete the missed lecture recommendation
    const rec = this.state.recommendations.find((r) => r.id === "rec-3");
    if (rec) {
      rec.completed = true;
    }

    this.logLearningEvent('ATTENDED_CLASS', 'Recovered DBMS Lecture 14', 'CS301', '30-minute recovery package completed');
    this.saveState();
  }

  // Update task status
  public updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed') {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      if (status === "completed") {
        this.state.learningHealth = Math.min(98, this.state.learningHealth + 2);
      }
      this.saveState();
    }
  }

  // Add custom task
  public addTask(title: string, subject: string, description: string, deadline: string, priority: 'HIGH' | 'MEDIUM' | 'LOW', estimatedMinutes: number) {
    this.state.tasks.unshift({
      id: "task-" + Date.now(),
      title,
      subject,
      description,
      deadline,
      priority,
      status: "pending",
      estimatedMinutes,
      source: "Personal",
    });
    this.saveState();
  }

  // Accessibility update
  public updateAccessibility(settings: Partial<AccessibilitySettings>) {
    this.state.accessibility = { ...this.state.accessibility, ...settings };
    this.saveState();

    // Apply high contrast class to body
    if (typeof document !== "undefined") {
      if (this.state.accessibility.highContrast) {
        document.documentElement.classList.add("high-contrast");
      } else {
        document.documentElement.classList.remove("high-contrast");
      }
    }
  }

  // Text to Speech
  public speakText(text: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (onEnd) {
      utterance.onend = onEnd;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  }

  public stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Reset demo state for fresh presentation
  public resetToDefaultDemo() {
    this.state = {
      ...INITIAL_STATE,
      classrooms: JSON.parse(JSON.stringify(DEMO_CLASSROOMS)),
      concepts: JSON.parse(JSON.stringify(DEMO_CONCEPTS)),
      recommendations: JSON.parse(JSON.stringify(DEMO_RECOMMENDATIONS)),
      tasks: JSON.parse(JSON.stringify(INITIAL_STATE.tasks)),
      extractedActions: JSON.parse(JSON.stringify(DEFAULT_EXTRACTED_ACTIONS)),
      learningEvents: JSON.parse(JSON.stringify(DEMO_LEARNING_EVENTS)),
      activeDemoStep: 1,
      currentRole: 'student',
    };
    this.saveState();
  }
}

export const synapseCore = new SynapseCoreService();
