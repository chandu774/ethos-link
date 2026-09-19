import { useState, useEffect } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
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
  ChevronDown,
  ChevronUp,
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

export default function FacultyAnalyticsPage() {
  const { user } = useAuth();

  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [teachingCohorts, setTeachingCohorts] = useState<TeachingCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<{
    totalStudents: number;
    quizAverage: number | null;
    quizzesAttemptedCount: number;
    attendanceRate: number | null;
    sessionsCount: number;
    assignmentCompletionRate: number | null;
    assignmentsCount: number;
    conceptMastery: { concept: string; correct: number; total: number; pct: number }[];
  }>({
    totalStudents: 0,
    quizAverage: null,
    quizzesAttemptedCount: 0,
    attendanceRate: null,
    sessionsCount: 0,
    assignmentCompletionRate: null,
    assignmentsCount: 0,
    conceptMastery: [],
  });

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
      // 1. Total students in this classroom & student profile roster
      const { data: membersData } = await supabase
        .from("classroom_members")
        .select(`
          student_id,
          student:profiles!classroom_members_student_id_fkey (
            id,
            full_name,
            roll_number,
            email
          )
        `)
        .eq("classroom_id", cohort.classroom_id);

      const enrolledStudents = (membersData || []).map((m: any) => ({
        id: m.student_id,
        name: m.student?.full_name || "Student",
        rollNumber: m.student?.roll_number || "—",
      }));
      const totalSt = enrolledStudents.length;

      // 2. Attendance rate from class_sessions & attendance_records
      const { data: sessionData } = await supabase
        .from("class_sessions")
        .select(`
          id,
          attendance_records(status)
        `)
        .eq("teaching_assignment_id", cohortId);

      let attRate: number | null = null;
      let totalSessions = 0;
      if (sessionData && sessionData.length > 0) {
        totalSessions = sessionData.length;
        let totalPresent = 0;
        let totalRecords = 0;
        sessionData.forEach((s: any) => {
          (s.attendance_records || []).forEach((r: any) => {
            totalRecords++;
            if (r.status === "present") totalPresent++;
          });
        });
        if (totalRecords > 0) {
          attRate = Math.round((totalPresent / totalRecords) * 100);
        }
      }

      // 3. Quiz average from quizzes & quiz_attempts & student concept breakdown
      const { data: quizData } = await supabase
        .from("quizzes")
        .select(`
          id,
          quiz_attempts(id, student_id, score, max_score, answers)
        `)
        .eq("teaching_assignment_id", cohortId);

      let qAvg: number | null = null;
      let totalAttempts = 0;
      const conceptMap: Record<string, { correct: number; total: number }> = {};
      const studentConceptMap: Record<string, Record<string, { correct: number; total: number }>> = {};

      if (quizData && quizData.length > 0) {
        let totalPctSum = 0;
        quizData.forEach((q: any) => {
          (q.quiz_attempts || []).forEach((att: any) => {
            totalAttempts++;
            const pct = ((att.score || 0) / (att.max_score || 1)) * 100;
            totalPctSum += pct;

            const stId = att.student_id;

            // Gather concept data from answers
            if (att.answers && typeof att.answers === "object") {
              Object.values(att.answers).forEach((ansItem: any) => {
                if (ansItem && ansItem.concept) {
                  const c = String(ansItem.concept).trim();
                  if (!conceptMap[c]) conceptMap[c] = { correct: 0, total: 0 };
                  conceptMap[c].total += 1;
                  if (ansItem.is_correct) conceptMap[c].correct += 1;

                  if (stId) {
                    if (!studentConceptMap[c]) studentConceptMap[c] = {};
                    if (!studentConceptMap[c][stId]) studentConceptMap[c][stId] = { correct: 0, total: 0 };
                    studentConceptMap[c][stId].total += 1;
                    if (ansItem.is_correct) studentConceptMap[c][stId].correct += 1;
                  }
                }
              });
            }
          });
        });

        if (totalAttempts > 0) {
          qAvg = Math.round(totalPctSum / totalAttempts);
        }
      }

      // Also query quiz_attempt_answers directly to ensure full coverage
      const quizIds = (quizData || []).map((q: any) => q.id);
      if (quizIds.length > 0) {
        const { data: qAnsRows } = await supabase
          .from("quiz_attempt_answers")
          .select("student_id, concept, is_correct")
          .in("quiz_id", quizIds);

        if (qAnsRows && qAnsRows.length > 0) {
          qAnsRows.forEach((r: any) => {
            if (r.concept) {
              const c = String(r.concept).trim();
              if (!conceptMap[c]) {
                conceptMap[c] = { correct: 0, total: 0 };
              }
              if (r.student_id) {
                if (!studentConceptMap[c]) studentConceptMap[c] = {};
                // If student doesn't have answers counted yet from JSON
                if (!studentConceptMap[c][r.student_id]) {
                  studentConceptMap[c][r.student_id] = { correct: 0, total: 0 };
                }
              }
            }
          });
        }
      }

      const conceptList = Object.entries(conceptMap).map(([concept, val]) => ({
        concept,
        correct: val.correct,
        total: val.total,
        pct: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      }));

      // Build student-by-student drilldown roster per concept
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

        // Sort: students with attempts first (by pct ascending so weakest are at the top)
        studentStats.sort((a, b) => {
          if (a.total === 0 && b.total > 0) return 1;
          if (a.total > 0 && b.total === 0) return -1;
          return a.pct - b.pct;
        });

        conceptDrilldown[c] = studentStats;
      });
      setConceptStudentDrilldown(conceptDrilldown);

      // 4. Assignment completion rate
      const { data: asgData } = await supabase
        .from("assignments")
        .select(`
          id,
          assignment_submissions(id)
        `)
        .eq("teaching_assignment_id", cohortId);

      let asgCompRate: number | null = null;
      let totalAsgs = 0;
      if (asgData && asgData.length > 0 && totalSt > 0) {
        totalAsgs = asgData.length;
        const totalPossibleSubmissions = totalAsgs * totalSt;
        let actualSubmissions = 0;
        asgData.forEach((a: any) => {
          actualSubmissions += (a.assignment_submissions || []).length;
        });
        asgCompRate = Math.round((actualSubmissions / totalPossibleSubmissions) * 100);
      }

      setStats({
        totalStudents: totalSt,
        quizAverage: qAvg,
        quizzesAttemptedCount: totalAttempts,
        attendanceRate: attRate,
        sessionsCount: totalSessions,
        assignmentCompletionRate: asgCompRate,
        assignmentsCount: totalAsgs,
        conceptMastery: conceptList,
      });
    } catch (err: any) {
      console.error("Error computing analytics:", err);
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
              Objective analytics calculated directly from actual attendance sessions, quiz submissions, and student coursework.
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
                      {selectedCohort.classroom?.course} • {selectedCohort.classroom?.branch} • Year {selectedCohort.classroom?.year}, Section {selectedCohort.classroom?.section} • {stats.totalStudents} Enrolled Students
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 3 Core Pillars */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Quiz Performance</span>
                      <FileCheck2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {stats.quizAverage !== null ? `${stats.quizAverage}%` : "No data"}
                    </div>
                    {stats.quizAverage !== null ? (
                      <Progress value={stats.quizAverage} className="h-1.5 bg-muted" />
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
                      {stats.attendanceRate !== null ? `${stats.attendanceRate}%` : "No data"}
                    </div>
                    {stats.attendanceRate !== null ? (
                      <Progress value={stats.attendanceRate} className="h-1.5 bg-muted" />
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
                      {stats.assignmentCompletionRate !== null ? `${stats.assignmentCompletionRate}%` : "No data"}
                    </div>
                    {stats.assignmentCompletionRate !== null ? (
                      <Progress value={stats.assignmentCompletionRate} className="h-1.5 bg-muted" />
                    ) : (
                      <p className="text-[11px] text-muted-foreground pt-1">No assignments posted yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Concept Mastery Breakdown */}
            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-600" />
                  <span>Curriculum Concept Mastery</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Aggregate accuracy for each concept evaluated across student quiz submissions in {selectedCohort.subject_name}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.conceptMastery.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-xl bg-muted/20 text-xs">
                    Not enough diagnostic data available yet. Once students take quizzes with concept metadata, topic mastery levels will populate here.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {stats.conceptMastery.map((cm) => {
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
          </div>
        )}
      </div>
    </FacultyLayout>
  );
}
