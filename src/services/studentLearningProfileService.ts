import { supabase } from "@/integrations/supabase/client";

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
  id: string; // Authoritative primary key from public.concept_mastery or quiz_questions
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
 * Strict Concept Identity: Each record is identified by its authoritative database ID. No fuzzy/lowercase merging.
 */
export async function getStudentConceptMastery(studentId: string): Promise<StudentConceptMasteryRecord[]> {
  if (!studentId) return [];

  try {
    // 1. Resolve student's classroom and enrolled subjects from teaching assignments
    const { data: memberData } = await supabase
      .from("classroom_members")
      .select(`
        classroom:classrooms!classroom_members_classroom_id_fkey (
          id,
          name
        )
      `)
      .eq("student_id", studentId)
      .maybeSingle();

    const classroomId = (memberData?.classroom as any)?.id;
    let enrolledSubjectNames: string[] = [];

    if (classroomId) {
      const { data: teachingData } = await supabase
        .from("teaching_assignments")
        .select("subject_name")
        .eq("classroom_id", classroomId);

      if (teachingData && teachingData.length > 0) {
        enrolledSubjectNames = teachingData.map((t: any) => t.subject_name).filter(Boolean);
      }
    }

    // 2. Query authentic concept_mastery records for this student
    const { data: masteryRows } = await supabase
      .from("concept_mastery")
      .select("*")
      .eq("user_id", studentId)
      .order("mastery_percentage", { ascending: true });

    const records: StudentConceptMasteryRecord[] = [];
    const assessedConceptsExactNames = new Set<string>();

    if (masteryRows && masteryRows.length > 0) {
      masteryRows.forEach((cm: any) => {
        const sub = cm.subject || "Academic Curriculum";
        // If student has enrolled subjects, enforce subject scoping to prevent concept leaks
        if (enrolledSubjectNames.length > 0) {
          const isEnrolled = enrolledSubjectNames.some(
            (en) => en.toLowerCase() === sub.toLowerCase()
          );
          if (!isEnrolled) {
            return;
          }
        }

        const totalQ = cm.total_questions || 0;
        const correctQ = cm.correct_count || 0;
        const mastery = cm.mastery_percentage || 0;

        let status: "Mastered" | "Developing" | "Needs Review" | "Not Assessed" = "Developing";
        if (totalQ === 0) status = "Not Assessed";
        else if (mastery >= 80) status = "Mastered";
        else if (mastery < 60) status = "Needs Review";

        assessedConceptsExactNames.add(cm.concept_name);

        records.push({
          id: cm.id,
          conceptId: cm.id,
          conceptName: cm.concept_name,
          subject: sub,
          topic: cm.topic || "Core Topic",
          attempts: cm.attempts_count || 1,
          correctAnswers: correctQ,
          totalAnswers: totalQ,
          masteryPercentage: mastery,
          status,
          trend: cm.trend || "stable",
          lastAssessedAt: cm.last_assessed_at || null,
        });
      });
    }

    // 3. Query unassessed concepts belonging to the student's enrolled classroom quizzes
    if (classroomId) {
      const { data: quizQuestions } = await supabase
        .from("quiz_questions")
        .select(`
          id,
          concept,
          topic,
          quizzes!quiz_questions_quiz_id_fkey (
            subject,
            classroom_id
          )
        `)
        .eq("quizzes.classroom_id", classroomId);

      if (quizQuestions) {
        quizQuestions.forEach((qq: any) => {
          const con = qq.concept?.trim();
          const sub = qq.quizzes?.subject || "Curriculum";
          if (con && con !== "General" && !assessedConceptsExactNames.has(con)) {
            assessedConceptsExactNames.add(con);
            records.push({
              id: qq.id,
              conceptId: qq.id,
              conceptName: con,
              subject: sub,
              topic: qq.topic || "Curriculum Topic",
              attempts: 0,
              correctAnswers: 0,
              totalAnswers: 0,
              masteryPercentage: 0,
              status: "Not Assessed",
              trend: "stable",
              lastAssessedAt: null,
            });
          }
        });
      }
    }

    return records;
  } catch (err) {
    console.error("Error in getStudentConceptMastery:", err);
    return [];
  }
}

