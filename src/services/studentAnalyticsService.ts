import { supabase } from "@/integrations/supabase/client";

export interface StudentAcademicContext {
  studentId: string;
  studentName: string;
  rollNumber: string;
  email: string;
  classroomId: string;
  classroomName: string;
  course: string;
  branch: string;
  year: number;
  section: string;
  academicYear: string;
  subjects: {
    id: string;
    subjectName: string;
    subjectCode: string;
    facultyName: string;
  }[];
}

export interface AttendanceMetrics {
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  overallAttendancePercentage: number | null; // null if 0 sessions
  subjectAttendance: {
    subjectName: string;
    total: number;
    present: number;
    percentage: number;
  }[];
  recentMissedClass: {
    sessionId: string;
    date: string;
    subjectName: string;
    topic: string;
    conceptsTaught: string[];
    hasFacultyLecture: boolean;
    facultyLectureId?: string;
    facultyLectureTitle?: string;
    facultyLectureVideoId?: string;
  } | null;
}

export interface ConceptMasteryData {
  id: string;
  conceptId: string;
  conceptName: string;
  subject: string;
  topic: string;
  masteryPercentage: number;
  status: "Mastered" | "Developing" | "Needs Review" | "Not Assessed";
  trend: "improving" | "declining" | "stable";
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  lastAssessedAt: string;
}

export interface LearningGapItem {
  conceptName: string;
  subject: string;
  topic: string;
  masteryPercentage: number;
  totalQuestions: number;
  correctCount: number;
  reason: string;
}

export interface QuizMetrics {
  totalAttempts: number;
  averageScorePercentage: number | null; // null if 0 attempts
  subjectScores: {
    subjectName: string;
    averagePercentage: number;
    attemptsCount: number;
  }[];
  topicMastery: {
    subjectName: string;
    topic: string;
    accuracyPercentage: number;
    totalQuestions: number;
  }[];
  conceptMasteryList: ConceptMasteryData[];
  learningGaps: LearningGapItem[];
}

export interface AssignmentMetrics {
  totalAssignments: number;
  pendingCount: number;
  submittedCount: number;
  overdueCount: number;
  urgentCount: number; // due in < 48 hours
  nextDueAssignment: {
    id: string;
    title: string;
    subject: string;
    topic?: string | null;
    deadline: string;
    maxMarks: number;
    isUrgent: boolean;
  } | null;
  assignmentsList: {
    id: string;
    title: string;
    subject: string;
    topic?: string | null;
    deadline: string;
    maxMarks: number;
    status: "pending" | "submitted" | "overdue";
    submittedAt?: string | null;
    marksObtained?: number | null;
  }[];
}

export interface StudentPriorityAction {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "ASSIGNMENT" | "MISSED_CLASS" | "LEARNING_GAP" | "LECTURE" | "QUIZ";
  subject: string;
  title: string;
  reason: string;
  actionLabel: string;
  actionUrl: string;
  dueDate?: string;
  estimatedMinutes: number;
  whyDetails: {
    signals: string[];
    riskFactor: string;
    projectedGain: string;
  };
}

export interface RecentActivityItem {
  id: string;
  type: "QUIZ_COMPLETED" | "ASSIGNMENT_SUBMITTED" | "CLASS_ATTENDED" | "CLASS_MISSED" | "LECTURE_VIEWED";
  title: string;
  subject: string;
  description: string;
  timestamp: string;
  scoreOrStatus?: string;
}

export interface StudentHomeAnalytics {
  context: StudentAcademicContext | null;
  learningHealth: number | null; // null if no learning signals yet
  healthStatus: "Optimal" | "On Track" | "Needs Attention" | "Insufficient Data";
  attendance: AttendanceMetrics;
  quizzes: QuizMetrics;
  assignments: AssignmentMetrics;
  priorities: StudentPriorityAction[];
  recentActivity: RecentActivityItem[];
}

// Configurable threshold: A concept is a genuine learning gap if accuracy < 65% across at least 2 questions
export const GAP_ACCURACY_THRESHOLD = 65;
export const GAP_MIN_QUESTIONS = 2;

