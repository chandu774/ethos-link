import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Compass,
  FileText,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  GraduationCap,
  Play,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapse } from "@/hooks/useSynapse";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DemoRecommendation } from "@/data/demoData";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const synapse = useSynapse();
  const navigate = useNavigate();

  const [selectedWhyRec, setSelectedWhyRec] = useState<DemoRecommendation | null>(null);

  // Fetch real database tasks
  const { data: dbTasks = [] } = useQuery({
    queryKey: ["student-dashboard-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch student classroom cohort
  const { data: studentCohort } = useQuery({
    queryKey: ["student-classroom-cohort", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: memberData } = await supabase
        .from("classroom_members")
        .select(`
          classroom:classrooms!classroom_members_classroom_id_fkey(
            id,
            name,
            course,
            branch,
            year,
            section,
            academic_year
          )
        `)
        .eq("student_id", user.id)
        .maybeSingle();

      if (!memberData?.classroom) return null;
      const cls = memberData.classroom as any;

      const { data: teachingData } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          faculty:profiles!teaching_assignments_faculty_id_fkey(name)
        `)
        .eq("classroom_id", cls.id);

      return {
        ...cls,
        subjects: teachingData || [],
      };
    },
    enabled: !!user?.id,
  });

  const studentName = profile?.name?.split(" ")[0] || "Alex";
  const gaps = synapse.concepts.filter((c) => c.status === "gap");
  const openTasks = dbTasks.length > 0
    ? dbTasks.filter((t: any) => t.status !== "completed")
    : synapse.tasks.filter((t) => t.status !== "completed");
  const urgentTasks = openTasks.filter((t: any) => t.priority === "HIGH");
  const nextDueTask = openTasks.find((t: any) => t.deadline) || openTasks[0];

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header Hero */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Continuous Learning Loop
              </Badge>
              <span className="text-xs text-muted-foreground">• Powered by Synapse Intelligence</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Good morning, {studentName} 👋</h1>
            <p className="text-sm text-muted-foreground">
              Here is your personalized academic roadmap. Synapse detected 2 urgent priorities needing attention today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/my-learning")}
            >
              <Compass className="h-4 w-4 text-primary" />
              <span>Knowledge Map</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm shadow-primary/20"
              onClick={() => navigate("/ai-tutor")}
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI Tutor</span>
            </Button>
          </div>
        </div>

        {/* 4 Key Status Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Learning Health */}
          <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Learning Health</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{synapse.learningHealth}%</span>
                <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  {synapse.learningHealth >= 80 ? "Optimal" : "Attention"}
                </Badge>
              </div>
              <Progress value={synapse.learningHealth} className="mt-3 h-1.5" />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Composite of quiz mastery, timeliness & attendance
              </p>
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Class Attendance</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Calendar className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{synapse.overallAttendance}%</span>
                <span className="text-xs text-amber-500 font-medium">DBMS: 78%</span>
              </div>
              <Progress value={synapse.overallAttendance} className="mt-3 h-1.5" />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {synapse.missedClass.status === "completed" ? "All missed classes recovered" : "1 missed class recovery available"}
              </p>
            </CardContent>
          </Card>

          {/* Assignments / Tasks Due */}
          <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Assignments & Tasks</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                  <FileText className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{openTasks.length} pending</span>
                {urgentTasks.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {urgentTasks.length} urgent
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-xs text-foreground font-medium truncate">
                {nextDueTask ? nextDueTask.title : "No assignments pending"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {nextDueTask?.deadline ? `Due: ${new Date(nextDueTask.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "All coursework caught up!"}
              </p>
            </CardContent>
          </Card>

          {/* Learning Gaps */}
          <Card className={cn(
            "border-border/50 bg-card/70 shadow-sm backdrop-blur-sm transition",
            gaps.length > 0 && "border-amber-500/30 bg-amber-500/5"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Learning Gaps</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-500">{gaps.length} detected</span>
                <span className="text-xs text-muted-foreground">in 2 subjects</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {gaps.map((g) => (
                  <Badge key={g.id} variant="outline" className="border-amber-500/30 text-[10px] text-amber-600 dark:text-amber-400">
                    {g.name}: {g.mastery}%
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Targeted practice recommendations generated</p>
            </CardContent>
          </Card>
        </div>

        {/* My Classroom Cohort Card */}
        {studentCohort && (
          <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-background to-card shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white text-[10px]">
                      Enrolled Classroom
                    </Badge>
                    <span className="text-xs text-muted-foreground">• Academic Year {studentCohort.academic_year}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    {studentCohort.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {studentCohort.course} • {studentCohort.branch} • Year {studentCohort.year}, Sec {studentCohort.section}
                  </p>
                  {studentCohort.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {studentCohort.subjects.map((sub: any) => (
                        <Badge key={sub.id} variant="outline" className="text-xs bg-muted/40">
                          <span className="font-semibold text-foreground mr-1">{sub.subject_name}:</span>
                          <span className="text-muted-foreground">{sub.faculty?.name || "Faculty"}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                    onClick={() => navigate("/student/classrooms")}
                  >
                    <span>View Classroom Hub</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missed Class Recovery Banner (if active) */}
        {synapse.missedClass.status !== "completed" && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-background to-orange-500/10 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-amber-950 font-semibold text-[10px]">
                    MISSED CLASS DETECTED
                  </Badge>
                  <span className="text-xs text-muted-foreground">{synapse.missedClass.date}</span>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {synapse.missedClass.courseCode}: {synapse.missedClass.courseName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Topic: <strong className="text-foreground">{synapse.missedClass.topic}</strong>. Missed concepts:{" "}
                  {synapse.missedClass.missedConcepts.join(", ")}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right hidden md:block">
                  <span className="block text-xs font-semibold text-foreground">Estimated catch-up</span>
                  <span className="block text-xs text-muted-foreground">{synapse.missedClass.totalCatchupMinutes} minutes</span>
                </div>
                <Button
                  size="sm"
                  className="gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold"
                  onClick={() => navigate("/attendance-recovery")}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start Recovery Plan</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PRIMARY SECTION: "WHAT SHOULD I DO NEXT?" */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  TODAY'S PRIORITIES
                </h2>
                <Badge variant="secondary" className="border-0 bg-primary/10 text-primary text-[10px]">
                  What should I do next?
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Ranked actions dynamically calculated from deadlines, weak concepts, and lecture pace.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/student/tasks")}
            >
              <span>View all tasks</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {synapse.recommendations.map((rec) => {
              const isHigh = rec.priority === "HIGH";
              const isMedium = rec.priority === "MEDIUM";

              return (
                <Card
                  key={rec.id}
                  className={cn(
                    "relative overflow-hidden border transition-all duration-200 hover:shadow-md",
                    rec.completed
                      ? "border-border/40 bg-muted/30 opacity-70"
                      : isHigh
                      ? "border-primary/40 bg-card/90 shadow-sm"
                      : "border-border/50 bg-card/70"
                  )}
                >
                  {isHigh && !rec.completed && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
                  )}

                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isHigh ? "default" : isMedium ? "secondary" : "outline"}
                            className="text-[10px] uppercase font-bold"
                          >
                            {rec.priority} PRIORITY
                          </Badge>
                          <span className="text-xs font-semibold text-primary">{rec.courseCode}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {rec.estimatedMinutes} min
                          </span>
                        </div>
                        <h3 className={cn("text-base font-semibold text-foreground", rec.completed && "line-through")}>
                          {rec.title}
                        </h3>
                      </div>

                      {rec.completed && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-xs">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed
                        </Badge>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {rec.reason}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
                        onClick={() => setSelectedWhyRec(rec)}
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Why this?</span>
                      </Button>

                      {!rec.completed ? (
                        <Button
                          size="sm"
                          className={cn(
                            "h-8 gap-1.5 text-xs font-medium",
                            isHigh ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                          )}
                          onClick={() => navigate(rec.actionUrl)}
                        >
                          <span>{rec.actionLabel}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => navigate(rec.actionUrl)}
                        >
                          Review Again
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Weekly Workload & Quick Navigation Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Workload breakdown */}
          <Card className="border-border/50 bg-card/70 md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Weekly Study & Workload Forecast</CardTitle>
                  <CardDescription className="text-xs">Based on assignments, gaps & scheduled classes</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  Balanced (~1.2h / day)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { day: "Mon", effort: "45m", label: "DBMS Asgn", active: true },
                  { day: "Tue", effort: "35m", label: "2NF Review", active: true },
                  { day: "Wed", effort: "60m", label: "OS Lab", active: false },
                  { day: "Thu", effort: "25m", label: "CN Practice", active: false },
                  { day: "Fri", effort: "50m", label: "DBMS Quiz", active: false },
                ].map((d) => (
                  <div
                    key={d.day}
                    className={cn(
                      "rounded-xl border p-2.5 transition",
                      d.active ? "border-primary/40 bg-primary/5" : "border-border/40 bg-background/50"
                    )}
                  >
                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase">{d.day}</span>
                    <span className="block text-sm font-bold text-foreground">{d.effort}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                ?? <strong className="text-foreground">Recommended Plan Today:</strong> 20 min DBMS 2NF review + 30 min DBMS Assignment 3 + 15 min OS Virtual Memory catchup.
              </div>
            </CardContent>
          </Card>

          {/* Quick Hub Links */}
          <Card className="border-border/50 bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Portals</CardTitle>
              <CardDescription className="text-xs">Direct access to learning tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                to="/lectures/lec-dbms-norm"
                className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 p-2.5 transition hover:border-primary/40 hover:bg-background/80"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Lecture with Sign Language</p>
                    <p className="text-[10px] text-muted-foreground">DBMS Normalization</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/student/quizzes"
                className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 p-2.5 transition hover:border-primary/40 hover:bg-background/80"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Classroom Quizzes</p>
                    <p className="text-[10px] text-muted-foreground">Faculty Assessments</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/opportunities"
                className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 p-2.5 transition hover:border-primary/40 hover:bg-background/80"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Matched Scholarships</p>
                    <p className="text-[10px] text-muted-foreground">4 Opportunities for you</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* "Why This?" AI Explainability Modal */}
      <Dialog open={!!selectedWhyRec} onOpenChange={(open) => !open && setSelectedWhyRec(null)}>
        <DialogContent className="max-w-md">
          {selectedWhyRec && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                    AI Explainability
                  </Badge>
                  <span className="text-xs text-muted-foreground">{selectedWhyRec.courseCode}</span>
                </div>
                <DialogTitle className="text-lg font-bold">{selectedWhyRec.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  Transparent breakdown of why Synapse AI prioritized this action for you.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Detected Signals:
                  </h4>
                  <ul className="mt-2 space-y-1.5">
                    {selectedWhyRec.whyDetails.signals.map((sig, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                    Risk Factor
                  </span>
                  <p className="mt-0.5 text-xs text-foreground/90">{selectedWhyRec.whyDetails.riskFactor}</p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Projected Mastery Gain
                  </span>
                  <p className="mt-0.5 text-xs text-foreground/90">{selectedWhyRec.whyDetails.gain}</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedWhyRec(null)}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground font-medium"
                    onClick={() => {
                      const url = selectedWhyRec.actionUrl;
                      setSelectedWhyRec(null);
                      navigate(url);
                    }}
                  >
                    {selectedWhyRec.actionLabel}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}
