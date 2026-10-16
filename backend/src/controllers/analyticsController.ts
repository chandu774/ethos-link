import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { ClassroomMember } from "../models/ClassroomMember";
import { TeachingAssignment } from "../models/TeachingAssignment";
import { ClassSession } from "../models/ClassSession";
import { AttendanceRecord } from "../models/AttendanceRecord";
import { Assignment } from "../models/Assignment";
import { AssignmentSubmission } from "../models/AssignmentSubmission";
import { Quiz } from "../models/Quiz";
import { QuizAttempt } from "../models/QuizAttempt";
import { QuizAttemptAnswer } from "../models/QuizAttemptAnswer";
import { StudentConceptHistory } from "../models/StudentConceptHistory";
import { User } from "../models/User";

// Student Home Analytics (Matches StudentHomeAnalytics interface)
export async function getStudentAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?._id;

    // 1. Classroom & Teaching Assignments
    const member = await ClassroomMember.findOne({ student_id: studentId }).populate("classroom_id");
    let classroom: any = null;
    let enrolledSubjects: any[] = [];

    if (member && member.classroom_id) {
      classroom = member.classroom_id;
      const tas = await TeachingAssignment.find({ classroom_id: classroom._id }).populate("faculty_id", "name email");
      enrolledSubjects = tas.map((t) => ({
        id: t._id.toString(),
        subjectName: t.subject_name,
        subjectCode: t.subject_code,
        facultyName: (t.faculty_id as any)?.name || "Faculty",
      }));
    }

    // 2. Attendance
    let attendance = {
      totalClasses: 0,
      attendedClasses: 0,
      percentage: 0,
      subjectAttendance: [] as any[],
      recentMissedClass: null as any,
    };

    if (classroom) {
      const sessions = await ClassSession.find({ classroom_id: classroom._id })
        .populate("teaching_assignment_id", "subject_name")
        .sort({ session_date: -1 });

      const records = await AttendanceRecord.find({
        session_id: { $in: sessions.map((s) => s._id) },
        student_id: studentId,
      });

      const recMap = new Map<string, string>();
      records.forEach((r) => recMap.set(r.session_id.toString(), r.status));

      const subMap = new Map<string, { total: number; present: number }>();

      sessions.forEach((s) => {
        const status = recMap.get(s._id.toString()) || "present";
        attendance.totalClasses++;
        if (status === "present") {
          attendance.attendedClasses++;
        } else if (!attendance.recentMissedClass) {
          attendance.recentMissedClass = {
            date: s.session_date,
            subjectName: (s.teaching_assignment_id as any)?.subject_name || "Academic Subject",
            topic: s.topic_covered,
            conceptsTaught: s.concepts_taught || [],
            hasFacultyLecture: false,
          };
        }

        const sName = (s.teaching_assignment_id as any)?.subject_name || "General";
        const cur = subMap.get(sName) || { total: 0, present: 0 };
        cur.total++;
        if (status === "present") cur.present++;
        subMap.set(sName, cur);
      });

      attendance.percentage = attendance.totalClasses > 0 ? Math.round((attendance.attendedClasses / attendance.totalClasses) * 100) : 100;
      attendance.subjectAttendance = Array.from(subMap.entries()).map(([name, d]) => ({
        subjectName: name,
        total: d.total,
        present: d.present,
        percentage: d.total > 0 ? Math.round((d.present / d.total) * 100) : 100,
      }));
    }

    // 3. Assignments
    let assignmentsMetrics = {
      totalAssigned: 0,
      submitted: 0,
      pending: 0,
      graded: 0,
      submissionRate: 0,
      recentAssignments: [] as any[],
    };

    if (classroom) {
      const assignments = await Assignment.find({ classroom_id: classroom._id }).sort({ deadline: 1 });
      assignmentsMetrics.totalAssigned = assignments.length;

      const submissions = await AssignmentSubmission.find({
        assignment_id: { $in: assignments.map((a) => a._id) },
        user_id: studentId,
      });

      const subMap = new Map<string, any>();
      submissions.forEach((s) => subMap.set(s.assignment_id.toString(), s));

      assignmentsMetrics.submitted = submissions.length;
      assignmentsMetrics.pending = Math.max(0, assignments.length - submissions.length);
      assignmentsMetrics.graded = submissions.filter((s) => s.status === "graded").length;
      assignmentsMetrics.submissionRate = assignments.length > 0 ? Math.round((submissions.length / assignments.length) * 100) : 100;

      assignmentsMetrics.recentAssignments = assignments.slice(0, 5).map((a) => {
        const sub = subMap.get(a._id.toString());
        return {
          id: a._id.toString(),
          title: a.title,
          deadline: a.deadline,
          status: sub ? sub.status : "pending",
          marks: sub?.marks_obtained,
          maxMarks: a.max_marks,
        };
      });
    }

    // 4. Quizzes
    const attempts = await QuizAttempt.find({ user_id: studentId }).populate("quiz_id", "title topic subject");
    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts) : 0;

    const quizMetrics = {
      totalAttempts,
      averageScore: avgScore,
      subjectScores: [] as any[],
      recentAttempts: attempts.slice(0, 5).map((a) => ({
        id: a._id.toString(),
        quizTitle: (a.quiz_id as any)?.title || "Quiz",
        score: a.score,
        totalQuestions: a.total_questions,
        percentage: a.percentage,
        completedAt: a.completed_at,
      })),
    };

    // 5. Concept Mastery
    const conceptHistory = await StudentConceptHistory.find({ student_id: studentId });
    const mastered = conceptHistory.filter((c) => c.status === "Mastered" || c.mastery_percentage >= 80);
    const gaps = conceptHistory.filter((c) => c.status === "Needs Review" || (c.total_answers > 0 && c.mastery_percentage < 60));

    res.json({
      context: classroom
        ? {
            classroomId: classroom._id.toString(),
            classroomName: classroom.name,
            course: classroom.course,
            branch: classroom.branch,
            year: classroom.year,
            section: classroom.section,
            academicYear: classroom.academic_year,
            rollNumber: req.user?.roll_number,
            subjects: enrolledSubjects,
          }
        : null,
      attendance,
      assignments: assignmentsMetrics,
      quizzes: quizMetrics,
      concepts: {
        totalTracked: conceptHistory.length,
        masteredCount: mastered.length,
        gapsCount: gaps.length,
        averageMastery:
          conceptHistory.filter((c) => c.total_answers > 0).length > 0
            ? Math.round(
                conceptHistory.filter((c) => c.total_answers > 0).reduce((sum, c) => sum + c.mastery_percentage, 0) /
                  conceptHistory.filter((c) => c.total_answers > 0).length
              )
            : 0,
        strongTopics: mastered.slice(0, 5).map((c) => c.concept_name),
        weakTopics: gaps.slice(0, 5).map((c) => c.concept_name),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to calculate student analytics." });
  }
}

// Student Concept Mastery Telemetry
export async function getConceptMastery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.params.studentId || req.user?._id;
    const history = await StudentConceptHistory.find({ student_id: studentId }).sort({ mastery_percentage: 1 });

    const records = history.map((h) => ({
      id: h._id.toString(),
      user_id: h.student_id.toString(),
      concept_name: h.concept_name,
      conceptName: h.concept_name,
      subject: h.subject,
      topic: h.topic || h.subject,
      attempts: h.attempts,
      attempts_count: h.attempts,
      correctAnswers: h.correct_answers,
      correct_count: h.correct_answers,
      totalAnswers: h.total_answers,
      total_questions: h.total_answers,
      incorrect_count: Math.max(0, h.total_answers - h.correct_answers),
      masteryPercentage: h.mastery_percentage,
      mastery_percentage: h.mastery_percentage,
      status: h.status,
      trend: h.trend,
      lastAssessedAt: h.last_assessed_at ? h.last_assessed_at.toISOString() : null,
      last_assessed_at: h.last_assessed_at ? h.last_assessed_at.toISOString() : new Date().toISOString(),
    }));

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get concept mastery." });
  }
}