/**
 * Builds an authentic, deterministic learning profile from real Supabase records.
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
    // 1. Fetch Student Profile & Classroom Membership
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, roll_number, course, branch")
      .eq("id", studentId)
      .maybeSingle();

    if (!profile) return defaultProfile;

    const { data: memberData } = await supabase
      .from("classroom_members")
      .select(`
        classroom:classrooms!classroom_members_classroom_id_fkey (
          id,
          name,
          course,
          branch,
          year,
          section
        )
      `)
      .eq("student_id", studentId)
      .maybeSingle();

    const classroom = (memberData?.classroom as any) || null;
    const classroomId = classroom?.id || null;

    // 2. Fetch Enrolled Courses / Teaching Assignments for this classroom
    const enrolledCourses: StudentCourseInfo[] = [];
    if (classroomId) {
      const { data: teachingData } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          faculty:profiles!teaching_assignments_faculty_id_fkey (name)
        `)
        .eq("classroom_id", classroomId);

      if (teachingData) {
        teachingData.forEach((t: any) => {
          enrolledCourses.push({
            id: t.id,
            name: t.subject_name,
            code: t.subject_code || undefined,
            facultyName: t.faculty?.name || undefined,
          });
        });
      }
    }

    // 3. Fetch Real Quiz Attempts
    const { data: rawAttempts } = await supabase
      .from("quiz_attempts")
      .select(`
        id,
        score,
        max_score,
        percentage,
        completed_at,
        quizzes!quiz_attempts_quiz_id_fkey (
          id,
          title,
          subject,
          topic
        )
      `)
      .eq("user_id", studentId)
      .order("completed_at", { ascending: false });

    // 4. Fetch Assignments for the classroom and Submissions by the student
    let rawAssignments: any[] = [];
    let rawSubmissions: any[] = [];

    if (classroomId) {
      const [asgRes, subRes] = await Promise.all([
        supabase
          .from("assignments")
          .select("id, title, subject, topic, deadline, max_marks")
          .eq("classroom_id", classroomId)
          .order("deadline", { ascending: true }),
        supabase
          .from("assignment_submissions")
          .select("assignment_id, status, submitted_at, marks_obtained")
          .eq("user_id", studentId),
      ]);
      rawAssignments = asgRes.data || [];
      rawSubmissions = subRes.data || [];
    }

    // Process Quiz Performance by Course
    const courseQuizMap: Record<string, { totalPct: number; count: number }> = {};
    const recentPerfList: RecentPerformanceItem[] = [];
    let totalQuizSum = 0;
    let validQuizCount = 0;

    (rawAttempts || []).forEach((att: any) => {
      const subName = att.quizzes?.subject || "General Academic";
      const pct =
        att.percentage !== null && att.percentage !== undefined
          ? att.percentage
          : att.max_score > 0
          ? Math.round((att.score / att.max_score) * 100)
          : null;

      if (pct !== null) {
        if (!courseQuizMap[subName]) courseQuizMap[subName] = { totalPct: 0, count: 0 };
        courseQuizMap[subName].totalPct += pct;
        courseQuizMap[subName].count += 1;
        totalQuizSum += pct;
        validQuizCount += 1;

        if (recentPerfList.length < 5) {
          recentPerfList.push({
            id: `quiz-${att.id}`,
            type: "quiz",
            title: att.quizzes?.title || "Classroom Quiz",
            subject: subName,
            scorePercentage: pct,
            completedAt: att.completed_at || new Date().toISOString(),
          });
        }
      }
    });

    // 4. Use unified getStudentConceptMastery for 100% synchronized concept mastery signals
    const conceptRecords = await getStudentConceptMastery(studentId);
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

    // If no concept-level weak areas found, also check topic-level answers from quiz_attempt_answers
    const { data: rawAnswers } = await supabase
      .from("quiz_attempt_answers")
      .select("subject, topic, is_correct")
      .eq("student_id", studentId);

    const topicMap: Record<string, { subject: string; correct: number; total: number }> = {};
    (rawAnswers || []).forEach((ans: any) => {
      const sub = ans.subject || "Subject";
      const top = ans.topic || "Topic";
      const topKey = `${sub}:::${top}`;
      if (!topicMap[topKey]) topicMap[topKey] = { subject: sub, correct: 0, total: 0 };
      topicMap[topKey].total += 1;
      if (ans.is_correct) topicMap[topKey].correct += 1;
    });

    Object.entries(topicMap).forEach(([key, val]) => {
      const [, top] = key.split(":::");
      if (val.total >= MIN_QUESTIONS_FOR_SIGNAL) {
        const acc = Math.round((val.correct / val.total) * 100);
        const alreadyCoveredInConcept = weakAreas.some(
          (w) => w.subject === val.subject && w.topic === top
        );
        if (acc < WEAK_ACCURACY_THRESHOLD && !alreadyCoveredInConcept) {
          weakAreas.push({
            subject: val.subject,
            topic: top,
            accuracy: acc,
            totalQuestions: val.total,
            correctCount: val.correct,
            evidence: `${val.correct}/${val.total} correct (${acc}%) in ${top}`,
          });
        }
      }
    });

    // Sort weak areas lowest accuracy first
    weakAreas.sort((a, b) => a.accuracy - b.accuracy);
    // Sort strong areas highest accuracy first
    strongAreas.sort((a, b) => b.accuracy - a.accuracy);

    // Process Assignments & Upcoming Deadlines
    const submissionMap = new Map<string, any>();
    (rawSubmissions || []).forEach(sub => submissionMap.set(sub.assignment_id, sub));

    const courseAsgMap: Record<string, { totalMarksAwarded: number; totalMaxMarks: number; totalCount: number; submittedCount: number }> = {};
    const upcomingAssignments: UpcomingAssignmentInfo[] = [];
    const now = Date.now();

    rawAssignments.forEach((asg: any) => {
      const subName = asg.subject || "Academic Assignment";
      if (!courseAsgMap[subName]) {
        courseAsgMap[subName] = { totalMarksAwarded: 0, totalMaxMarks: 0, totalCount: 0, submittedCount: 0 };
      }
      courseAsgMap[subName].totalCount += 1;

      const userSub = submissionMap.get(asg.id);
      const isSubmitted = !!userSub && (userSub.status === "submitted" || userSub.status === "graded");

      if (isSubmitted) {
        courseAsgMap[subName].submittedCount += 1;
        if (userSub.marks_obtained !== null && userSub.marks_obtained !== undefined && asg.max_marks > 0) {
          courseAsgMap[subName].totalMarksAwarded += userSub.marks_obtained;
          courseAsgMap[subName].totalMaxMarks += asg.max_marks;
        }
      } else if (asg.deadline) {
        const deadlineMs = new Date(asg.deadline).getTime();
        const diffHours = (deadlineMs - now) / (1000 * 60 * 60);

        if (diffHours > 0) {
          const daysRemaining = Math.max(0, Math.ceil(diffHours / 24));
          upcomingAssignments.push({
            id: asg.id,
            title: asg.title,
            subject: subName,
            topic: asg.topic || null,
            deadline: asg.deadline,
            daysRemaining,
            isUrgent: diffHours <= 48,
          });
        }
      }
    });

    // Sort upcoming assignments by nearest deadline first
    upcomingAssignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    // Consolidate Performance by Course
    // Merge known enrolledCourses with courses that appear in quizzes or assignments
    const allCourseNames = new Set<string>();
    enrolledCourses.forEach(c => allCourseNames.add(c.name));
    Object.keys(courseQuizMap).forEach(n => allCourseNames.add(n));
    Object.keys(courseAsgMap).forEach(n => allCourseNames.add(n));

    const performanceByCourse: CoursePerformance[] = Array.from(allCourseNames).map(cName => {
      const qStats = courseQuizMap[cName];
      const aStats = courseAsgMap[cName];
      const matchedEnrolled = enrolledCourses.find(c => c.name.toLowerCase() === cName.toLowerCase());

      const quizAvg = qStats && qStats.count > 0 ? Math.round(qStats.totalPct / qStats.count) : null;
      const asgAvg =
        aStats && aStats.totalMaxMarks > 0
          ? Math.round((aStats.totalMarksAwarded / aStats.totalMaxMarks) * 100)
          : null;

      return {
        courseName: cName,
        courseCode: matchedEnrolled?.code,
        quizAverage: quizAvg,
        quizAttemptsCount: qStats?.count || 0,
        assignmentAverage: asgAvg,
        assignmentCount: aStats?.totalCount || 0,
        submittedCount: aStats?.submittedCount || 0,
      };
    });

    const overallQuizAvg = validQuizCount > 0 ? Math.round(totalQuizSum / validQuizCount) : null;
    const hasSufficientData = validQuizCount > 0 || weakAreas.length > 0 || (rawSubmissions && rawSubmissions.length > 0);

    return {
      studentId: profile.id,
      studentName: profile.name || "Student",
      rollNumber: profile.roll_number || "",
      classroomName: classroom?.name || "",
      course: profile.course || classroom?.course || "",
      branch: profile.branch || classroom?.branch || "",
      courses: enrolledCourses.length > 0
        ? enrolledCourses
        : Array.from(allCourseNames).map(name => ({ id: name, name })),
      performanceByCourse,
      weakAreas,
      strongAreas,
      recentPerformance: recentPerfList,
      upcomingAssignments,
      overallQuizAverage: overallQuizAvg,
      hasSufficientData,
    };
  } catch (err) {
    console.error("Error building student learning profile:", err);
    return defaultProfile;
  }
}

/**
 * Produces honest, calculated insight banner copy.
 * Never shows fake percentages or uncalculated data.
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
  const relevantWeak = profile.weakAreas.find(w =>
    isAllCourses || w.subject.toLowerCase().includes(activeCourseName.toLowerCase()) || activeCourseName.toLowerCase().includes(w.subject.toLowerCase())
  );

  // Check upcoming assignments matching course context
  const relevantAsg = profile.upcomingAssignments.find(a =>
    isAllCourses || a.subject.toLowerCase().includes(activeCourseName.toLowerCase()) || activeCourseName.toLowerCase().includes(a.subject.toLowerCase())
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
    const coursePerf = profile.performanceByCourse.find(p =>
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
  const relevantStrong = profile.strongAreas.find(s =>
    isAllCourses || s.subject.toLowerCase().includes(activeCourseName.toLowerCase())
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
    : profile.courses.filter(c => c.name.toLowerCase() === activeCourseName.toLowerCase());

  const activeCourseLabel = !isAllCourses && targetCourses.length > 0 ? targetCourses[0].name : null;

  // 1. Weak Areas (Highest Priority)
  const matchingWeak = profile.weakAreas.filter(w =>
    isAllCourses || w.subject.toLowerCase().includes(activeCourseName.toLowerCase()) || activeCourseName.toLowerCase().includes(w.subject.toLowerCase())
  );

  if (matchingWeak.length > 0) {
    const primaryGap = matchingWeak[0];
    const conceptName = primaryGap.concept || primaryGap.topic;
    recommendations.push(`Explain ${conceptName} with a simple real-world example`);
    recommendations.push(`Give me practice questions on ${conceptName}`);
    if (matchingWeak.length > 1) {
      const secondGap = matchingWeak[1];
      recommendations.push(`Help me understand why I had difficulty with ${secondGap.concept || secondGap.topic}`);
    } else {
      recommendations.push(`Help me revise key concepts from ${primaryGap.subject}`);
    }
  }

  // 2. Upcoming Assignments
  const matchingAsg = profile.upcomingAssignments.filter(a =>
    isAllCourses || a.subject.toLowerCase().includes(activeCourseName.toLowerCase()) || activeCourseName.toLowerCase().includes(a.subject.toLowerCase())
  );

  if (matchingAsg.length > 0 && recommendations.length < 4) {
    const topAsg = matchingAsg[0];
    if (topAsg.topic) {
      recommendations.push(`Explain the core topics covered in my ${topAsg.subject} assignment (${topAsg.topic})`);
    } else {
      recommendations.push(`Help me prepare for my upcoming ${topAsg.subject} assignment: ${topAsg.title}`);
    }
  }

  // 3. Lower Performing Course
  if (recommendations.length < 4) {
    const lowerCourse = profile.performanceByCourse
      .filter(p => isAllCourses || p.courseName.toLowerCase().includes(activeCourseName.toLowerCase()))
      .find(p => p.quizAverage !== null && p.quizAverage < WEAK_ACCURACY_THRESHOLD);

    if (lowerCourse) {
      recommendations.push(`Help me revise my weak areas in ${lowerCourse.courseName}`);
    }
  }

  // 4. Strong Areas (Advanced challenge questions)
  if (recommendations.length < 4) {
    const matchingStrong = profile.strongAreas.filter(s =>
      isAllCourses || s.subject.toLowerCase().includes(activeCourseName.toLowerCase())
    );
    if (matchingStrong.length > 0) {
      const strong = matchingStrong[0];
      recommendations.push(`Give me an advanced challenge problem on ${strong.concept || strong.topic}`);
    }
  }

  // 5. Fill with genuine enrolled course prompts
  if (recommendations.length < 4) {
    const coursesToUse = targetCourses.length > 0 ? targetCourses : profile.courses;
    coursesToUse.forEach(c => {
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
    activeCourseLabel ? `Explain the syllabus overview for ${activeCourseLabel}` : "Ask me to explain any concept from your courses",
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
