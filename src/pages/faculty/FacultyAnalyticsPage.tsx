import { useState, useEffect } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  FileCheck2,
  CalendarCheck,
  ClipboardList,
  Award,
  HelpCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeachingCohort {
  id: string;
  subject_name: string;
  subject_code: string | null;
  classroom_id: string;
  classroom?: {
    name: string;
    course: string;
    branch: string;
    year: number;
    section: string;
  };
}

interface StudentInsight {
  studentId: string;
  name: string;
  rollNumber: string;
  email: string;
  quizAverage: number | null;
  quizzesAttempted: number;
  attendanceRate: number | null;
  sessionsAttended: number;
  totalSessions: number;
  weakConcepts: string[];
  trend: "Improving" | "Stable" | "Needs Support";
  suggestedSupport: string;
  requiresAttention: boolean;
}

interface TopicStat {
  topic: string;
  correct: number;
  total: number;
  pct: number;
}

interface ConceptStat {
  concept: string;
  topic?: string;
  correct: number;
  total: number;
  pct: number;
}

interface SessionAttendanceStat {
  id: string;
  date: string;
  topic: string | null;
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  pct: number;
  absentStudents: Array<{ name: string; rollNumber: string }>;
}

export default function FacultyAnalyticsPage() {
  const { user } = useAuth();

  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [teachingCohorts, setTeachingCohorts] = useState<TeachingCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  const [loadingStats, setLoadingStats] = useState(false);

  // Overview stats
  const [overview, setOverview] = useState<{
    totalStudents: number;
    quizAverage: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    quizzesAttemptedCount: number;
    uniqueStudentsAttempted: number;
    attendanceRate: number | null;
    sessionsCount: number;
    assignmentCompletionRate: number | null;
    assignmentsCount: number;
    studentsRequiringAttentionCount: number;
  }>({
    totalStudents: 0,
    quizAverage: null,
    highestScore: null,
    lowestScore: null,
    quizzesAttemptedCount: 0,
    uniqueStudentsAttempted: 0,
    attendanceRate: null,
    sessionsCount: 0,
    assignmentCompletionRate: null,
    assignmentsCount: 0,
    studentsRequiringAttentionCount: 0,
  });

  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [conceptStats, setConceptStats] = useState<ConceptStat[]>([]);
  const [sessionAttendanceStats, setSessionAttendanceStats] = useState<SessionAttendanceStat[]>([]);
  const [studentInsights, setStudentInsights] = useState<StudentInsight[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "topics" | "concepts" | "attendance" | "students">("overview");

  const [selectedConceptDrilldown, setSelectedConceptDrilldown] = useState<string | null>(null);
  const [conceptStudentDrilldown, setConceptStudentDrilldown] = useState<
    Record<string, Array<{ studentId: string; name: string; rollNumber: string; correct: number; total: number; pct: number }>>
  >({});

  const fetchCohorts = async () => {
    if (!user) return;
    setLoadingCohorts(true);
    try {
      const { data: taData, error } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          classroom_id,
          classroom:classrooms!teaching_assignments_classroom_id_fkey (
            name,
            course,
            branch,
            year,
            section
          )
        `)
        .eq("faculty_id", user.id);

      if (error) throw error;
      const cohorts = (taData as any[]) || [];
      setTeachingCohorts(cohorts);
      if (cohorts.length > 0 && !selectedCohortId) {
        setSelectedCohortId(cohorts[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load cohorts:", err);
      toast.error("Failed to load teaching cohorts");
    } finally {
      setLoadingCohorts(false);
    }
  };

  useEffect(() => {
    fetchCohorts();
  }, [user]);

  const fetchAnalyticsForCohort = async (cohortId: string) => {
    const cohort = teachingCohorts.find((c) => c.id === cohortId);
    if (!cohort || !cohort.classroom_id) return;

    setLoadingStats(true);
    try {
      // 1. Enrolled students roster (using 'name' column in profiles, not 'full_name')
      const { data: membersData, error: memErr } = await supabase
        .from("classroom_members")
        .select(`
          student_id,
          student:profiles!classroom_members_student_id_fkey (
            id,
            name,
            roll_number,
            email
          )
        `)
        .eq("classroom_id", cohort.classroom_id);

      if (memErr) throw memErr;

      const enrolledStudents = (membersData || []).map((m: any) => ({
        id: m.student_id,
        name: m.student?.name || "Student",
        rollNumber: m.student?.roll_number || "—",
        email: m.student?.email || "—",
      }));
      const totalStudentsCount = enrolledStudents.length;

      // 2. Attendance sessions & records
      const { data: sessionData } = await supabase
        .from("class_sessions")
        .select(`
          id,
          date,
          topic,
          teaching_notes,
          attendance_records (
            id,
            student_id,
            status
          )
        `)
        .eq("teaching_assignment_id", cohortId)
        .order("date", { ascending: false });

      let overallAttRate: number | null = null;
      let totalSessions = 0;
      const studentAttendanceMap: Record<string, { present: number; total: number }> = {};
      const sessionStatsList: SessionAttendanceStat[] = [];

      enrolledStudents.forEach((st) => {
        studentAttendanceMap[st.id] = { present: 0, total: 0 };
      });

      if (sessionData && sessionData.length > 0) {
        totalSessions = sessionData.length;
        let grandTotalPresent = 0;
        let grandTotalRecords = 0;

        sessionData.forEach((s: any) => {
          const records = s.attendance_records || [];
          let sessionPresent = 0;
          let sessionAbsent = 0;
          const absentStudents: Array<{ name: string; rollNumber: string }> = [];

          records.forEach((r: any) => {
            grandTotalRecords++;
            if (studentAttendanceMap[r.student_id]) {
              studentAttendanceMap[r.student_id].total += 1;
            }
            if (r.status === "present") {
              grandTotalPresent++;
              sessionPresent++;
              if (studentAttendanceMap[r.student_id]) {
                studentAttendanceMap[r.student_id].present += 1;
              }
            } else {
              sessionAbsent++;
              const matchedSt = enrolledStudents.find((st) => st.id === r.student_id);
              if (matchedSt) {
                absentStudents.push({ name: matchedSt.name, rollNumber: matchedSt.rollNumber });
              }
            }
          });

          const sessionTotal = sessionPresent + sessionAbsent;
          sessionStatsList.push({
            id: s.id,
            date: s.date,
            topic: s.topic,
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

      setSessionAttendanceStats(sessionStatsList);

      // 3. Quizzes & attempts for this cohort
      const { data: quizData } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          topic,
          quiz_attempts (
            id,
            user_id,
            score,
            max_score,
            percentage,
            answers,
            completed_at
          )
        `)
        .eq("teaching_assignment_id", cohortId);

      const quizIds = (quizData || []).map((q: any) => q.id);
      let attemptAnswerRows: any[] = [];
      if (quizIds.length > 0) {
        const { data: qAnsRows } = await supabase
          .from("quiz_attempt_answers")
          .select("attempt_id, student_id, topic, concept, is_correct")
          .in("quiz_id", quizIds);
        attemptAnswerRows = qAnsRows || [];
      }
      const attemptsWithGranularRows = new Set(attemptAnswerRows.map((r) => r.attempt_id));

      let quizAvg: number | null = null;
      let highestScore: number | null = null;
      let lowestScore: number | null = null;
      let totalAttemptsCount = 0;
      const uniqueAttemptedStudents = new Set<string>();

      const topicMap: Record<string, { correct: number; total: number }> = {};
      const conceptMap: Record<string, { topic: string; correct: number; total: number }> = {};
      const studentConceptMap: Record<string, Record<string, { correct: number; total: number }>> = {};
      const studentQuizScoreMap: Record<string, number[]> = {};

      enrolledStudents.forEach((st) => {
        studentQuizScoreMap[st.id] = [];
      });

      if (quizData && quizData.length > 0) {
        let totalScoreSum = 0;

        quizData.forEach((q: any) => {
          const defaultTopic = q.topic || "General";
          const attempts = q.quiz_attempts || [];

          attempts.forEach((att: any) => {
            totalAttemptsCount++;
            const pct = att.percentage !== null && att.percentage !== undefined
              ? att.percentage
              : att.max_score > 0
              ? Math.round((att.score / att.max_score) * 100)
              : 0;

            totalScoreSum += pct;
            if (highestScore === null || pct > highestScore) highestScore = pct;
            if (lowestScore === null || pct < lowestScore) lowestScore = pct;

            const stId = att.user_id;
            if (stId) {
              uniqueAttemptedStudents.add(stId);
              if (studentQuizScoreMap[stId]) {
                studentQuizScoreMap[stId].push(pct);
              }
            }

            // Single authoritative accumulation: prioritize quiz_attempt_answers, fallback to att.answers
            if (attemptsWithGranularRows.has(att.id)) {
              const matchingRows = attemptAnswerRows.filter((r) => r.attempt_id === att.id);
              matchingRows.forEach((r) => {
                const t = (r.topic || defaultTopic).trim();
                if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 };
                topicMap[t].total += 1;
                if (r.is_correct) topicMap[t].correct += 1;

                if (r.concept) {
                  const c = String(r.concept).trim();
                  if (!conceptMap[c]) conceptMap[c] = { topic: t, correct: 0, total: 0 };
                  conceptMap[c].total += 1;
                  if (r.is_correct) conceptMap[c].correct += 1;

                  if (stId) {
                    if (!studentConceptMap[c]) studentConceptMap[c] = {};
                    if (!studentConceptMap[c][stId]) studentConceptMap[c][stId] = { correct: 0, total: 0 };
                    studentConceptMap[c][stId].total += 1;
                    if (r.is_correct) studentConceptMap[c][stId].correct += 1;
                  }
                }
              });
            } else if (att.answers && typeof att.answers === "object") {
              // Fallback for legacy attempts without quiz_attempt_answers rows
              Object.values(att.answers).forEach((ansItem: any) => {
                if (ansItem) {
                  const t = (ansItem.topic || defaultTopic).trim();
                  if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 };
                  topicMap[t].total += 1;
                  if (ansItem.is_correct) topicMap[t].correct += 1;

                  if (ansItem.concept) {
                    const c = String(ansItem.concept).trim();
                    if (!conceptMap[c]) conceptMap[c] = { topic: t, correct: 0, total: 0 };
                    conceptMap[c].total += 1;
                    if (ansItem.is_correct) conceptMap[c].correct += 1;

                    if (stId) {
                      if (!studentConceptMap[c]) studentConceptMap[c] = {};
                      if (!studentConceptMap[c][stId]) studentConceptMap[c][stId] = { correct: 0, total: 0 };
                      studentConceptMap[c][stId].total += 1;
                      if (ansItem.is_correct) studentConceptMap[c][stId].correct += 1;
                    }
                  }
                }
              });
            }
          });
        });

        if (totalAttemptsCount > 0) {
          quizAvg = Math.round(totalScoreSum / totalAttemptsCount);
        }
      }

      // Build topic stats list
      const topicsList: TopicStat[] = Object.entries(topicMap).map(([topic, val]) => ({
        topic,
        correct: val.correct,
        total: val.total,
        pct: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      }));
      topicsList.sort((a, b) => a.pct - b.pct);
      setTopicStats(topicsList);

      // Build concept stats list
      const conceptsList: ConceptStat[] = Object.entries(conceptMap).map(([concept, val]) => ({
        concept,
        topic: val.topic,
        correct: val.correct,
        total: val.total,
        pct: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      }));
      conceptsList.sort((a, b) => a.pct - b.pct);
      setConceptStats(conceptsList);

      // Build student drilldown per concept
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
      setConceptStudentDrilldown(conceptDrilldown);

      // 4. Assignments & submission completion rate
      const { data: asgData } = await supabase
        .from("assignments")
        .select(`
          id,
          assignment_submissions(id, user_id)
        `)
        .eq("teaching_assignment_id", cohortId);

      let asgCompRate: number | null = null;
      let totalAsgs = 0;
      if (asgData && asgData.length > 0 && totalStudentsCount > 0) {
        totalAsgs = asgData.length;
        const totalPossibleSubmissions = totalAsgs * totalStudentsCount;
        let actualSubmissions = 0;
        asgData.forEach((a: any) => {
          actualSubmissions += (a.assignment_submissions || []).length;
        });
        asgCompRate = Math.round((actualSubmissions / totalPossibleSubmissions) * 100);
      }

      // 5. Individual student insights & attention detection
      let attentionCount = 0;
      const studentInsightsList: StudentInsight[] = enrolledStudents.map((st) => {
        const scores = studentQuizScoreMap[st.id] || [];
        const stQuizAvg = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

        const att = studentAttendanceMap[st.id] || { present: 0, total: 0 };
        const stAttRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : null;

        // Find weak concepts for this student (accuracy < 60% with at least 1 attempt)
        const weakConcepts: string[] = [];
        Object.keys(studentConceptMap).forEach((c) => {
          const rec = studentConceptMap[c]?.[st.id];
          if (rec && rec.total >= 1) {
            const acc = Math.round((rec.correct / rec.total) * 100);
            if (acc < 60) {
              weakConcepts.push(c);
            }
          }
        });

        // Compute trend
        let trend: "Improving" | "Stable" | "Needs Support" = "Stable";
        if (scores.length >= 2) {
          const recent = scores[scores.length - 1];
          const previous = scores[scores.length - 2];
          if (recent > previous + 5) trend = "Improving";
          else if (recent < previous - 5) trend = "Needs Support";
        } else if (stQuizAvg !== null && stQuizAvg < 60) {
          trend = "Needs Support";
        }

        // Requires attention condition: quiz average < 60% OR attendance < 75% OR has multiple weak concepts
        const requiresAttention = Boolean(
          (stQuizAvg !== null && stQuizAvg < 60) ||
          (stAttRate !== null && stAttRate < 75) ||
          weakConcepts.length >= 2
        );

        if (requiresAttention) attentionCount++;

        // Actionable guidance
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

      // Sort: students requiring attention first
      studentInsightsList.sort((a, b) => (b.requiresAttention ? 1 : 0) - (a.requiresAttention ? 1 : 0));
      setStudentInsights(studentInsightsList);

      setOverview({
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
      });
    } catch (err: any) {
      console.error("Error computing faculty analytics:", err);
      toast.error("Failed to calculate analytics: " + (err.message || "Unknown error"));
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (selectedCohortId) {
      fetchAnalyticsForCohort(selectedCohortId);
    }
  }, [selectedCohortId, teachingCohorts]);

  const selectedCohort = teachingCohorts.find((c) => c.id === selectedCohortId);

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                Academic Analytics & Diagnostic Insights
              </Badge>
              <span className="text-xs text-muted-foreground">• Real Database Data</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              Class Analytics & Diagnostics
            </h1>
            <p className="text-sm text-muted-foreground">
              Objective diagnostics calculated directly from actual student submissions, attendance records, and topic evaluations.
            </p>
          </div>

          <div className="w-full sm:w-80">
            <Label htmlFor="an-cohort" className="text-xs font-semibold text-muted-foreground block mb-1">
              Select Teaching Assignment
            </Label>
            <select
              id="an-cohort"
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              disabled={loadingCohorts || teachingCohorts.length === 0}
              className="w-full h-10 rounded-md border bg-background px-3 text-xs font-semibold"
            >
              {teachingCohorts.length === 0 ? (
                <option value="">No teaching assignments allocated</option>
              ) : (
                teachingCohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject_name} ({c.subject_code || "SUB"}) · {c.classroom?.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {loadingStats ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : !selectedCohort ? (
          <Card className="border-dashed p-12 text-center bg-muted/20">
            <p className="text-sm text-muted-foreground">No teaching cohort selected.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Cohort Header Card */}
            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs mb-1">
                      {selectedCohort.subject_code || "SUBJECT"}
                    </Badge>
                    <CardTitle className="text-xl font-extrabold text-foreground">
                      {selectedCohort.subject_name} · {selectedCohort.classroom?.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedCohort.classroom?.course} • {selectedCohort.classroom?.branch} • Year {selectedCohort.classroom?.year}, Section {selectedCohort.classroom?.section} • {overview.totalStudents} Enrolled Students
                    </CardDescription>
                  </div>
                  {overview.studentsRequiringAttentionCount > 0 && (
                    <Badge variant="destructive" className="text-xs gap-1 self-start sm:self-auto py-1 px-2.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{overview.studentsRequiringAttentionCount} Students Require Attention</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 4 Core Pillars Overview */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Quiz Performance</span>
                      <FileCheck2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {overview.quizAverage !== null ? `${overview.quizAverage}%` : "No data"}
                    </div>
                    {overview.quizAverage !== null ? (
                      <>
                        <Progress value={overview.quizAverage} className="h-1.5 bg-muted" />
                        <p className="text-[10px] text-muted-foreground pt-0.5">
                          High: {overview.highestScore}% · Low: {overview.lowestScore}% ({overview.quizzesAttemptedCount} attempts)
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground pt-1">No quiz attempts yet</p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Session Attendance</span>
                      <CalendarCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {overview.attendanceRate !== null ? `${overview.attendanceRate}%` : "No data"}
                    </div>
                    {overview.attendanceRate !== null ? (
                      <>
                        <Progress value={overview.attendanceRate} className="h-1.5 bg-muted" />
                        <p className="text-[10px] text-muted-foreground pt-0.5">
                          Across {overview.sessionsCount} recorded class sessions
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground pt-1">No sessions recorded yet</p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Coursework Completion</span>
                      <ClipboardList className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {overview.assignmentCompletionRate !== null ? `${overview.assignmentCompletionRate}%` : "No data"}
                    </div>
                    {overview.assignmentCompletionRate !== null ? (
                      <>
                        <Progress value={overview.assignmentCompletionRate} className="h-1.5 bg-muted" />
                        <p className="text-[10px] text-muted-foreground pt-0.5">
                          {overview.assignmentsCount} assignments active
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground pt-1">No assignments posted yet</p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cohort Engagement</span>
                      <Users className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {overview.uniqueStudentsAttempted}/{overview.totalStudents}
                    </div>
                    <Progress
                      value={overview.totalStudents > 0 ? (overview.uniqueStudentsAttempted / overview.totalStudents) * 100 : 0}
                      className="h-1.5 bg-muted"
                    />
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      Participated in diagnostic evaluations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
                <TabsTrigger value="overview" className="text-xs">
                  Topic & Concept Breakdown
                </TabsTrigger>
                <TabsTrigger value="attendance" className="text-xs">
                  Attendance by Session
                </TabsTrigger>
                <TabsTrigger value="students" className="text-xs">
                  Student Insights Roster ({studentInsights.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Topic & Concept Performance */}
              <TabsContent value="overview" className="space-y-6">
                {/* Topic Performance */}
                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      <span>Topic-Level Mastery</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Aggregate student accuracy across high-level subject topics in {selectedCohort.subject_name}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topicStats.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-muted/20 text-xs">
                        No topic performance data available yet. Quizzes with topic tags will populate this breakdown.
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {topicStats.map((t) => (
                          <div key={t.topic} className="p-3.5 rounded-xl border bg-card space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground truncate mr-2">{t.topic}</span>
                              <Badge
                                className={`text-xs ${
                                  t.pct >= 75
                                    ? "bg-emerald-600 text-white"
                                    : t.pct >= 60
                                    ? "bg-amber-500 text-white"
                                    : "bg-rose-600 text-white"
                                }`}
                              >
                                {t.pct}%
                              </Badge>
                            </div>
                            <Progress value={t.pct} className="h-1.5 bg-muted" />
                            <span className="text-[10px] text-muted-foreground block">
                              {t.correct} of {t.total} questions answered correctly
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Concept Mastery Breakdown */}
                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Award className="h-4 w-4 text-indigo-600" />
                      <span>Curriculum Concept Mastery & Student Drilldown</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Aggregate accuracy for fine-grained concepts. Click any concept to view student-by-student mastery.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {conceptStats.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-muted/20 text-xs">
                        No concept diagnostics available yet. As students take quizzes with concept tags, mastery signals will appear here.
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {conceptStats.map((cm) => {
                          const isDrilldown = selectedConceptDrilldown === cm.concept;
                          const studentsForConcept = conceptStudentDrilldown[cm.concept] || [];

                          return (
                            <div
                              key={cm.concept}
                              className="p-3 rounded-xl border bg-card space-y-2 text-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
                            >
                              <div
                                onClick={() => setSelectedConceptDrilldown(isDrilldown ? null : cm.concept)}
                                className="flex items-center justify-between cursor-pointer group"
                              >
                                <div>
                                  <span className="font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                                    {cm.concept}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    {cm.correct}/{cm.total} correct overall • Click to {isDrilldown ? "hide" : "view"} student breakdown
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    className={`text-xs ${
                                      cm.pct >= 75
                                        ? "bg-emerald-600 text-white"
                                        : cm.pct >= 50
                                        ? "bg-amber-500 text-white"
                                        : "bg-rose-600 text-white"
                                    }`}
                                  >
                                    {cm.pct}%
                                  </Badge>
                                  {isDrilldown ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>

                              <Progress value={cm.pct} className="h-1.5 bg-muted" />

                              {/* Student-by-student drilldown list */}
                              {isDrilldown && (
                                <div className="pt-2 border-t space-y-1.5 mt-2">
                                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                                    <span>Student Roster ({studentsForConcept.length})</span>
                                    <span>Accuracy</span>
                                  </div>

                                  {studentsForConcept.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground py-1">
                                      No student attempts recorded for this concept yet.
                                    </p>
                                  ) : (
                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                      {studentsForConcept.map((st) => (
                                        <div
                                          key={st.studentId}
                                          className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-[11px]"
                                        >
                                          <div className="truncate mr-2">
                                            <span className="font-semibold text-foreground">{st.name}</span>
                                            <span className="text-muted-foreground ml-1 font-mono text-[10px]">
                                              ({st.rollNumber})
                                            </span>
                                          </div>
                                          <div className="flex-shrink-0 text-right">
                                            {st.total > 0 ? (
                                              <span
                                                className={`font-bold ${
                                                  st.pct >= 75
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : st.pct >= 50
                                                    ? "text-amber-600 dark:text-amber-400"
                                                    : "text-rose-600 dark:text-rose-400"
                                                }`}
                                              >
                                                {st.pct}% ({st.correct}/{st.total})
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground text-[10px]">
                                                Not attempted
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Attendance by Session */}
              <TabsContent value="attendance" className="space-y-4">
                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-emerald-600" />
                      <span>Session Attendance Records</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Official attendance roll logs per teaching session in {selectedCohort.subject_name}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sessionAttendanceStats.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-muted/20 text-xs">
                        No class sessions recorded yet. Use the Attendance tab to log sessions.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessionAttendanceStats.map((sess) => (
                          <div key={sess.id} className="p-4 rounded-xl border bg-card space-y-2 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-bold text-foreground text-sm">
                                  {sess.date}
                                </span>
                                {sess.topic && (
                                  <span className="ml-2 text-muted-foreground font-medium">
                                    • Topic: {sess.topic}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {sess.presentCount} Present
                                </span>
                                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                  {sess.absentCount} Absent
                                </span>
                                <Badge variant="outline" className="font-bold">
                                  {sess.pct}% Turnout
                                </Badge>
                              </div>
                            </div>
                            <Progress value={sess.pct} className="h-1.5 bg-muted" />
                            {sess.absentStudents.length > 0 && (
                              <div className="pt-1 text-[11px] text-muted-foreground">
                                <span className="font-semibold text-rose-600 dark:text-rose-400 mr-1">Absent:</span>
                                {sess.absentStudents.map((s, idx) => (
                                  <span key={s.rollNumber}>
                                    {s.name} ({s.rollNumber})
                                    {idx < sess.absentStudents.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Student Insights Roster */}
              <TabsContent value="students" className="space-y-4">
                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>Individual Student Academic Diagnostics</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Evidence-based signals derived from each student's quiz submissions, weak concepts, and attendance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {studentInsights.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-muted/20 text-xs">
                        No students enrolled in this classroom cohort.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase text-[10px] border-b">
                            <tr>
                              <th className="p-3">Student</th>
                              <th className="p-3">Quiz Avg</th>
                              <th className="p-3">Attendance</th>
                              <th className="p-3">Weak Concepts</th>
                              <th className="p-3">Trend</th>
                              <th className="p-3">Actionable Support</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {studentInsights.map((st) => (
                              <tr
                                key={st.studentId}
                                className={`hover:bg-muted/30 transition-colors ${
                                  st.requiresAttention ? "bg-rose-500/5 dark:bg-rose-950/10" : ""
                                }`}
                              >
                                <td className="p-3">
                                  <div className="font-semibold text-foreground">{st.name}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{st.rollNumber}</div>
                                </td>
                                <td className="p-3">
                                  {st.quizAverage !== null ? (
                                    <span
                                      className={`font-bold ${
                                        st.quizAverage >= 70
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : st.quizAverage >= 50
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-rose-600 dark:text-rose-400"
                                      }`}
                                    >
                                      {st.quizAverage}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">No quizzes</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {st.attendanceRate !== null ? (
                                    <span
                                      className={`font-bold ${
                                        st.attendanceRate >= 75
                                          ? "text-foreground"
                                          : "text-rose-600 dark:text-rose-400"
                                      }`}
                                    >
                                      {st.attendanceRate}% ({st.sessionsAttended}/{st.totalSessions})
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">No records</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {st.weakConcepts.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {st.weakConcepts.map((c) => (
                                        <Badge key={c} variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] py-0">
                                          {c}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">None detected</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1 font-medium">
                                    {st.trend === "Improving" ? (
                                      <>
                                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Improving</span>
                                      </>
                                    ) : st.trend === "Needs Support" ? (
                                      <>
                                        <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                                        <span className="text-rose-600 dark:text-rose-400">Needs Support</span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">Stable</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 max-w-xs text-muted-foreground text-[11px] leading-tight">
                                  {st.suggestedSupport}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </FacultyLayout>
  );
}