class StudentAnalyticsService {
  /**
   * Resolves the student profile, classroom cohort, and enrolled subjects
   */
  public async getStudentAcademicContext(studentId: string): Promise<StudentAcademicContext | null> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, roll_number, email")
        .eq("id", studentId)
        .maybeSingle();

      if (!profile) return null;

      const { data: memberData } = await supabase
        .from("classroom_members")
        .select(`
          classroom:classrooms!classroom_members_classroom_id_fkey (
            id,
            name,
            course,
            branch,
            year,
            section,
            academic_year
          )
        `)
        .eq("student_id", studentId)
        .maybeSingle();

      const classroom = (memberData?.classroom as any) || null;
      let subjects: { id: string; subjectName: string; subjectCode: string; facultyName: string }[] = [];

      if (classroom?.id) {
        const { data: teachingData } = await supabase
          .from("teaching_assignments")
          .select(`
            id,
            subject_name,
            subject_code,
            faculty:profiles!teaching_assignments_faculty_id_fkey (name)
          `)
          .eq("classroom_id", classroom.id);

        if (teachingData) {
          subjects = teachingData.map((t: any) => ({
            id: t.id,
            subjectName: t.subject_name,
            subjectCode: t.subject_code,
            facultyName: t.faculty?.name || "Faculty",
          }));
        }
      }

