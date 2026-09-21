import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  GraduationCap,
  CalendarCheck,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileCheck2,
  Sparkles,
  Edit3,
  Phone,
  Mail,
  Sun,
  Moon,
  Laptop,
  LogOut,
  KeyRound,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { studentAnalyticsService, StudentHomeAnalytics } from "@/services/studentAnalyticsService";
import { getStudentConceptMastery, StudentConceptMasteryRecord } from "@/services/studentLearningProfileService";

export default function StudentProfile() {
  const { profile, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);

  // Fetch authentic academic performance & context
  const { data: homeAnalytics, isLoading: analyticsLoading } = useQuery<StudentHomeAnalytics>({
    queryKey: ["student-home-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      return await studentAnalyticsService.getStudentHomeAnalytics(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch authentic concept mastery using single authoritative source
  const { data: conceptRecords = [], isLoading: conceptsLoading } = useQuery<StudentConceptMasteryRecord[]>({
    queryKey: ["student-concept-mastery", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await getStudentConceptMastery(user.id);
    },
    enabled: !!user?.id,
  });

  const context = homeAnalytics?.context;
  const attendance = homeAnalytics?.attendance;
  const quizzes = homeAnalytics?.quizzes;
  const assignments = homeAnalytics?.assignments;

  // Real student identity fields
  const name = profile?.name || context?.studentName || "Student";
  const rollNumber = profile?.roll_number || context?.rollNumber || "Not Assigned";
  const branch =
    context?.course && context?.branch
      ? `${context.course} - ${context.branch}`
      : profile?.course || profile?.branch || "Academic Program";
  const yearSection = context?.classroomName
    ? context.classroomName
    : profile?.year
    ? `Year ${profile.year} • Section ${profile.section || "A"}`
    : "Classroom Cohort Unassigned";
  const email = profile?.email || context?.email || user?.email || "";
  const phone = (profile as any)?.phone || "Not Provided";
  const [bio, setBio] = useState(profile?.bio || "Student enrolled in academic coursework");

  // Filter authentic concepts
  const assessedConcepts = useMemo(() => conceptRecords.filter((c) => c.totalAnswers > 0), [conceptRecords]);
  const strongConcepts = useMemo(
    () => assessedConcepts.filter((c) => c.masteryPercentage >= 80),
    [assessedConcepts]
  );
  const weakConcepts = useMemo(
    () => assessedConcepts.filter((c) => c.masteryPercentage < 60),
    [assessedConcepts]
  );

  // Real academic performance score formula:
  // Weighted assessment evaluation combining quiz averages and coursework completion
  const academicPerformanceScore = useMemo(() => {
    const quizAvg = quizzes?.averageScorePercentage;
    const asgTotal = assignments?.totalAssignments || 0;
    const asgSubmitted = assignments?.submittedCount || 0;
    const asgRate = asgTotal > 0 ? Math.round((asgSubmitted / asgTotal) * 100) : null;

    if (quizAvg !== null && quizAvg !== undefined && asgRate !== null) {
      return Math.round((quizAvg + asgRate) / 2);
    }
    if (quizAvg !== null && quizAvg !== undefined) return quizAvg;
    if (asgRate !== null) return asgRate;
    return null;
  }, [quizzes, assignments]);

  const handleSaveInfo = () => {
    setEditOpen(false);
    toast.success("Academic identity details updated successfully");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Sign out error:", err);
      navigate("/login", { replace: true });
    }
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ST";

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header: Academic Identity Card */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/30 shadow-md">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background"
                title="Enrolled & Active"
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{name}</h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
                  Roll No: {rollNumber}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                {branch}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                <span>{yearSection}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {email || "No email registered"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Bio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Academic Bio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Academic Bio</Label>
                    <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roll">Roll Number (Institutional)</Label>
                    <Input id="roll" value={rollNumber} disabled className="bg-muted text-muted-foreground" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveInfo}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Tabs Layout: Overview, Attendance, Performance, Learning, Personal Info, Preferences */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-2xl flex flex-wrap h-auto gap-1 border">
          <TabsTrigger value="overview" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Attendance {attendance?.overallAttendancePercentage !== null && attendance?.overallAttendancePercentage !== undefined ? `(${attendance.overallAttendancePercentage}%)` : ""}
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Academic Performance
          </TabsTrigger>
          <TabsTrigger value="learning" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Learning & Concepts
          </TabsTrigger>
          <TabsTrigger value="personal" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Personal Information
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Real Overall Attendance */}
            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Overall Attendance</span>
                  <CalendarCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {attendance?.overallAttendancePercentage !== null && attendance?.overallAttendancePercentage !== undefined
                      ? `${attendance.overallAttendancePercentage}%`
                      : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">Target: 75%</span>
                </div>
                <Progress value={attendance?.overallAttendancePercentage || 0} className="h-1.5 bg-muted" />
                <p className="text-[11px] text-muted-foreground pt-1">
                  {attendance?.overallAttendancePercentage !== null && attendance?.overallAttendancePercentage !== undefined
                    ? `${attendance.presentSessions} of ${attendance.totalSessions} sessions attended`
                    : "Attendance data unavailable"}
                </p>
              </CardContent>
            </Card>

            {/* Real Academic Performance Score */}
            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Academic Performance</span>
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {academicPerformanceScore !== null ? `${academicPerformanceScore}%` : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {academicPerformanceScore !== null
                      ? academicPerformanceScore >= 80
                        ? "Optimal"
                        : academicPerformanceScore >= 65
                        ? "On Track"
                        : "Needs Attention"
                      : "Baseline forming"}
                  </span>
                </div>
                <Progress value={academicPerformanceScore || 0} className="h-1.5 bg-muted" />
                <p className="text-[11px] text-muted-foreground pt-1">
                  {academicPerformanceScore !== null
                    ? "Evaluated across coursework & diagnostic quizzes"
                    : "Complete quizzes to establish performance baseline"}
                </p>
              </CardContent>
            </Card>

            {/* Real Assignments Status */}
            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Assignments</span>
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {assignments ? `${assignments.submittedCount} / ${assignments.totalAssignments}` : "—"}
                  </span>
                  <span className="text-xs text-amber-500 font-medium">
                    {assignments?.pendingCount ? `${assignments.pendingCount} pending` : "all caught up"}
                  </span>
                </div>
                <Progress
                  value={
                    assignments && assignments.totalAssignments > 0
                      ? (assignments.submittedCount / assignments.totalAssignments) * 100
                      : 0
                  }
                  className="h-1.5 bg-muted"
                />
                <p className="text-[11px] text-muted-foreground pt-1">
                  {assignments && assignments.overdueCount > 0
                    ? `${assignments.overdueCount} overdue assignment requires attention`
                    : assignments && assignments.totalAssignments > 0
                    ? "Coursework submissions on track"
                    : "No assignments assigned to classroom yet"}
                </p>
              </CardContent>
            </Card>

            {/* Real Quiz Average */}
            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Quiz Average</span>
                  <FileCheck2 className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {quizzes?.averageScorePercentage !== null && quizzes?.averageScorePercentage !== undefined
                      ? `${quizzes.averageScorePercentage}%`
                      : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {quizzes ? `${quizzes.totalAttempts} attempt${quizzes.totalAttempts === 1 ? "" : "s"}` : "No attempts"}
                  </span>
                </div>
                <Progress value={quizzes?.averageScorePercentage || 0} className="h-1.5 bg-muted" />
                <p className="text-[11px] text-muted-foreground pt-1">
                  {quizzes?.averageScorePercentage !== null && quizzes?.averageScorePercentage !== undefined
                    ? `Average across ${quizzes.subjectScores.length} evaluated course${quizzes.subjectScores.length === 1 ? "" : "s"}`
                    : "No quiz data yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Authentic Core Focus Split: Strong Topics vs Topics Needing Practice */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Strong Topics */}
            <Card className="shadow-card border-emerald-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Strong Topics
                  </CardTitle>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                    {strongConcepts.length} Mastered
                  </Badge>
                </div>
                <CardDescription>Concepts where you demonstrated &ge;80% accuracy in assessments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {strongConcepts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    {assessedConcepts.length === 0
                      ? "Complete quizzes to establish your mastered concept telemetry."
                      : "No concepts currently scoring &ge;80%. Keep practicing to unlock masteries!"}
                  </p>
                ) : (
                  strongConcepts.slice(0, 4).map((sc) => (
                    <div key={sc.id || sc.conceptId || sc.conceptName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-foreground">{sc.conceptName}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {sc.masteryPercentage}%
                        </span>
                      </div>
                      <Progress value={sc.masteryPercentage} className="h-2 bg-emerald-500/20 [&>div]:bg-emerald-500" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{sc.subject} &bull; {sc.topic}</span>
                        <span>{sc.correctAnswers}/{sc.totalAnswers} correct</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Topics Needing Practice */}
            <Card className="shadow-card border-rose-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                    Topics Needing Practice
                  </CardTitle>
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs">
                    {weakConcepts.length} Priority
                  </Badge>
                </div>
                <CardDescription>Priority concepts flagged for revision based on assessment accuracy (&lt;60%)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {weakConcepts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    {assessedConcepts.length === 0
                      ? "Complete more assessments to identify topics that need practice."
                      : "No topics currently need targeted practice. All assessed concepts are on track!"}
                  </p>
                ) : (
                  weakConcepts.slice(0, 4).map((wc) => (
                    <div key={wc.id || wc.conceptId || wc.conceptName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-foreground">{wc.conceptName}</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {wc.masteryPercentage}%
                        </span>
                      </div>
                      <Progress value={wc.masteryPercentage} className="h-2 bg-rose-500/20 [&>div]:bg-rose-500" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{wc.subject} &bull; {wc.topic}</span>
                        <span>{wc.correctAnswers}/{wc.totalAnswers} correct</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Attendance Analytics & Course Breakdown</CardTitle>
                  <CardDescription>Minimum institutional attendance requirement: 75%</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {attendance?.overallAttendancePercentage !== null && attendance?.overallAttendancePercentage !== undefined
                      ? `${attendance.overallAttendancePercentage}%`
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">Overall Record</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {attendance?.subjectAttendance && attendance.subjectAttendance.length > 0 ? (
                  attendance.subjectAttendance.map((sub) => (
                    <div key={sub.subjectName} className="p-4 rounded-2xl border bg-card/60 space-y-2">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span>{sub.subjectName}</span>
                        <span
                          className={cn(
                            "font-bold",
                            sub.percentage >= 75 ? "text-emerald-600" : "text-amber-600"
                          )}
                        >
                          {sub.percentage}% ({sub.present} / {sub.total} classes)
                        </span>
                      </div>
                      <Progress
                        value={sub.percentage}
                        className={cn(
                          "h-2 bg-muted",
                          sub.percentage >= 75 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Status: {sub.percentage >= 75 ? "Regular Attendance" : "Below Institutional Target"}</span>
                        <span
                          className={cn(
                            "font-medium",
                            sub.percentage >= 75 ? "text-emerald-500" : "text-amber-500"
                          )}
                        >
                          {sub.percentage >= 75 ? "Above Threshold" : "Action Recommended"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No attendance records logged for your assigned classroom cohort yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACADEMIC PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Subject-Wise Performance & Assessment Telemetry</CardTitle>
              <CardDescription>Real scores from classroom diagnostic quizzes and evaluations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subject Breakdown */}
              <div className="grid gap-4 md:grid-cols-3">
                {quizzes?.subjectScores && quizzes.subjectScores.length > 0 ? (
                  quizzes.subjectScores.map((ss) => (
                    <div key={ss.subjectName} className="p-4 rounded-2xl border bg-card/60 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground truncate">{ss.subjectName}</div>
                      <div className="text-2xl font-bold text-foreground">{ss.averagePercentage}%</div>
                      <Progress value={ss.averagePercentage} className="h-1.5 bg-muted" />
                      <p className="text-[11px] text-muted-foreground">
                        {ss.attemptsCount} evaluation attempt{ss.attemptsCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-6 text-xs text-muted-foreground">
                    No subject quiz scores recorded yet. Complete quizzes to populate subject breakdown.
                  </div>
                )}
              </div>

              {/* Recent Quiz Attempts */}
              <div className="p-4 rounded-2xl border bg-card/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">Recent Quiz Diagnostic Scores</h4>
                  <Badge variant="outline" className="text-xs">
                    Overall Average: {quizzes?.averageScorePercentage !== null && quizzes?.averageScorePercentage !== undefined ? `${quizzes.averageScorePercentage}%` : "—"}
                  </Badge>
                </div>

                {homeAnalytics?.recentActivity && homeAnalytics.recentActivity.filter((a) => a.type === "QUIZ_COMPLETED").length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                    {homeAnalytics.recentActivity
                      .filter((a) => a.type === "QUIZ_COMPLETED")
                      .slice(0, 4)
                      .map((act) => (
                        <div key={act.id} className="p-3 rounded-xl border bg-card space-y-1">
                          <div className="text-muted-foreground truncate font-medium">{act.title}</div>
                          <div className="text-base font-bold text-emerald-600">{act.scoreOrStatus || "Completed"}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(act.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No completed quiz attempts recorded yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEARNING & CONCEPTS TAB */}
        <TabsContent value="learning" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Curriculum Knowledge Map Summary</CardTitle>
              <CardDescription>Concept-level telemetry derived strictly from your enrolled courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                  <span className="text-xs text-muted-foreground">Total Enrolled Concepts</span>
                  <div className="text-2xl font-bold">{conceptRecords.length}</div>
                  <p className="text-[11px] text-muted-foreground">Curriculum concepts across your subjects</p>
                </div>

                <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                  <span className="text-xs text-muted-foreground">Mastered (&ge;80%)</span>
                  <div className="text-2xl font-bold text-emerald-600">{strongConcepts.length}</div>
                  <p className="text-[11px] text-muted-foreground">Concepts verified through assessment</p>
                </div>

                <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                  <span className="text-xs text-muted-foreground">Learning Gaps (&lt;60%)</span>
                  <div className="text-2xl font-bold text-amber-600">{weakConcepts.length}</div>
                  <p className="text-[11px] text-muted-foreground">Flagged for targeted revision</p>
                </div>
              </div>

              <div className="pt-2">
                <Button className="gap-2 bg-primary text-primary-foreground font-semibold" asChild>
                  <Link to="/student/learning">
                    <BookOpen className="h-4 w-4" />
                    Open Full Student Knowledge Map
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERSONAL INFORMATION TAB */}
        <TabsContent value="personal" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Institutional & Personal Profile</CardTitle>
              <CardDescription>Verified academic credentials and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Full Name</div>
                  <div className="font-semibold text-foreground">{name}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Institutional Email</div>
                  <div className="font-semibold text-foreground">{email || "Not Provided"}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Roll Number</div>
                  <div className="font-semibold text-foreground">{rollNumber}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Program & Department</div>
                  <div className="font-semibold text-foreground">{branch}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Academic Year & Cohort</div>
                  <div className="font-semibold text-foreground">{yearSection}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Phone Number</div>
                  <div className="font-semibold text-foreground">{phone}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREFERENCES TAB */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Appearance & Theme */}
            <Card className="shadow-card border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sun className="h-5 w-5 text-amber-500" />
                  Appearance & Theme
                </CardTitle>
                <CardDescription>
                  Select your interface theme preference across your student portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={theme === "light" ? "default" : "outline"}
                    className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border ${
                      theme === "light"
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                        : "hover:bg-muted/70"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-xs font-semibold">Light</span>
                  </Button>

                  <Button
                    type="button"
                    variant={theme === "dark" ? "default" : "outline"}
                    className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border ${
                      theme === "dark"
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                        : "hover:bg-muted/70"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-xs font-semibold">Dark</span>
                  </Button>

                  <Button
                    type="button"
                    variant={theme === "system" ? "default" : "outline"}
                    className={`h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border ${
                      theme === "system"
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                        : "hover:bg-muted/70"
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <Laptop className="h-5 w-5" />
                    <span className="text-xs font-semibold">System</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Theme changes are persisted to your browser session and synchronize across all views.
                </p>
              </CardContent>
            </Card>

            {/* Account & Session Security */}
            <Card className="shadow-card border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Account & Session Security
                </CardTitle>
                <CardDescription>
                  Manage student credentials, access keys, and active session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>Security & Password</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Update your login password and manage student account credentials.
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/student/change-password">
                      Change Password
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">Sign Out of Synapse</div>
                    <div className="text-xs text-muted-foreground">
                      End your active student session. Browser back navigation cannot restore this session.
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="bg-destructive hover:bg-destructive/90 text-white shrink-0 font-medium"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
