import api from "@/lib/apiClient";

export interface StudentCourseInfo {
  id: string;
  name: string;
  code?: string;
  facultyName?: string;
}

export interface CoursePerformance {
  courseName: string;
  courseCode?: string;
  quizAverage: number | null; // percentage or null if 0 attempts
  quizAttemptsCount: number;
  assignmentAverage: number | null; // percentage or null if 0 graded submissions
  assignmentCount: number;
  submittedCount: number;
}

export interface StudentConceptMasteryRecord {
  id: string; // Authoritative primary key from database
  conceptId: string;
  conceptName: string;
  subject: string;
  topic: string;
  attempts: number;
  correctAnswers: number;
  totalAnswers: number;
  masteryPercentage: number;
  status: "Mastered" | "Developing" | "Needs Review" | "Not Assessed";
  trend: "improving" | "declining" | "stable";
  lastAssessedAt: string | null;
}

export interface StudentWeakArea {
  conceptId?: string;
  subject: string;
  topic: string;
  concept?: string;
  accuracy: number; // percentage (0-100) calculated from real attempts
  totalQuestions: number;
  correctCount: number;
  evidence: string;
}

export interface StudentStrongArea {
  conceptId?: string;
  subject: string;
  topic: string;
  concept?: string;
  accuracy: number; // percentage (0-100)
  totalQuestions: number;
  correctCount: number;
}

export interface UpcomingAssignmentInfo {
  id: string;
  title: string;
  subject: string;
  topic?: string | null;
  deadline: string;
  daysRemaining: number;
  isUrgent: boolean; // due within 48 hours
}

export interface RecentPerformanceItem {
  id: string;
  type: "quiz" | "assignment";
  title: string;
  subject: string;
  scorePercentage: number;
  completedAt: string;
}

export interface StudentLearningProfile {
  studentId: string;
  studentName: string;
  rollNumber: string;
  classroomName: string;
  course: string;
  branch: string;
  courses: StudentCourseInfo[];
  performanceByCourse: CoursePerformance[];
  weakAreas: StudentWeakArea[];
  strongAreas: StudentStrongArea[];
  recentPerformance: RecentPerformanceItem[];
  upcomingAssignments: UpcomingAssignmentInfo[];
  overallQuizAverage: number | null;
  hasSufficientData: boolean;
}

export const WEAK_ACCURACY_THRESHOLD = 65; // < 65% is considered a gap if tested
export const STRONG_ACCURACY_THRESHOLD = 80; // >= 80% is considered strong if tested
export const MIN_QUESTIONS_FOR_SIGNAL = 2; // Requires at least 2 questions to establish signal

/**
 * Resolves the student's authentic concept mastery list scoped strictly to their enrolled courses/curriculum.
 */
export async function getStudentConceptMastery(studentId: string): Promise<StudentConceptMasteryRecord[]> {
  if (!studentId) return [];

  try {
    const data = await api.get<any[]>(`/analytics/concept-mastery/${studentId}`);
    if (!data || !Array.isArray(data)) return [];

    return data.map((cm: any) => ({
      id: cm.id || cm._id,
      conceptId: cm.conceptId || cm.id || cm._id,
      conceptName: cm.conceptName || cm.concept_name,
      subject: cm.subject || "Academic Curriculum",
      topic: cm.topic || "Core Topic",
      attempts: cm.attempts || cm.attempts_count || 1,
      correctAnswers: cm.correctAnswers || cm.correct_answers || 0,
      totalAnswers: cm.totalAnswers || cm.total_answers || 0,
      masteryPercentage: cm.masteryPercentage || cm.mastery_percentage || 0,
      status: cm.status || "Developing",
      trend: cm.trend || "stable",
      lastAssessedAt: cm.lastAssessedAt || cm.last_assessed_at || null,
    }));
  } catch (err) {
    console.error("Error fetching student concept mastery:", err);
    return [];
  }
}

/**
 * Builds the comprehensive Student Learning Profile from authentic backend metrics.
 */
