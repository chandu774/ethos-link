import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Clock,
  Sparkles,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { DEMO_COURSES } from "@/data/demoData";
import { cn } from "@/lib/utils";

export default function ProgressPage() {
  const synapse = useSynapse();

  const masteredCount = synapse.concepts.filter((c) => c.status === "mastered").length;
  const gapCount = synapse.concepts.filter((c) => c.status === "gap").length;
  const inProgressCount = synapse.concepts.filter((c) => c.status === "improving").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Comprehensive Analytics
              </Badge>
              <span className="text-xs text-muted-foreground">• Continuous Adaptive Tracking</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Academic Progress & Growth
            </h1>
            <p className="text-sm text-muted-foreground">
              Deep analytics on your concept mastery, quiz score trajectory, attendance correlation, and assignment velocity.
            </p>
          </div>
        </div>

        {/* 4 High-Level Metric Tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground">Learning Health Index</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{synapse.learningHealth}%</span>
                <span className="text-xs text-emerald-500 font-medium">+6% vs last week</span>
              </div>
              <Progress value={synapse.learningHealth} className="mt-2 h-1.5" />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground">Overall Attendance</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{synapse.overallAttendance}%</span>
                <span className="text-xs text-muted-foreground">Target: 85%</span>
              </div>
              <Progress value={synapse.overallAttendance} className="mt-2 h-1.5" />
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Mastered Concepts
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-500">{masteredCount}</span>
                <span className="text-xs text-muted-foreground">of {synapse.concepts.length} total</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Strong retention across 4 courses</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Remaining Gaps
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-500">{gapCount}</span>
                <span className="text-xs text-muted-foreground">under active recovery</span>
              </div>
              <p className="mt-2 text-[11px] text-amber-600/90 dark:text-amber-400/90 font-medium">
                2NF (46%), Virtual Memory (52%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course Performance Breakdown */}
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold">Subject Mastery & Attendance Correlation</CardTitle>
            <CardDescription className="text-xs">
              Demonstrating the direct link between attendance, concept mastery, and homework scores.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {DEMO_COURSES.map((course) => (
              <div key={course.id} className="space-y-2 rounded-xl border border-border/40 bg-background/50 p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary">{course.code}</span>
                    <span className="ml-2 text-sm font-semibold text-foreground">{course.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    Attendance: {course.attendanceRate}%
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Concept Mastery</span>
                      <span className="font-semibold text-foreground">{course.overallMastery}%</span>
                    </div>
                    <Progress value={course.overallMastery} className="mt-1 h-1.5" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Attendance Consistency</span>
                      <span className="font-semibold text-foreground">{course.attendanceRate}%</span>
                    </div>
                    <Progress
                      value={course.attendanceRate}
                      className={cn("mt-1 h-1.5", course.attendanceRate < 80 && "[&>div]:bg-amber-500")}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Concept Status Radar / Distribution */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/60 bg-card/80 md:col-span-2">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold">Concept Mastery Distribution</CardTitle>
              <CardDescription className="text-xs">
                Detailed view of individual concept skills in your portfolio.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {synapse.concepts.map((concept) => (
                <div key={concept.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                  <div className="space-y-0.5">
                    <span className="font-medium text-foreground">{concept.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{concept.courseCode} • {concept.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={concept.mastery}
                      className={cn(
                        "w-24 h-1.5",
                        concept.status === "gap" && "[&>div]:bg-amber-500",
                        concept.status === "mastered" && "[&>div]:bg-emerald-500"
                      )}
                    />
                    <span className={cn(
                      "font-mono font-bold w-10 text-right",
                      concept.status === "gap" ? "text-amber-500" : concept.status === "mastered" ? "text-emerald-500" : "text-foreground"
                    )}>
                      {concept.mastery}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Growth Highlights */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Growth Highlights</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  SQL Aggregations: 91%
                </span>
                <p className="mt-0.5 text-[11px] text-foreground/80">
                  Consistently top 5% in class on multi-table queries.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  CPU Scheduling: 88%
                </span>
                <p className="mt-0.5 text-[11px] text-foreground/80">
                  Mastered Round Robin and SJF algorithms.
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <span className="block text-xs font-bold text-amber-600 dark:text-amber-400">
                  Next Milestone: 2NF Mastery
                </span>
                <p className="mt-0.5 text-[11px] text-foreground/80">
                  Targeted review planned for today to boost mastery past 80%.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