// Faculty Cohort Analytics
export async function getCohortAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { cohortId } = req.params;
    const cohort = await TeachingAssignment.findById(cohortId);
    if (!cohort) {
      res.status(404).json({ error: "Teaching cohort not found." });
      return;
    }

    // 1. Enrolled students
    const members = await ClassroomMember.find({ classroom_id: cohort.classroom_id }).populate("student_id", "name roll_number email");
    const enrolledStudents = members
      .map((m: any) => ({
        id: m.student_id?._id?.toString() || m.student_id?.id,
        name: m.student_id?.name || "Student",
        rollNumber: m.student_id?.roll_number || "—",
        email: m.student_id?.email || "—",
      }))
      .filter((st) => st.id);

    const totalStudentsCount = enrolledStudents.length;

    // 2. Attendance sessions
    const sessions = await ClassSession.find({ teaching_assignment_id: cohortId }).sort({ session_date: -1 });
    const sessionIds = sessions.map((s) => s._id);
    const attendanceRecords = await AttendanceRecord.find({ session_id: { $in: sessionIds } });

    let overallAttRate: number | null = null;
    let totalSessions = sessions.length;
    const studentAttendanceMap: Record<string, { present: number; total: number }> = {};
    const sessionStatsList: any[] = [];

    enrolledStudents.forEach((st) => {
      studentAttendanceMap[st.id] = { present: 0, total: 0 };
    });

    if (sessions.length > 0) {
      let grandTotalPresent = 0;
      let grandTotalRecords = 0;

      sessions.forEach((s) => {
        const records = attendanceRecords.filter((r) => r.session_id.toString() === s._id.toString());
        let sessionPresent = 0;
        let sessionAbsent = 0;
        const absentStudents: Array<{ name: string; rollNumber: string }> = [];

        records.forEach((r) => {
          grandTotalRecords++;
          const stId = r.student_id.toString();
          if (studentAttendanceMap[stId]) {
            studentAttendanceMap[stId].total += 1;
          }
          if (r.status === "present") {
            grandTotalPresent++;
            sessionPresent++;
            if (studentAttendanceMap[stId]) {
              studentAttendanceMap[stId].present += 1;
            }
          } else {
            sessionAbsent++;
            const matchedSt = enrolledStudents.find((st) => st.id === stId);
            if (matchedSt) {
              absentStudents.push({ name: matchedSt.name, rollNumber: matchedSt.rollNumber });
            }
          }
        });

        const sessionTotal = sessionPresent + sessionAbsent;
        sessionStatsList.push({
          id: s._id.toString(),
          date: s.session_date ? new Date(s.session_date).toISOString() : "",
          topic: s.topic_covered,
          totalEnrolled: totalStudentsCount,
          presentCount: sessionPresent,
          absentCount: sessionAbsent,
          pct: sessionTotal > 0 ? Math.round((sessionPresent / sessionTotal) * 100) : 0,
          absentStudents,
        });
      });

      if (grandTotalRecords > 0) {
        overallAttRate = Math.round((grandTotalPresent / grandTotalRecords) * 100);
      }
    }

    // 3. Quizzes & attempts
    const quizzes = await Quiz.find({ teaching_assignment_id: cohortId });
    const quizIds = quizzes.map((q) => q._id);

    const attempts = await QuizAttempt.find({ quiz_id: { $in: quizIds } });
    const attemptAnswers = await QuizAttemptAnswer.find({ quiz_id: { $in: quizIds } });

    let quizAvg: number | null = null;
    let highestScore: number | null = null;
    let lowestScore: number | null = null;
    let totalAttemptsCount = attempts.length;
    const uniqueAttemptedStudents = new Set<string>();

    const topicMap: Record<string, { correct: number; total: number }> = {};
    const conceptMap: Record<string, { topic: string; correct: number; total: number }> = {};
    const studentConceptMap: Record<string, Record<string, { correct: number; total: number }>> = {};
    const studentQuizScoreMap: Record<string, number[]> = {};

    enrolledStudents.forEach((st) => {
      studentQuizScoreMap[st.id] = [];
    });

    if (attempts.length > 0) {
      let totalScoreSum = 0;

      attempts.forEach((att) => {
        const pct = att.percentage ?? 0;
        totalScoreSum += pct;
        if (highestScore === null || pct > highestScore) highestScore = pct;
        if (lowestScore === null || pct < lowestScore) lowestScore = pct;

        const stId = att.user_id?.toString();
        if (stId) {
          uniqueAttemptedStudents.add(stId);
          if (studentQuizScoreMap[stId]) {
            studentQuizScoreMap[stId].push(pct);
          }
        }
      });

      attemptAnswers.forEach((ans) => {
        const t = (ans.topic || cohort.subject_name || "General").trim();
        if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 };
        topicMap[t].total += 1;
        if (ans.is_correct) topicMap[t].correct += 1;

        if (ans.concept) {
          const c = ans.concept.trim();
          if (!conceptMap[c]) conceptMap[c] = { topic: t, correct: 0, total: 0 };
          conceptMap[c].total += 1;
          if (ans.is_correct) conceptMap[c].correct += 1;

          const stId = ans.student_id?.toString();
          if (stId) {
            if (!studentConceptMap[c]) studentConceptMap[c] = {};
            if (!studentConceptMap[c][stId]) studentConceptMap[c][stId] = { correct: 0, total: 0 };
            studentConceptMap[c][stId].total += 1;
            if (ans.is_correct) studentConceptMap[c][stId].correct += 1;
          }
        }
      });

      if (totalAttemptsCount > 0) {
        quizAvg = Math.round(totalScoreSum / totalAttemptsCount);
      }
    }

    const topicsList = Object.entries(topicMap)
      .map(([topic, val]) => ({
        topic,
        correct: val.correct,
        total: val.total,
        pct: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct);

    const conceptsList = Object.entries(conceptMap)
      .map(([concept, val]) => ({
        concept,
        topic: val.topic,
        correct: val.correct,
        total: val.total,
        pct: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct);

    const conceptDrilldown: Record<
      string,
      Array<{ studentId: string; name: string; rollNumber: string; correct: number; total: number; pct: number }>
    > = {};

    Object.keys(conceptMap).forEach((c) => {
      const studentStats = enrolledStudents.map((st) => {
        const rec = studentConceptMap[c]?.[st.id] || { correct: 0, total: 0 };
        return {
          studentId: st.id,
          name: st.name,
          rollNumber: st.rollNumber,
          correct: rec.correct,
          total: rec.total,
          pct: rec.total > 0 ? Math.round((rec.correct / rec.total) * 100) : 0,
        };
      });

      studentStats.sort((a, b) => {
        if (a.total === 0 && b.total > 0) return 1;
        if (a.total > 0 && b.total === 0) return -1;
        return a.pct - b.pct;
      });

      conceptDrilldown[c] = studentStats;
    });

    // 4. Assignments
    const assignments = await Assignment.find({ teaching_assignment_id: cohortId });
    const asgIds = assignments.map((a) => a._id);
    const submissions = await AssignmentSubmission.find({ assignment_id: { $in: asgIds } });

    let asgCompRate: number | null = null;
    let totalAsgs = assignments.length;
    if (totalAsgs > 0 && totalStudentsCount > 0) {
      const totalPossible = totalAsgs * totalStudentsCount;
      asgCompRate = Math.round((submissions.length / totalPossible) * 100);
    }

    // 5. Student insights & attention detection
    let attentionCount = 0;
    const studentInsightsList = enrolledStudents.map((st) => {
      const scores = studentQuizScoreMap[st.id] || [];
      const stQuizAvg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const att = studentAttendanceMap[st.id] || { present: 0, total: 0 };
      const stAttRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : null;

      const weakConcepts: string[] = [];
      Object.keys(studentConceptMap).forEach((c) => {
        const rec = studentConceptMap[c]?.[st.id];
        if (rec && rec.total >= 1) {
          const acc = Math.round((rec.correct / rec.total) * 100);
          if (acc < 60) weakConcepts.push(c);
        }
      });

      let trend: "Improving" | "Stable" | "Needs Support" = "Stable";
      if (scores.length >= 2) {
        const recent = scores[scores.length - 1];
        const prev = scores[scores.length - 2];
        if (recent > prev + 5) trend = "Improving";
        else if (recent < prev - 5) trend = "Needs Support";
      } else if (stQuizAvg !== null && stQuizAvg < 60) {
        trend = "Needs Support";
      }

      const requiresAttention = Boolean(
        (stQuizAvg !== null && stQuizAvg < 60) ||
        (stAttRate !== null && stAttRate < 75) ||
        weakConcepts.length >= 2
      );

      if (requiresAttention) attentionCount++;

      let suggestedSupport = "Performance is consistent with expected learning pace.";
      if (weakConcepts.length > 0) {
        suggestedSupport = `Recommend reviewing ${weakConcepts.slice(0, 2).join(" & ")} and attempting the related practice checkpoint.`;
      } else if (stAttRate !== null && stAttRate < 75) {
        suggestedSupport = "Review attendance records and assign catch-up recovery packets for missed sessions.";
      }

      return {
        studentId: st.id,
        name: st.name,
        rollNumber: st.rollNumber,
        email: st.email,
        quizAverage: stQuizAvg,
        quizzesAttempted: scores.length,
        attendanceRate: stAttRate,
        sessionsAttended: att.present,
        totalSessions: att.total,
        weakConcepts,
        trend,
        suggestedSupport,
        requiresAttention,
      };
    });

    studentInsightsList.sort((a, b) => (b.requiresAttention ? 1 : 0) - (a.requiresAttention ? 1 : 0));

    res.json({
      overview: {
        totalStudents: totalStudentsCount,
        quizAverage: quizAvg,
        highestScore,
        lowestScore,
        quizzesAttemptedCount: totalAttemptsCount,
        uniqueStudentsAttempted: uniqueAttemptedStudents.size,
        attendanceRate: overallAttRate,
        sessionsCount: totalSessions,
        assignmentCompletionRate: asgCompRate,
        assignmentsCount: totalAsgs,
        studentsRequiringAttentionCount: attentionCount,
      },
      topicStats: topicsList,
      conceptStats: conceptsList,
      sessionAttendanceStats: sessionStatsList,
      studentInsights: studentInsightsList,
      conceptStudentDrilldown: conceptDrilldown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get cohort analytics." });
  }
}