export async function buildStudentLearningProfile(studentId: string): Promise<StudentLearningProfile> {
  const defaultProfile: StudentLearningProfile = {
    studentId,
    studentName: "Student",
    rollNumber: "",
    classroomName: "",
    course: "",
    branch: "",
    courses: [],
    performanceByCourse: [],
    weakAreas: [],
    strongAreas: [],
    recentPerformance: [],
    upcomingAssignments: [],
    overallQuizAverage: null,
    hasSufficientData: false,
  };

  if (!studentId) return defaultProfile;

  try {
    const [analytics, conceptRecords] = await Promise.all([
      api.get<any>("/analytics/student/home"),
      getStudentConceptMastery(studentId),
    ]);

    const ctx = analytics?.context;
    const qz = analytics?.quizzes;
    const asgn = analytics?.assignments;

    const weakAreas: StudentWeakArea[] = [];
    const strongAreas: StudentStrongArea[] = [];

    conceptRecords.forEach((cr) => {
      if (cr.totalAnswers >= MIN_QUESTIONS_FOR_SIGNAL) {
        if (cr.masteryPercentage < WEAK_ACCURACY_THRESHOLD) {
          weakAreas.push({
            conceptId: cr.conceptId,
            subject: cr.subject,
            topic: cr.topic,
            concept: cr.conceptName,
            accuracy: cr.masteryPercentage,
            totalQuestions: cr.totalAnswers,
            correctCount: cr.correctAnswers,
            evidence: `${cr.correctAnswers}/${cr.totalAnswers} correct (${cr.masteryPercentage}%) in ${cr.conceptName}`,
          });
        } else if (cr.masteryPercentage >= STRONG_ACCURACY_THRESHOLD) {
          strongAreas.push({
            conceptId: cr.conceptId,
            subject: cr.subject,
            topic: cr.topic,
            concept: cr.conceptName,
            accuracy: cr.masteryPercentage,
            totalQuestions: cr.totalAnswers,
            correctCount: cr.correctAnswers,
          });
        }
      }
    });

    const enrolledCourses: StudentCourseInfo[] = (ctx?.subjects || []).map((s: any) => ({
      id: s.id,
      name: s.subjectName,
      code: s.subjectCode,
      facultyName: s.facultyName,
    }));

    const recentPerformance: RecentPerformanceItem[] = (qz?.recentAttempts || []).map((a: any) => ({
      id: `quiz-${a.id}`,
      type: "quiz" as const,
      title: a.quizTitle,
      subject: "Quiz",
      scorePercentage: a.percentage,
      completedAt: a.completedAt || new Date().toISOString(),
    }));

    const now = Date.now();
    const upcomingAssignments: UpcomingAssignmentInfo[] = (asgn?.recentAssignments || [])
      .filter((a: any) => a.status === "pending" && a.deadline)
      .map((a: any) => {
        const deadlineMs = new Date(a.deadline).getTime();
        const diffHours = (deadlineMs - now) / (1000 * 60 * 60);
        return {
          id: a.id,
          title: a.title,
          subject: "Coursework",
          topic: null,
          deadline: a.deadline,
          daysRemaining: Math.max(0, Math.ceil(diffHours / 24)),
          isUrgent: diffHours <= 48,
        };
      });

    const performanceByCourse: CoursePerformance[] = enrolledCourses.map((c) => ({
      courseName: c.name,
      courseCode: c.code,
      quizAverage: qz?.averageScore ?? null,
      quizAttemptsCount: qz?.totalAttempts ?? 0,
      assignmentAverage: asgn?.submissionRate ?? null,
      assignmentCount: asgn?.totalAssigned ?? 0,
      submittedCount: asgn?.submitted ?? 0,
    }));

    const hasSufficientData = (qz?.totalAttempts ?? 0) > 0 || weakAreas.length > 0 || (asgn?.submitted ?? 0) > 0;

    return {
      studentId,
      studentName: ctx?.studentName || "Student",
      rollNumber: ctx?.rollNumber || "",
      classroomName: ctx?.classroomName || "",
      course: ctx?.course || "",
      branch: ctx?.branch || "",
      courses: enrolledCourses,
      performanceByCourse,
      weakAreas,
      strongAreas,
      recentPerformance,
      upcomingAssignments,
      overallQuizAverage: qz?.averageScore ?? null,
      hasSufficientData,
    };
  } catch (err) {
    console.error("Error building student learning profile:", err);
    return defaultProfile;
  }
}

/**
 * Produces honest, calculated insight banner copy.
 */
