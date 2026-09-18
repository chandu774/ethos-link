import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  CalendarCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Video,
  ClipboardList,
  Send,
  BookOpen,
  Share2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { DEMO_FACULTY_STUDENTS, FacultyStudent } from "@/data/facultyDemoData";
import { toast } from "sonner";

export default function FacultyStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const student: FacultyStudent =
    DEMO_FACULTY_STUDENTS.find((s) => s.id === studentId) || DEMO_FACULTY_STUDENTS[0];

  const [sharedMaterial, setSharedMaterial] = useState(false);
  const [assignedQuiz, setAssignedQuiz] = useState(false);
  const [checkedLecture, setCheckedLecture] = useState(false);

  const handleShareRevision = () => {
    setSharedMaterial(true);
    toast.success(`Dispatched 2NF Relational Decomposition revision packet to ${student.name}`);
  };

  const handleAssignPractice = () => {
    setAssignedQuiz(true);
    toast.success(`Assigned 3-question targeted 2NF diagnostic quiz to ${student.name}`);
  };

  const handleCheckLecture = () => {
    setCheckedLecture(true);
    toast.success(`Sent automated prompt to ${student.name} for missed Lecture 14 recovery module`);
  };

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("");

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
                <AvatarFallback className="bg-indigo-600/10 text-indigo-600 font-extrabold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold text-foreground">{student.name}</h1>
                  {student.supportStatus === "needs_support" && (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs">
                      Support Candidate
                    </Badge>
                  )}
                  {student.supportStatus === "on_track" && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                      On Track
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-muted-foreground">{student.classroom}</p>
                <p className="text-xs text-muted-foreground">
                  Authorized Faculty View • Academic Performance & Intervention Metrics Only
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ACADEMIC SNAPSHOT */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">ACADEMIC SNAPSHOT</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Overall Performance</span>
                  <Award className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">{student.academicSnapshot.overallPerformance}%</div>
                <Progress value={student.academicSnapshot.overallPerformance} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Attendance</span>
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">{student.academicSnapshot.attendance}%</div>
                <Progress value={student.academicSnapshot.attendance} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Assignments</span>
                  <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">
                  {student.academicSnapshot.assignmentsCompleted}/{student.academicSnapshot.assignmentsTotal}
                </div>
                <Progress
                  value={(student.academicSnapshot.assignmentsCompleted / student.academicSnapshot.assignmentsTotal) * 100}
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
                <div className="text-2xl font-extrabold text-foreground">{student.academicSnapshot.quizAverage}%</div>
                <Progress value={student.academicSnapshot.quizAverage} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Lecture Completion</span>
                  <Video className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">{student.academicSnapshot.lectureCompletion}%</div>
                <Progress value={student.academicSnapshot.lectureCompletion} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SUBJECT PERFORMANCE & TOPIC PERFORMANCE */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* SUBJECT PERFORMANCE */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Subject Performance</CardTitle>
              <CardDescription>Academic evaluation across enrolled semester courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(student.subjectPerformance).map(([subject, score]) => (
                <div key={subject} className="space-y-1.5 p-3 rounded-xl border bg-card/60">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{subject}</span>
                    <span className="font-extrabold text-foreground">{score}%</span>
                  </div>
                  <Progress value={score} className="h-2 bg-muted" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* TOPIC PERFORMANCE */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Topic Performance: DBMS</CardTitle>
              <CardDescription>Diagnostic checkpoints and quiz question analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {student.topicPerformance.map((item) => {
                const icon =
                  item.status === "mastered"
                    ? "🟢"
                    : item.status === "improving"
                    ? "🟠"
                    : "🔴";
                return (
                  <div key={item.topic} className="flex items-center justify-between p-2.5 rounded-xl border bg-card/40 text-sm">
                    <span className="font-semibold flex items-center gap-2">
                      <span>{icon}</span>
                      {item.topic}
                    </span>
                    <span
                      className={`font-bold ${
                        item.status === "gap"
                          ? "text-rose-600 dark:text-rose-400"
                          : item.status === "improving"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {item.mastery}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* STRENGTHS & AREAS NEEDING SUPPORT */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                STRENGTHS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {student.strengths.map((str) => (
                <div key={str} className="p-3 rounded-xl bg-card border text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {str}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card border-rose-500/20 bg-rose-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                AREAS NEEDING SUPPORT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {student.areasNeedingSupport.map((area) => (
                <div key={area.topic} className="p-3 rounded-xl bg-card border text-sm font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    {area.topic}
                  </span>
                  <span className="font-extrabold text-rose-600">{area.mastery}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* VISUAL RECENT TRENDS */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Academic Trends (Visualized)</CardTitle>
            <CardDescription>Multi-week performance trajectory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quiz Performance Trend */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Quiz Performance Trend</span>
                <span className="text-rose-500 font-bold">Recent Dip: 82% → 76% → 61% → 48%</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {student.trends.quiz.map((score, i) => (
                  <div key={i} className="p-3 rounded-xl border bg-card space-y-1">
                    <div className="text-muted-foreground">Test {i + 1}</div>
                    <div className={`text-lg font-bold ${score < 65 ? "text-rose-600" : "text-foreground"}`}>
                      {score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Trend */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Attendance Trend</span>
                <span>Weekly: {student.trends.attendance.join("% → ")}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {student.trends.attendance.map((score, i) => (
                  <div key={i} className="p-3 rounded-xl border bg-card space-y-1">
                    <div className="text-muted-foreground">Month {i + 1}</div>
                    <div className="text-lg font-bold text-foreground">{score}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Completion Trend */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Assignment Completion Trend</span>
                <span>Sprint: {student.trends.assignmentCompletion.join("% → ")}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {student.trends.assignmentCompletion.map((score, i) => (
                  <div key={i} className="p-3 rounded-xl border bg-card space-y-1">
                    <div className="text-muted-foreground">Phase {i + 1}</div>
                    <div className="text-lg font-bold text-foreground">{score}%</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* POTENTIAL SUPPORT NEED & 1-CLICK INTERVENTIONS */}
        <Card className="shadow-card border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Send className="h-5 w-5" />
              <CardTitle className="text-base font-bold">POTENTIAL SUPPORT NEED</CardTitle>
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
                {student.supportSignals.map((signal, i) => (
                  <div key={i} className="p-3 rounded-xl border bg-card text-xs font-medium text-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                    {signal}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Recommended Support Actions:
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  onClick={handleShareRevision}
                  disabled={sharedMaterial}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {sharedMaterial ? "Revision Material Dispatched ✓" : "Share 2NF Revision Material"}
                </Button>

                <Button
                  onClick={handleAssignPractice}
                  disabled={assignedQuiz}
                  size="sm"
                  variant="outline"
                  className="border-indigo-500/40 text-indigo-600 dark:text-indigo-400 text-xs gap-1.5"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  {assignedQuiz ? "Practice Quiz Assigned ✓" : "Assign Targeted Practice"}
                </Button>

                <Button
                  onClick={handleCheckLecture}
                  disabled={checkedLecture}
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                >
                  <Video className="h-3.5 w-3.5" />
                  {checkedLecture ? "Recovery Prompt Sent ✓" : "Check Missed Lecture"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FacultyLayout>
  );
}
