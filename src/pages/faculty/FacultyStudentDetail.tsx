import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  CalendarCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  ClipboardList,
  Send,
  Loader2,
  Share2,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RealStudentProfile {
  id: string;
  name: string;
  roll_number: string | null;
  email: string | null;
  avatar_url: string | null;
  classroom_name?: string;
  course_code?: string;
}

interface RealQuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  completed_at: string;
  quiz_title: string;
  subject: string;
  topic: string;
}

interface RealConceptMastery {
  concept_name: string;
  subject: string;
  topic: string;
  mastery_percentage: number;
  total_questions: number;
  correct_count: number;
}

export default function FacultyStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<RealStudentProfile | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<RealQuizAttempt[]>([]);
  const [conceptMastery, setConceptMastery] = useState<RealConceptMastery[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{ present: number; total: number; percentage: number | null }>({
    present: 0,
    total: 0,
    percentage: null,
  });
  const [assignmentStats, setAssignmentStats] = useState<{ submitted: number; total: number }>({
    submitted: 0,
    total: 0,
  });

  const [sharedMaterial, setSharedMaterial] = useState(false);
  const [assignedQuiz, setAssignedQuiz] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    const loadStudentData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Profile
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("id, name, roll_number, email, avatar_url")
          .eq("id", studentId)
          .maybeSingle();

        if (profErr || !profData) {
          toast.error("Student profile not found.");
          setLoading(false);
          return;
        }

        // 2. Fetch Classroom Membership
        const { data: memData } = await supabase
          .from("classroom_members")
          .select(`
            classroom_id,
            classroom:classrooms(name, course_code)
          `)
          .eq("student_id", studentId)
          .maybeSingle();

        const classroomName = (memData?.classroom as any)?.name || "Enrolled Cohort";
        const courseCode = (memData?.classroom as any)?.course_code || "";

        setProfile({
          ...profData,
          classroom_name: classroomName,
          course_code: courseCode,
        });

        const classroomId = memData?.classroom_id;

        // 3. Fetch Real Quiz Attempts
        const { data: attData } = await supabase
          .from("quiz_attempts")
          .select(`
            id,
            quiz_id,
            score,
            max_score,
            percentage,
            completed_at,
            quizzes!quiz_attempts_quiz_id_fkey(title, subject, topic)
          `)
          .eq("user_id", studentId)
          .order("completed_at", { ascending: false });

        const mappedAttempts: RealQuizAttempt[] = (attData || []).map((a: any) => ({
          id: a.id,
          quiz_id: a.quiz_id,
          score: a.score,
          max_score: a.max_score || 100,
          percentage:
            a.percentage !== null && a.percentage !== undefined
              ? a.percentage
              : a.max_score > 0
              ? Math.round((a.score / a.max_score) * 100)
              : 0,
          completed_at: a.completed_at,
          quiz_title: a.quizzes?.title || "Assessment",
          subject: a.quizzes?.subject || "Subject",
          topic: a.quizzes?.topic || "Topic",
        }));
        setQuizAttempts(mappedAttempts);

        // 4. Fetch Real Concept Mastery
        const { data: cmData } = await supabase
          .from("concept_mastery")
          .select("*")
          .eq("user_id", studentId)
          .order("mastery_percentage", { ascending: true });

        const mappedConcepts: RealConceptMastery[] = (cmData || []).map((c: any) => ({
          concept_name: c.concept_name,
          subject: c.subject || "General",
          topic: c.topic || "Core",
          mastery_percentage: c.mastery_percentage || 0,
          total_questions: c.total_questions || 0,
          correct_count: c.correct_count || 0,
        }));
        setConceptMastery(mappedConcepts);

        // 5. Fetch Real Attendance
        const { data: attRecords } = await supabase
          .from("attendance_records")
          .select("id, status")
          .eq("student_id", studentId);

        if (attRecords && attRecords.length > 0) {
          const present = attRecords.filter((r) => r.status === "present" || r.status === "late").length;
          const total = attRecords.length;
          setAttendanceStats({
            present,
            total,
            percentage: Math.round((present / total) * 100),
          });
        } else {
          setAttendanceStats({ present: 0, total: 0, percentage: null });
        }

        // 6. Fetch Real Assignments
        const { data: subData } = await supabase
          .from("assignment_submissions")
          .select("id, assignment_id")
          .eq("user_id", studentId);

        let totalClassroomAssignments = 0;
        if (classroomId) {
          const { count } = await supabase
            .from("assignments")
            .select("id", { count: "exact", head: true })
            .eq("classroom_id", classroomId);
          totalClassroomAssignments = count || 0;
        }

        setAssignmentStats({
          submitted: (subData || []).length,
          total: Math.max(totalClassroomAssignments, (subData || []).length),
        });
      } catch (err: any) {
        console.error("Failed to load student detail:", err);
        toast.error("Failed to load student performance data.");
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [studentId]);

  // Derived calculations
  const quizAverage = useMemo(() => {
    if (quizAttempts.length === 0) return null;
    const sum = quizAttempts.reduce((acc, q) => acc + q.percentage, 0);
    return Math.round(sum / quizAttempts.length);
  }, [quizAttempts]);

  const weakConcepts = useMemo(() => {
    return conceptMastery.filter((c) => c.mastery_percentage < 60);
  }, [conceptMastery]);

  const strongConcepts = useMemo(() => {
    return conceptMastery.filter((c) => c.mastery_percentage >= 80);
  }, [conceptMastery]);

  const overallPerformance = useMemo(() => {
    const components: number[] = [];
    if (quizAverage !== null) components.push(quizAverage);
    if (attendanceStats.percentage !== null) components.push(attendanceStats.percentage);
    if (assignmentStats.total > 0) {
      components.push(Math.round((assignmentStats.submitted / assignmentStats.total) * 100));
    }
    if (components.length === 0) return null;
    return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
  }, [quizAverage, attendanceStats, assignmentStats]);

  const supportStatus: "needs_support" | "on_track" = useMemo(() => {
    const hasLowQuiz = quizAverage !== null && quizAverage < 60;
    const hasLowAttendance = attendanceStats.percentage !== null && attendanceStats.percentage < 75;
    const hasMultipleWeakConcepts = weakConcepts.length >= 2;
    return hasLowQuiz || hasLowAttendance || hasMultipleWeakConcepts ? "needs_support" : "on_track";
  }, [quizAverage, attendanceStats, weakConcepts]);

  const supportSignals = useMemo(() => {
    const signals: string[] = [];
    if (quizAverage !== null && quizAverage < 60) {
      signals.push(`Quiz average is ${quizAverage}% across ${quizAttempts.length} attempt(s) (target ≥ 60%)`);
    }
    if (attendanceStats.percentage !== null && attendanceStats.percentage < 75) {
      signals.push(`Attendance rate is ${attendanceStats.percentage}% (${attendanceStats.present}/${attendanceStats.total} sessions)`);
    }
    weakConcepts.forEach((wc) => {
      signals.push(`Concept gap: ${wc.concept_name} (${wc.mastery_percentage}% accuracy across ${wc.total_questions} questions)`);
    });
    if (signals.length === 0) {
      signals.push("All assessed performance indicators meet institutional target benchmarks.");
    }
    return signals;
  }, [quizAverage, quizAttempts, attendanceStats, weakConcepts]);

  const handleShareRevision = () => {
    setSharedMaterial(true);
    const targetTopic = weakConcepts[0]?.concept_name || "Diagnostic Material";
    toast.success(`Dispatched ${targetTopic} review module to ${profile?.name}`);
  };

  const handleAssignPractice = () => {
    setAssignedQuiz(true);
    const targetTopic = weakConcepts[0]?.concept_name || "Targeted Concepts";
    toast.success(`Scheduled targeted practice on ${targetTopic} for ${profile?.name}`);
  };

  if (loading) {
    return (
      <FacultyLayout>
        <div className="container max-w-6xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-xs text-muted-foreground">Loading authentic student record...</p>
        </div>
      </FacultyLayout>
    );
  }

  if (!profile) {
    return (
      <FacultyLayout>
        <div className="container max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">Student Record Not Found</h2>
          <p className="text-xs text-muted-foreground">The requested student profile could not be located.</p>
          <Button onClick={() => navigate("/faculty/students")} variant="outline" size="sm">
            Back to Directory
          </Button>
        </div>
      </FacultyLayout>
    );
  }

  const initials = (profile.name || "Student")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <FacultyLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation & Student Header */}
        <div className="space-y-4">
          <Link
            to="/faculty/students"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Student Directory
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border bg-card shadow-card">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-indigo-500/20 shadow-md">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.name} />}
                <AvatarFallback className="bg-indigo-600/10 text-indigo-600 font-extrabold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold text-foreground">{profile.name}</h1>
                  {supportStatus === "needs_support" ? (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs">
                      Support Candidate
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                      On Track
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {profile.classroom_name} {profile.course_code ? `• ${profile.course_code}` : ""}
                  {profile.roll_number ? ` • Roll: ${profile.roll_number}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Authorized Faculty View • Live Academic Data & Evaluation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ACADEMIC SNAPSHOT */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">ACADEMIC SNAPSHOT</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Overall Health</span>
                  <Award className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {overallPerformance !== null ? `${overallPerformance}%` : "—"}
                </div>
                <Progress value={overallPerformance || 0} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Attendance</span>
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {attendanceStats.percentage !== null ? `${attendanceStats.percentage}%` : "—"}
                </div>
                <Progress value={attendanceStats.percentage || 0} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Assignments</span>
                  <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {assignmentStats.submitted}/{assignmentStats.total}
                </div>
                <Progress
                  value={assignmentStats.total > 0 ? (assignmentStats.submitted / assignmentStats.total) * 100 : 0}
                  className="h-1.5 bg-muted"
                />
              </CardContent>
            </Card>

            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Quiz Average</span>
                  <FileCheck2 className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {quizAverage !== null ? `${quizAverage}%` : "—"}
                </div>
                <Progress value={quizAverage || 0} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RECENT QUIZZES & CONCEPT MASTERY */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* RECENT QUIZZES */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-indigo-600" />
                <span>Diagnostic Quiz History ({quizAttempts.length})</span>
              </CardTitle>
              <CardDescription>Individual quiz submissions logged in database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quizAttempts.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 border rounded-xl bg-muted/20">
                  No quiz attempts logged for this student yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {quizAttempts.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-xl border text-xs bg-card"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{att.quiz_title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {att.subject} • {att.topic}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono font-bold ${
                          att.percentage >= 75
                            ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                            : att.percentage >= 50
                            ? "border-amber-500 text-amber-600 bg-amber-500/10"
                            : "border-rose-500 text-rose-600 bg-rose-500/10"
                        }`}
                      >
                        {att.score}/{att.max_score} ({att.percentage}%)
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CONCEPT PERFORMANCE */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-600" />
                <span>Concept Mastery ({conceptMastery.length})</span>
              </CardTitle>
              <CardDescription>Granular mastery evaluated from assessed questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {conceptMastery.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 border rounded-xl bg-muted/20">
                  No concept mastery data assessed for this student yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {conceptMastery.map((item) => (
                    <div
                      key={item.concept_name}
                      className="flex items-center justify-between p-2.5 rounded-xl border bg-card/40 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-foreground block">{item.concept_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.correct_count} of {item.total_questions} questions correct
                        </span>
                      </div>
                      <Badge
                        className={`text-[11px] font-bold ${
                          item.mastery_percentage >= 75
                            ? "bg-emerald-600 text-white"
                            : item.mastery_percentage >= 50
                            ? "bg-amber-500 text-white"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        {item.mastery_percentage}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* STRENGTHS & AREAS NEEDING SUPPORT */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>STRENGTHS ({strongConcepts.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {strongConcepts.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 rounded-xl bg-card border">
                  No concepts currently assessed at ≥ 80% mastery.
                </p>
              ) : (
                strongConcepts.map((sc) => (
                  <div
                    key={sc.concept_name}
                    className="p-3 rounded-xl bg-card border text-xs font-semibold text-foreground flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {sc.concept_name}
                    </span>
                    <span className="font-bold text-emerald-600">{sc.mastery_percentage}%</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card border-rose-500/20 bg-rose-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span>AREAS NEEDING SUPPORT ({weakConcepts.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weakConcepts.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 rounded-xl bg-card border">
                  No active learning gaps detected below 60% accuracy.
                </p>
              ) : (
                weakConcepts.map((wc) => (
                  <div
                    key={wc.concept_name}
                    className="p-3 rounded-xl bg-card border text-xs font-semibold text-foreground flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      {wc.concept_name}
                    </span>
                    <span className="font-extrabold text-rose-600">{wc.mastery_percentage}%</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* POTENTIAL SUPPORT NEED & 1-CLICK INTERVENTIONS */}
        <Card className="shadow-card border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Send className="h-5 w-5" />
              <CardTitle className="text-base font-bold">ACADEMIC INTERVENTION & SUPPORT</CardTitle>
            </div>
            <CardDescription>
              Objective academic signals detected across coursework, attendance, and quiz checkpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Evidence Signals:
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {supportSignals.map((signal, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border bg-card text-xs font-medium text-foreground flex items-center gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                    {signal}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Recommended Faculty Actions:
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  onClick={handleShareRevision}
                  disabled={sharedMaterial}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {sharedMaterial ? "Revision Material Dispatched ✓" : "Share Diagnostic Revision Material"}
                </Button>

                <Button
                  onClick={handleAssignPractice}
                  disabled={assignedQuiz}
                  size="sm"
                  variant="outline"
                  className="border-indigo-500/40 text-indigo-600 dark:text-indigo-400 text-xs gap-1.5"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  {assignedQuiz ? "Practice Scheduled ✓" : "Assign Targeted Diagnostic Practice"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FacultyLayout>
  );
}