export function getKnowledgeStateSummary(
  profile: StudentLearningProfile,
  activeCourseName?: string
): { title: string; detail: string; hasData: boolean } {
  if (!profile.hasSufficientData) {
    return {
      title: "Learning Insight",
      detail: "Complete a few quizzes and assignments to build your personalized learning profile.",
      hasData: false,
    };
  }

  const isAllCourses = !activeCourseName || activeCourseName === "All Courses";

  // Check weak areas matching course context
  const relevantWeak = profile.weakAreas.find(
    (w) =>
      isAllCourses ||
      w.subject.toLowerCase().includes(activeCourseName.toLowerCase()) ||
      activeCourseName.toLowerCase().includes(w.subject.toLowerCase())
  );

  // Check upcoming assignments matching course context
  const relevantAsg = profile.upcomingAssignments.find(
    (a) =>
      isAllCourses ||
      a.subject.toLowerCase().includes(activeCourseName.toLowerCase()) ||
      activeCourseName.toLowerCase().includes(a.subject.toLowerCase())
  );

  if (relevantWeak) {
    const conceptOrTopic = relevantWeak.concept || relevantWeak.topic;
    let detail = `${conceptOrTopic} is an area to review (${relevantWeak.accuracy}% accuracy)`;

    if (relevantAsg) {
      const daysText =
        relevantAsg.daysRemaining === 0
          ? "due today"
          : relevantAsg.daysRemaining === 1
          ? "due tomorrow"
          : `due in ${relevantAsg.daysRemaining} days`;
      detail += ` • Next assignment "${relevantAsg.title}" ${daysText}`;
    } else if (profile.upcomingAssignments.length > 0) {
      const generalAsg = profile.upcomingAssignments[0];
      const daysText =
        generalAsg.daysRemaining <= 1 ? "due tomorrow" : `due in ${generalAsg.daysRemaining} days`;
      detail += ` • ${generalAsg.subject} task ${daysText}`;
    }

    return {
      title: "Learning Insight",
      detail,
      hasData: true,
    };
  }

  // If no weak area in active course, check if course has low performance
  if (!isAllCourses) {
    const coursePerf = profile.performanceByCourse.find((p) =>
      p.courseName.toLowerCase().includes(activeCourseName.toLowerCase())
    );
    if (coursePerf && coursePerf.quizAverage !== null && coursePerf.quizAverage < WEAK_ACCURACY_THRESHOLD) {
      return {
        title: "Learning Insight",
        detail: `Reviewing fundamental concepts in ${coursePerf.courseName} (${coursePerf.quizAverage}% quiz average) will help solidify your understanding.`,
        hasData: true,
      };
    }
  }

  // If strong area exists and on track
  const relevantStrong = profile.strongAreas.find(
    (s) => isAllCourses || s.subject.toLowerCase().includes(activeCourseName.toLowerCase())
  );

  if (relevantStrong) {
    const conceptOrTopic = relevantStrong.concept || relevantStrong.topic;
    let detail = `Solid mastery in ${conceptOrTopic} (${relevantStrong.accuracy}%)`;
    if (relevantAsg) {
      detail += ` • Upcoming: ${relevantAsg.title} (${relevantAsg.daysRemaining} days remaining)`;
    }
    return {
      title: "Learning Insight",
      detail,
      hasData: true,
    };
  }

  // If an upcoming assignment exists
  if (relevantAsg) {
    const daysText =
      relevantAsg.daysRemaining === 0
        ? "due today"
        : relevantAsg.daysRemaining === 1
        ? "due tomorrow"
        : `due in ${relevantAsg.daysRemaining} days`;
    return {
      title: "Learning Insight",
      detail: `Next ${relevantAsg.subject} assignment "${relevantAsg.title}" is ${daysText} • Prepare key concepts early.`,
      hasData: true,
    };
  }

  return {
    title: "Learning Insight",
    detail: "Academic progress is tracked and on schedule. Ask questions about your courses anytime.",
    hasData: true,
  };
}

/**
 * Deterministically generates context-aware tutor recommendations from real data.
 * Zero Gemini tokens required for UI chips.
 */