      return {
        studentId: profile.id,
        studentName: profile.name,
        rollNumber: profile.roll_number || "",
        email: profile.email || "",
        classroomId: classroom?.id || "",
        classroomName: classroom?.name || "Enrolled Classroom",
        course: classroom?.course || "B.Tech",
        branch: classroom?.branch || "CSE",
        year: classroom?.year || 1,
        section: classroom?.section || "A",
        academicYear: classroom?.academic_year || "2026-27",
        subjects,
      };
    } catch (err) {
      console.error("Error fetching student academic context:", err);
      return null;
    }
  }

  /**
   * Computes authentic attendance metrics from attendance_records and class_sessions
   */
  public async getStudentAttendanceMetrics(
    studentId: string,
    classroomId?: string
  ): Promise<AttendanceMetrics> {
    const defaultResult: AttendanceMetrics = {
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      overallAttendancePercentage: null,
      subjectAttendance: [],
      recentMissedClass: null,
    };

    try {
      const { data: records } = await supabase
        .from("attendance_records")
        .select(`
          id,
          status,
          created_at,
          class_sessions!attendance_records_session_id_fkey (
            id,
            date,
            topic,
            teaching_assignment_id,
            teaching_assignments!class_sessions_teaching_assignment_id_fkey (
              id,
              subject_name,
              classroom_id
            )
          )
        `)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (!records || records.length === 0) {
        return defaultResult;
      }

      let totalSessions = 0;
      let presentSessions = 0;
      let absentSessions = 0;

      const subjectMap: Record<string, { total: number; present: number }> = {};
      let mostRecentAbsent: any = null;

      for (const r of records as any[]) {
        const session = r.class_sessions;
        const ta = session?.teaching_assignments;
        const subName = ta?.subject_name || "General Subject";

        // If classroomId provided, filter by student's classroom
        if (classroomId && ta?.classroom_id && ta.classroom_id !== classroomId) {
          continue;
        }

        totalSessions += 1;
        if (r.status === "present" || r.status === "late") {
          presentSessions += 1;
        } else if (r.status === "absent") {
          absentSessions += 1;
          if (!mostRecentAbsent) {
            mostRecentAbsent = { ...r, session, subjectName: subName };
          }
        }

        if (!subjectMap[subName]) subjectMap[subName] = { total: 0, present: 0 };
        subjectMap[subName].total += 1;
        if (r.status === "present" || r.status === "late") {
          subjectMap[subName].present += 1;
        }
      }

      if (totalSessions === 0) return defaultResult;

      const overallPct = Math.round((presentSessions / totalSessions) * 100);
      const subjectAttendance = Object.entries(subjectMap).map(([name, val]) => ({
        subjectName: name,
        total: val.total,
        present: val.present,
        percentage: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
      }));

      // Check if a faculty lecture exists for the most recent missed class
      let recentMissedClass = null;
      if (mostRecentAbsent && mostRecentAbsent.session) {
        const s = mostRecentAbsent.session;
        const subName = mostRecentAbsent.subjectName;

        // Check session concepts
        const { data: scRows } = await supabase
          .from("session_concepts")
          .select("concept_name")
          .eq("session_id", s.id);

        const conceptsTaught = (scRows || []).map((sc: any) => sc.concept_name).filter(Boolean);

        // Check for matching faculty lecture in this classroom for this topic
        let hasFacultyLecture = false;
        let facultyLectureId: string | undefined;
        let facultyLectureTitle: string | undefined;
        let facultyLectureVideoId: string | undefined;

        if (s.teaching_assignment_id && s.topic) {
          const { data: lec } = await supabase
            .from("lectures")
            .select("id, title, youtube_video_id")
            .eq("teaching_assignment_id", s.teaching_assignment_id)
            .ilike("topic", `%${s.topic.trim()}%`)
            .eq("status", "PUBLISHED")
            .limit(1)
            .maybeSingle();

          if (lec) {
            hasFacultyLecture = true;
            facultyLectureId = lec.id;
            facultyLectureTitle = lec.title;
            facultyLectureVideoId = lec.youtube_video_id;
          }
        }

        recentMissedClass = {
          sessionId: s.id,
          date: s.date,
          subjectName: subName,
          topic: s.topic,
          conceptsTaught,
          hasFacultyLecture,
          facultyLectureId,
          facultyLectureTitle,
          facultyLectureVideoId,
        };
      }

      return {
        totalSessions,
        presentSessions,
        absentSessions,
        overallAttendancePercentage: overallPct,
        subjectAttendance,
        recentMissedClass,
      };
    } catch (err) {
      console.error("Error computing student attendance metrics:", err);
      return defaultResult;
    }
  }

  /**
   * Computes authentic quiz, topic, and concept metrics from real database records
   */
  public async getStudentQuizMetrics(studentId: string): Promise<QuizMetrics> {
    const defaultResult: QuizMetrics = {
      totalAttempts: 0,
      averageScorePercentage: null,
      subjectScores: [],
      topicMastery: [],
      conceptMasteryList: [],
      learningGaps: [],
    };

    try {
      // 1. Fetch real quiz attempts
      const { data: attempts } = await supabase
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

      let totalAttempts = 0;
      let averageScorePercentage: number | null = null;
      const subjectAttemptsMap: Record<string, { totalPct: number; count: number }> = {};

      if (attempts && attempts.length > 0) {
        totalAttempts = attempts.length;
        let sumPct = 0;

        attempts.forEach((a: any) => {
          const pct = a.percentage !== null && a.percentage !== undefined
            ? a.percentage
            : a.max_score > 0
            ? Math.round((a.score / a.max_score) * 100)
            : 0;

          sumPct += pct;
          const sub = a.quizzes?.subject || "General";
          if (!subjectAttemptsMap[sub]) subjectAttemptsMap[sub] = { totalPct: 0, count: 0 };
          subjectAttemptsMap[sub].totalPct += pct;
          subjectAttemptsMap[sub].count += 1;
        });

        averageScorePercentage = Math.round(sumPct / totalAttempts);
      }

      const subjectScores = Object.entries(subjectAttemptsMap).map(([sub, val]) => ({
        subjectName: sub,
        averagePercentage: Math.round(val.totalPct / val.count),
        attemptsCount: val.count,
      }));

      // 2. Fetch real concept mastery records
      const { data: masteryRows } = await supabase
        .from("concept_mastery")
        .select("*")
        .eq("user_id", studentId)
        .order("mastery_percentage", { ascending: true });

      const conceptMasteryList: ConceptMasteryData[] = [];
      const learningGaps: LearningGapItem[] = [];

      if (masteryRows && masteryRows.length > 0) {
        masteryRows.forEach((cm: any) => {
          const mastery = cm.mastery_percentage || 0;
          const totalQ = cm.total_questions || 0;
          const correctQ = cm.correct_count || 0;
          const incorrectQ = cm.incorrect_count || (totalQ - correctQ);

          let status: "Mastered" | "Developing" | "Needs Review" | "Not Assessed" = "Developing";
          if (totalQ === 0) status = "Not Assessed";
          else if (mastery >= 80) status = "Mastered";
          else if (mastery < 60) status = "Needs Review";

          conceptMasteryList.push({
            id: cm.id,
            conceptId: cm.id,
            conceptName: cm.concept_name,
            subject: cm.subject || "Academic Subject",
            topic: cm.topic || "Topic",
            masteryPercentage: mastery,
            status,
            trend: cm.trend || "stable",
            totalQuestions: totalQ,
            correctCount: correctQ,
            incorrectCount: incorrectQ,
            lastAssessedAt: cm.last_assessed_at || new Date().toISOString(),
          });

          // Evidence-based gap detection rule:
          // Must have tested at least GAP_MIN_QUESTIONS (2) and accuracy < GAP_ACCURACY_THRESHOLD (65%)
          if (totalQ >= GAP_MIN_QUESTIONS && mastery < GAP_ACCURACY_THRESHOLD) {
            learningGaps.push({
              conceptName: cm.concept_name,
              subject: cm.subject || "Academic Subject",
              topic: cm.topic || "Topic",
              masteryPercentage: mastery,
              totalQuestions: totalQ,
              correctCount: correctQ,
              reason: `Recent accuracy in ${cm.concept_name} was ${mastery}% (${correctQ}/${totalQ} questions correct).`,
            });
          }
        });
      }

      // 3. Compute topic mastery from quiz_attempt_answers
      const { data: answers } = await supabase
        .from("quiz_attempt_answers")
        .select("subject, topic, is_correct")
        .eq("student_id", studentId);

      const topicMap: Record<string, { subject: string; correct: number; total: number }> = {};
      if (answers && answers.length > 0) {
        answers.forEach((ans: any) => {
          const sub = ans.subject || "Subject";
          const top = ans.topic || "General";
          const key = `${sub}:::${top}`;

          if (!topicMap[key]) topicMap[key] = { subject: sub, correct: 0, total: 0 };
          topicMap[key].total += 1;
          if (ans.is_correct) topicMap[key].correct += 1;
        });
      }

      const topicMastery = Object.entries(topicMap).map(([key, val]) => {
        const [, top] = key.split(":::");
        return {
          subjectName: val.subject,
          topic: top,
          accuracyPercentage: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
          totalQuestions: val.total,
        };
      });

      return {
        totalAttempts,
        averageScorePercentage,
        subjectScores,
        topicMastery,
        conceptMasteryList,
        learningGaps,
      };
    } catch (err) {
      console.error("Error computing student quiz metrics:", err);
      return defaultResult;
    }
  }

  /**
   * Computes authentic assignments status for the student's classroom
   */
  public async getStudentAssignmentMetrics(
    studentId: string,
    classroomId: string
  ): Promise<AssignmentMetrics> {
    const defaultResult: AssignmentMetrics = {
      totalAssignments: 0,
      pendingCount: 0,
      submittedCount: 0,
      overdueCount: 0,
      urgentCount: 0,
      nextDueAssignment: null,
      assignmentsList: [],
    };

    if (!classroomId) return defaultResult;

    try {
      // 1. Fetch real assignments for this classroom
      const { data: rawAssignments } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          subject,
          topic,
          deadline,
          max_marks
        `)
        .eq("classroom_id", classroomId)
        .order("deadline", { ascending: true });

      if (!rawAssignments || rawAssignments.length === 0) {
        return defaultResult;
      }

      // 2. Fetch real submissions by this student
      const { data: rawSubmissions } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, status, submitted_at, marks_obtained")
        .eq("user_id", studentId);

      const submissionMap = new Map<string, any>();
      (rawSubmissions || []).forEach((sub) => {
        submissionMap.set(sub.assignment_id, sub);
      });

      const now = Date.now();
      let pendingCount = 0;
      let submittedCount = 0;
      let overdueCount = 0;
      let urgentCount = 0;
      let nextDueAssignment: any = null;

      const assignmentsList = rawAssignments.map((a: any) => {
        const sub = submissionMap.get(a.id);
        const hasSubmitted = !!sub && (sub.status === "submitted" || sub.status === "graded");
        const deadlineTime = a.deadline ? new Date(a.deadline).getTime() : now + 86400000 * 7;
        const isPastDeadline = deadlineTime < now;
        const hoursLeft = (deadlineTime - now) / (1000 * 60 * 60);
        const isUrgent = !hasSubmitted && hoursLeft > 0 && hoursLeft <= 48;

        let status: "pending" | "submitted" | "overdue" = "pending";
        if (hasSubmitted) {
          status = "submitted";
          submittedCount += 1;
        } else if (isPastDeadline) {
          status = "overdue";
          overdueCount += 1;
          pendingCount += 1;
        } else {
          status = "pending";
          pendingCount += 1;
        }

        if (isUrgent) {
          urgentCount += 1;
        }

        if (!hasSubmitted && !nextDueAssignment && !isPastDeadline) {
          nextDueAssignment = {
            id: a.id,
            title: a.title,
            subject: a.subject || "Academic Coursework",
            topic: a.topic,
            deadline: a.deadline,
            maxMarks: a.max_marks || 20,
            isUrgent,
          };
        }

        return {
          id: a.id,
          title: a.title,
          subject: a.subject || "Academic Coursework",
          topic: a.topic,
          deadline: a.deadline,
          maxMarks: a.max_marks || 20,
          status,
          submittedAt: sub?.submitted_at || null,
          marksObtained: sub?.marks_obtained || null,
        };
      });

      return {
        totalAssignments: rawAssignments.length,
        pendingCount,
        submittedCount,
        overdueCount,
        urgentCount,
        nextDueAssignment,
        assignmentsList,
      };
    } catch (err) {
      console.error("Error computing student assignment metrics:", err);
      return defaultResult;
    }
  }

  /**
   * Deterministically calculates Learning Health based ONLY on real available signals:
   * Quiz Performance (40%), Attendance Rate (30%), Assignment Completion Rate (30%).
   * Re-normalizes weights if any category has zero records.
   * Returns null if NO student activity records exist.
   */
  public calculateLearningHealth(
    attendancePct: number | null,
    quizPct: number | null,
    assignmentsTotal: number,
    assignmentsSubmitted: number
  ): { score: number | null; status: "Optimal" | "On Track" | "Needs Attention" | "Insufficient Data" } {
    const signals: { score: number; weight: number }[] = [];

    // Signal 1: Quizzes
    if (quizPct !== null) {
      signals.push({ score: quizPct, weight: 0.4 });
    }

    // Signal 2: Attendance
    if (attendancePct !== null) {
      signals.push({ score: attendancePct, weight: 0.3 });
    }

    // Signal 3: Assignments
    if (assignmentsTotal > 0) {
      const completionRate = Math.round((assignmentsSubmitted / assignmentsTotal) * 100);
      signals.push({ score: completionRate, weight: 0.3 });
    }

    if (signals.length === 0) {
      return { score: null, status: "Insufficient Data" };
    }

    // Normalize weights
    const totalWeight = signals.reduce((acc, s) => acc + s.weight, 0);
    const weightedSum = signals.reduce((acc, s) => acc + s.score * (s.weight / totalWeight), 0);
    const finalScore = Math.round(weightedSum);

    let status: "Optimal" | "On Track" | "Needs Attention" = "On Track";
    if (finalScore >= 80) status = "Optimal";
    else if (finalScore < 65) status = "Needs Attention";

    return { score: finalScore, status };
  }

  /**
   * Generates prioritized academic actions ranked deterministically from actual DB triggers
   */
  public getStudentPriorities(
    context: StudentAcademicContext | null,
    attendance: AttendanceMetrics,
    quizzes: QuizMetrics,
    assignments: AssignmentMetrics
  ): StudentPriorityAction[] {
    const priorities: StudentPriorityAction[] = [];

    // Priority 1: Pending Assignment with approaching deadline
    if (assignments.nextDueAssignment) {
      const nextDue = assignments.nextDueAssignment;
      const isUrgent = nextDue.isUrgent;
      priorities.push({
        id: `p-asgn-${nextDue.id}`,
        priority: isUrgent ? "HIGH" : "MEDIUM",
        category: "ASSIGNMENT",
        subject: nextDue.subject,
        title: `Submit Assignment: ${nextDue.title}`,
        reason: isUrgent
          ? `Urgent: Due by ${new Date(nextDue.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.`
          : `Course assignment pending for ${nextDue.subject}. Max marks: ${nextDue.maxMarks}.`,
        actionLabel: "Submit Assignment",
        actionUrl: `/student/assignments`,
        dueDate: nextDue.deadline,
        estimatedMinutes: 45,
        whyDetails: {
          signals: [
            `Official coursework deadline in ${nextDue.subject}`,
            isUrgent ? "Deadline expiring within 48 hours" : "Unsubmitted coursework",
          ],
          riskFactor: isUrgent ? "Late submission penalty or zero marks" : "Coursework completion delay",
          projectedGain: "+100% Assignment Credit",
        },
      });
    }

    // Priority 2: Real Missed Class requiring recovery
    if (attendance.recentMissedClass) {
      const missed = attendance.recentMissedClass;
      priorities.push({
        id: `p-missed-${missed.sessionId}`,
        priority: "HIGH",
        category: "MISSED_CLASS",
        subject: missed.subjectName,
        title: `Catch up: Missed ${missed.subjectName} Lecture`,
        reason: `You were marked absent on ${missed.date} covering ${missed.topic}${
          missed.hasFacultyLecture ? ". Your faculty posted a video lecture for this session." : "."
        }`,
        actionLabel: missed.hasFacultyLecture ? "Watch Faculty Lecture" : "Review Topic Notes",
        actionUrl: missed.hasFacultyLecture
          ? `/student/lectures?topic=${encodeURIComponent(missed.topic)}`
          : `/student/notes`,
        estimatedMinutes: 30,
        whyDetails: {
          signals: [
            `Recorded absence for ${missed.subjectName} on ${missed.date}`,
            `Curriculum topic covered: ${missed.topic}`,
          ],
          riskFactor: "Knowledge gap in upcoming classroom assessment",
          projectedGain: "Recovers missed lecture concepts",
        },
      });
    }

    // Priority 3: Real Learning Gap requiring practice
    if (quizzes.learningGaps.length > 0) {
      const primaryGap = quizzes.learningGaps[0];
      priorities.push({
        id: `p-gap-${primaryGap.conceptName}`,
        priority: "HIGH",
        category: "LEARNING_GAP",
        subject: primaryGap.subject,
        title: `Practice Concept: ${primaryGap.conceptName}`,
        reason: `Your assessed accuracy in ${primaryGap.conceptName} is ${primaryGap.masteryPercentage}% (${primaryGap.correctCount}/${primaryGap.totalQuestions} questions correct).`,
        actionLabel: "Take Practice Quiz",
        actionUrl: `/student/quizzes?concept=${encodeURIComponent(primaryGap.conceptName)}`,
        estimatedMinutes: 20,
        whyDetails: {
          signals: [
            `Diagnostic quiz accuracy: ${primaryGap.masteryPercentage}%`,
            `Assessed across ${primaryGap.totalQuestions} real questions`,
          ],
          riskFactor: "Elevated failure risk on subject midterms",
          projectedGain: "+15% Mastery Projected",
        },
      });
    }

    return priorities.slice(0, 4);
  }

  /**
   * Gathers chronological academic activity logs from real events
   */
  public async getStudentRecentActivity(studentId: string): Promise<RecentActivityItem[]> {
    const activity: RecentActivityItem[] = [];

    try {
      // 1. Real Quiz attempts
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          score,
          max_score,
          percentage,
          completed_at,
          quizzes (title, subject)
        `)
        .eq("user_id", studentId)
        .order("completed_at", { ascending: false })
        .limit(5);

      (attempts || []).forEach((a: any) => {
        const pct = a.percentage || Math.round((a.score / (a.max_score || 1)) * 100);
        activity.push({
          id: `act-q-${a.id}`,
          type: "QUIZ_COMPLETED",
          title: `Completed Quiz: ${a.quizzes?.title || "Quiz"}`,
          subject: a.quizzes?.subject || "Academic Assessment",
          description: `Scored ${a.score}/${a.max_score} (${pct}%)`,
          timestamp: a.completed_at,
          scoreOrStatus: `${pct}%`,
        });
      });

      // 2. Real Assignment Submissions
      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select(`
          id,
          submitted_at,
          status,
          marks_obtained,
          assignments (title, subject, max_marks)
        `)
        .eq("user_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(5);

      (submissions || []).forEach((s: any) => {
        activity.push({
          id: `act-sub-${s.id}`,
          type: "ASSIGNMENT_SUBMITTED",
          title: `Submitted: ${s.assignments?.title || "Assignment"}`,
          subject: s.assignments?.subject || "Coursework",
          description: s.marks_obtained !== null ? `Graded: ${s.marks_obtained}/${s.assignments?.max_marks}` : "Submitted for faculty review",
          timestamp: s.submitted_at,
          scoreOrStatus: s.marks_obtained !== null ? `${s.marks_obtained} pts` : "Submitted",
        });
      });

      // 3. Real Attendance records
      const { data: attendance } = await supabase
        .from("attendance_records")
        .select(`
          id,
          status,
          created_at,
          class_sessions (
            date,
            topic,
            teaching_assignments (subject_name)
          )
        `)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(5);

      (attendance || []).forEach((ar: any) => {
        const sess = ar.class_sessions;
        const sub = sess?.teaching_assignments?.subject_name || "Lecture";
        const isPresent = ar.status === "present" || ar.status === "late";

        activity.push({
          id: `act-att-${ar.id}`,
          type: isPresent ? "CLASS_ATTENDED" : "CLASS_MISSED",
          title: isPresent ? `Attended ${sub} Class` : `Missed ${sub} Class`,
          subject: sub,
          description: `Topic covered: ${sess?.topic || "Curriculum Session"} on ${sess?.date}`,
          timestamp: ar.created_at,
          scoreOrStatus: isPresent ? "Present" : "Absent",
        });
      });

      // Sort chronological descending
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return activity.slice(0, 8);
    } catch (err) {
      console.error("Error gathering student recent activity:", err);
      return [];
    }
  }

  /**
   * One consolidated query to power the Student Dashboard
   */
  public async getStudentHomeAnalytics(studentId: string): Promise<StudentHomeAnalytics> {
    const context = await this.getStudentAcademicContext(studentId);
    const classroomId = context?.classroomId || "";

    const [attendance, quizzes, assignments, recentActivity] = await Promise.all([
      this.getStudentAttendanceMetrics(studentId, classroomId),
      this.getStudentQuizMetrics(studentId),
      this.getStudentAssignmentMetrics(studentId, classroomId),
      this.getStudentRecentActivity(studentId),
    ]);

    const health = this.calculateLearningHealth(
      attendance.overallAttendancePercentage,
      quizzes.averageScorePercentage,
      assignments.totalAssignments,
      assignments.submittedCount
    );

    const priorities = this.getStudentPriorities(context, attendance, quizzes, assignments);

    return {
      context,
      learningHealth: health.score,
      healthStatus: health.status,
      attendance,
      quizzes,
      assignments,
      priorities,
      recentActivity,
    };
  }
}

export const studentAnalyticsService = new StudentAnalyticsService();
