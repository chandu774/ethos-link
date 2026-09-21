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
  BookOpen,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { RecommendedLearningSection } from "@/components/dashboard/RecommendedLearningSection";
import {
  studentAnalyticsService,
  StudentHomeAnalytics,
  StudentPriorityAction,
} from "@/services/studentAnalyticsService";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [selectedWhyRec, setSelectedWhyRec] = useState<StudentPriorityAction | null>(null);

  // Fetch real consolidated student academic analytics
  const { data: analytics, isLoading } = useQuery<StudentHomeAnalytics>({
    queryKey: ["student-home-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      return await studentAnalyticsService.getStudentHomeAnalytics(user.id);
    },
    enabled: !!user?.id,
  });

  const studentName = profile?.name?.split(" ")[0] || "Student";
  const context = analytics?.context;
  const attendance = analytics?.attendance;
  const quizzes = analytics?.quizzes;
  const assignments = analytics?.assignments;
  const priorities = analytics?.priorities || [];
  const learningHealth = analytics?.learningHealth;
  const healthStatus = analytics?.healthStatus || "Insufficient Data";

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
              <span className="text-xs text-muted-foreground">• Real-time Academic Telemetry</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Good day, {studentName} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {priorities.length > 0
                ? `Synapse identified ${priorities.length} prioritized academic action${priorities.length === 1 ? "" : "s"} needing attention.`
                : "All coursework caught up and no critical learning gaps detected."}
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

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Loading your real academic analytics...</p>
          </div>
        ) : (
          <>
            {/* 4 Key Real Status Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Learning Health */}
              <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Learning Health</span>
                    <span className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      learningHealth !== null && learningHealth >= 80 ? "bg-emerald-500/10 text-emerald-500" :
                      learningHealth !== null && learningHealth >= 65 ? "bg-blue-500/10 text-blue-500" :
                      learningHealth !== null ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                    )}>
                      <TrendingUp className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {learningHealth !== null ? `${learningHealth}%` : "—"}
                    </span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        healthStatus === "Optimal" && "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                        healthStatus === "On Track" && "text-blue-600 dark:text-blue-400 bg-blue-500/10",
                        healthStatus === "Needs Attention" && "text-amber-600 dark:text-amber-400 bg-amber-500/10",
                        healthStatus === "Insufficient Data" && "text-muted-foreground bg-muted"
                      )}
                    >
                      {healthStatus}
                    </Badge>
                  </div>
                  {learningHealth !== null ? (
                    <Progress value={learningHealth} className="mt-3 h-1.5" />
                  ) : (
                    <div className="mt-3 h-1.5 rounded-full bg-muted" />
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {learningHealth !== null
                      ? "Weighted metric: Quizzes (40%), Attendance (30%), Coursework (30%)"
                      : "Pending activity data (attend sessions or take quizzes)"}
                  </p>
                </CardContent>
              </Card>

              {/* 2. Attendance */}
              <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Class Attendance</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                      <Calendar className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {attendance?.overallAttendancePercentage !== null && attendance?.overallAttendancePercentage !== undefined
                        ? `${attendance.overallAttendancePercentage}%`
                        : "—"}
                    </span>
                    {attendance && attendance.totalSessions > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {attendance.presentSessions}/{attendance.totalSessions} sessions
                      </span>
                    )}
                  </div>
                  {attendance?.overallAttendancePercentage !== null && attendance?.overallAttendancePercentage !== undefined ? (
                    <Progress value={attendance.overallAttendancePercentage} className="mt-3 h-1.5" />
                  ) : (
                    <div className="mt-3 h-1.5 rounded-full bg-muted" />
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground truncate">
                    {attendance?.recentMissedClass
                      ? `Missed: ${attendance.recentMissedClass.subjectName} on ${attendance.recentMissedClass.date}`
                      : attendance?.totalSessions === 0
                      ? "No attendance sessions recorded yet"
                      : "All recorded sessions attended"}
                  </p>
                </CardContent>
              </Card>

              {/* 3. Assignments / Coursework */}
              <Card className="border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Assignments & Tasks</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                      <FileText className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {assignments?.pendingCount || 0} pending
                    </span>
                    {(assignments?.urgentCount || 0) > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {assignments?.urgentCount} urgent
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-foreground font-medium truncate">
                    {assignments?.nextDueAssignment?.title || (assignments?.totalAssignments === 0 ? "No assignments assigned" : "All coursework submitted!")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {assignments?.nextDueAssignment?.deadline
                      ? `Due: ${new Date(assignments.nextDueAssignment.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : assignments?.totalAssignments === 0
                      ? "Your faculty has not posted assignments yet"
                      : "Great job keeping coursework up to date"}
                  </p>
                </CardContent>
              </Card>

              {/* 4. Learning Gaps */}
              <Card className={cn(
                "border-border/50 bg-card/70 shadow-sm backdrop-blur-sm transition",
                quizzes && quizzes.learningGaps.length > 0 && "border-amber-500/30 bg-amber-500/5"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Learning Gaps</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={cn(
                      "text-2xl font-bold",
                      quizzes && quizzes.learningGaps.length > 0 ? "text-amber-500" : "text-foreground"
                    )}>
                      {quizzes?.learningGaps.length || 0} detected
                    </span>
                    <span className="text-xs text-muted-foreground">(&lt;65% accuracy)</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {quizzes && quizzes.learningGaps.length > 0 ? (
                      quizzes.learningGaps.slice(0, 2).map((g, idx) => (
                        <Badge key={idx} variant="outline" className="border-amber-500/30 text-[10px] text-amber-600 dark:text-amber-400">
                          {g.conceptName}: {g.masteryPercentage}%
                        </Badge>
                      ))
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {quizzes?.totalAttempts === 0
                          ? "Take quizzes to evaluate concept strengths"
                          : "All evaluated concepts performing well"}
                      </p>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {quizzes && quizzes.learningGaps.length > 0
                      ? "Targeted practice recommendations generated"
                      : "Objective assessment from submitted quizzes"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* My Classroom Cohort Card */}
            {context && context.classroomId && (
              <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-background to-card shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-600 text-white text-[10px]">
                          Enrolled Classroom
                        </Badge>
                        <span className="text-xs text-muted-foreground">• Academic Year {context.academicYear}</span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-600" />
                        {context.classroomName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {context.course} • {context.branch} • Year {context.year}, Sec {context.section} • Roll: {context.rollNumber || "Enrolled"}
                      </p>
                      {context.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {context.subjects.map((sub) => (
                            <Badge key={sub.id} variant="outline" className="text-xs bg-muted/40">
                              <span className="font-semibold text-foreground mr-1">{sub.subjectName}:</span>
                              <span className="text-muted-foreground">{sub.facultyName}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                        onClick={() => navigate("/student/learning")}
                      >
                        <span>View My Learning</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real Missed Class Recovery Banner (if genuinely absent) */}
            {attendance?.recentMissedClass && (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-background to-orange-500/10 p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500 text-amber-950 font-semibold text-[10px]">
                        MISSED CLASS DETECTED
                      </Badge>
                      <span className="text-xs text-muted-foreground">{attendance.recentMissedClass.date}</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {attendance.recentMissedClass.subjectName}: {attendance.recentMissedClass.topic}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {attendance.recentMissedClass.conceptsTaught.length > 0
                        ? `Concepts covered: ${attendance.recentMissedClass.conceptsTaught.join(", ")}.`
                        : "Catch up on curriculum topics covered during this classroom lecture."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {attendance.recentMissedClass.hasFacultyLecture ? (
                      <Button
                        size="sm"
                        className="gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold"
                        onClick={() => navigate(`/student/lectures?topic=${encodeURIComponent(attendance.recentMissedClass?.topic || "")}`)}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Watch Faculty Lecture</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold"
                        onClick={() => navigate("/student/learning")}
                      >
                        <span>Review in My Learning</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PRIMARY SECTION: "WHAT SHOULD I DO NEXT?" (REAL PRIORITIES) */}
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
                    Ranked academic actions dynamically derived from authentic deadlines, missed sessions, and learning gaps.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/student/tasks")}
                >
                  <span>View tasks</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>

              {priorities.length === 0 ? (
                <Card className="border-dashed p-8 text-center bg-muted/20">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">You're All Caught Up!</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                    No urgent assignment deadlines, recorded lecture absences, or critical concept gaps. Keep up the consistent academic work!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => navigate("/student/quizzes")}
                  >
                    Take a Diagnostic Quiz
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {priorities.map((rec) => {
                    const isHigh = rec.priority === "HIGH";
                    const isMedium = rec.priority === "MEDIUM";

                    return (
                      <Card
                        key={rec.id}
                        className={cn(
                          "relative overflow-hidden border transition-all duration-200 hover:shadow-md",
                          isHigh
                            ? "border-primary/40 bg-card/90 shadow-sm"
                            : "border-border/50 bg-card/70"
                        )}
                      >
                        {isHigh && (
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
                                <span className="text-xs font-semibold text-primary">{rec.subject}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> ~{rec.estimatedMinutes} min
                                </span>
                              </div>
                              <h3 className="text-base font-semibold text-foreground">
                                {rec.title}
                              </h3>
                            </div>
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PRESERVED: PERSONALIZED YOUTUBE LEARNING RECOMMENDATIONS */}
            <RecommendedLearningSection />

            {/* Coursework Deadlines & Quick Navigation Row */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Real Coursework Schedule */}
              <Card className="border-border/50 bg-card/70 md:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Coursework Deadlines & Enrolled Subjects</CardTitle>
                      <CardDescription className="text-xs">Active curriculum obligations for your classroom</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {assignments?.assignmentsList.length || 0} Assignments
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignments && assignments.assignmentsList.length > 0 ? (
                    <div className="space-y-2">
                      {assignments.assignmentsList.slice(0, 4).map((asgn) => (
                        <div
                          key={asgn.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-background/50 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{asgn.title}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {asgn.subject}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              Due: {new Date(asgn.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                "text-[10px]",
                                asgn.status === "submitted" && "bg-emerald-600 text-white",
                                asgn.status === "overdue" && "bg-destructive text-destructive-foreground",
                                asgn.status === "pending" && "bg-secondary text-secondary-foreground"
                              )}
                            >
                              {asgn.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => navigate("/student/assignments")}
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground rounded-xl bg-muted/20 border border-dashed">
                      No active assignments posted for your classroom cohort at this time.
                    </div>
                  )}

                  {context && context.subjects.length > 0 && (
                    <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">Registered Faculty:</span>
                      {context.subjects.map((sub) => (
                        <span key={sub.id} className="inline-flex items-center gap-1 text-[11px] bg-background/80 px-2 py-0.5 rounded-md border border-border/40">
                          <strong>{sub.subjectName}</strong> &bull; {sub.facultyName}
                        </span>
                      ))}
                    </div>
                  )}
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
                    to="/student/lectures"
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 p-2.5 transition hover:border-primary/40 hover:bg-background/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Course Video Lectures</p>
                        <p className="text-[10px] text-muted-foreground">Classroom Academic Resources</p>
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
                        <p className="text-[10px] text-muted-foreground">Verified Opportunities</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* "Why This?" AI Explainability Modal with Authentic Database Signals */}
      <Dialog open={!!selectedWhyRec} onOpenChange={(open) => !open && setSelectedWhyRec(null)}>
        <DialogContent className="max-w-md">
          {selectedWhyRec && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                    AI Explainability
                  </Badge>
                  <span className="text-xs text-muted-foreground">{selectedWhyRec.subject}</span>
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
                    {(selectedWhyRec.whyDetails?.signals || []).map((sig, idx) => (
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
                  <p className="mt-0.5 text-xs text-foreground/90">
                    {selectedWhyRec.whyDetails?.riskFactor || "Elevated learning gap detected"}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Projected Academic Gain
                  </span>
                  <p className="mt-0.5 text-xs text-foreground/90">
                    {selectedWhyRec.whyDetails?.projectedGain || "Improves overall course mastery"}
                  </p>
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