export function generateTutorRecommendations(
  profile: StudentLearningProfile,
  activeCourseName?: string
): string[] {
  const recommendations: string[] = [];
  const isAllCourses = !activeCourseName || activeCourseName === "All Courses";

  const targetCourses = isAllCourses
    ? profile.courses
    : profile.courses.filter(
        (c) => c.name.toLowerCase() === activeCourseName.toLowerCase()
      );

  const activeCourseLabel =
    !isAllCourses && targetCourses.length > 0 ? targetCourses[0].name : null;

  // 1. Weak Areas (Highest Priority)
  const matchingWeak = profile.weakAreas.filter(
    (w) =>
      isAllCourses ||
      w.subject.toLowerCase().includes(activeCourseName.toLowerCase()) ||
      activeCourseName.toLowerCase().includes(w.subject.toLowerCase())
  );

  if (matchingWeak.length > 0) {
    const primaryGap = matchingWeak[0];
    const conceptName = primaryGap.concept || primaryGap.topic;
    recommendations.push(`Explain ${conceptName} with a simple real-world example`);
    recommendations.push(`Give me practice questions on ${conceptName}`);
    if (matchingWeak.length > 1) {
      const secondGap = matchingWeak[1];
      recommendations.push(
        `Help me understand why I had difficulty with ${
          secondGap.concept || secondGap.topic
        }`
      );
    } else {
      recommendations.push(`Help me revise key concepts from ${primaryGap.subject}`);
    }
  }

  // 2. Upcoming Assignments
  const matchingAsg = profile.upcomingAssignments.filter(
    (a) =>
      isAllCourses ||
      a.subject.toLowerCase().includes(activeCourseName.toLowerCase()) ||
      activeCourseName.toLowerCase().includes(a.subject.toLowerCase())
  );

  if (matchingAsg.length > 0 && recommendations.length < 4) {
    const topAsg = matchingAsg[0];
    if (topAsg.topic) {
      recommendations.push(
        `Explain the core topics covered in my ${topAsg.subject} assignment (${topAsg.topic})`
      );
    } else {
      recommendations.push(
        `Help me prepare for my upcoming ${topAsg.subject} assignment: ${topAsg.title}`
      );
    }
  }

  // 3. Lower Performing Course
  if (recommendations.length < 4) {
    const lowerCourse = profile.performanceByCourse
      .filter(
        (p) =>
          isAllCourses ||
          p.courseName.toLowerCase().includes(activeCourseName.toLowerCase())
      )
      .find((p) => p.quizAverage !== null && p.quizAverage < WEAK_ACCURACY_THRESHOLD);

    if (lowerCourse) {
      recommendations.push(
        `Help me revise my weak areas in ${lowerCourse.courseName}`
      );
    }
  }

  // 4. Strong Areas (Advanced challenge questions)
  if (recommendations.length < 4) {
    const matchingStrong = profile.strongAreas.filter(
      (s) =>
        isAllCourses ||
        s.subject.toLowerCase().includes(activeCourseName.toLowerCase())
    );
    if (matchingStrong.length > 0) {
      const strong = matchingStrong[0];
      recommendations.push(
        `Give me an advanced challenge problem on ${strong.concept || strong.topic}`
      );
    }
  }

  // 5. Fill with genuine enrolled course prompts
  if (recommendations.length < 4) {
    const coursesToUse = targetCourses.length > 0 ? targetCourses : profile.courses;
    coursesToUse.forEach((c) => {
      if (recommendations.length < 4) {
        const prompt = `Explain a fundamental concept from ${c.name}`;
        if (!recommendations.includes(prompt)) recommendations.push(prompt);
      }
      if (recommendations.length < 4) {
        const prompt = `Give me practice questions for ${c.name}`;
        if (!recommendations.includes(prompt)) recommendations.push(prompt);
      }
    });
  }

  // 6. Safe fallbacks if student has no data and no enrolled courses yet
  const genericCourseAwareFallbacks = [
    activeCourseLabel
      ? `Explain the syllabus overview for ${activeCourseLabel}`
      : "Ask me to explain any concept from your courses",
    "Create a 30-minute revision study plan for today",
    "Help me prepare for upcoming academic assessments",
    "Give me diagnostic practice questions to evaluate my foundation",
  ];

  for (const fallback of genericCourseAwareFallbacks) {
    if (recommendations.length >= 4) break;
    if (!recommendations.includes(fallback)) {
      recommendations.push(fallback);
    }
  }

  return recommendations.slice(0, 4);
}
