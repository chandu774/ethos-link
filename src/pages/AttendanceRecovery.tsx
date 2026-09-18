import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  BookOpen,
  FileCheck2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { DEMO_COURSES } from "@/data/demoData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AttendanceRecovery() {
  const navigate = useNavigate();
  const synapse = useSynapse();

  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const allStepsDone = [0, 1, 2].every((i) => completedSteps[i]);

  const handleCompletePlan = () => {
    synapse.markMissedClassRecovered();
    toast.success("Recovery plan completed! Attendance and Learning Health updated.");
    navigate("/dashboard");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Attendance Intelligence
              </Badge>
              <span className="text-xs text-muted-foreground">• Active Recovery Engine</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Attendance & Missed-Class Recovery
            </h1>
            <p className="text-sm text-muted-foreground">
              Synapse monitors attendance drops, connects missed lectures with course syllabi, and curates catch-up roadmaps.
            </p>
          </div>
        </div>

        {/* Course-wise Attendance Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_COURSES.map((course) => {
            const isLow = course.attendanceRate < 80;

            return (
              <Card
                key={course.id}
                className={cn(
                  "border transition",
                  isLow ? "border-amber-500/40 bg-amber-500/5 shadow-sm" : "border-border/60 bg-card/70"
                )}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{course.code}</span>
                    <Badge
                      variant={isLow ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {course.attendanceRate}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{course.name}</p>
                  <Progress
                    value={course.attendanceRate}
                    className={cn("h-1.5", isLow && "[&>div]:bg-amber-500")}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {course.missedClassesCount > 0
                      ? `${course.missedClassesCount} missed session needing catch-up`
                      : "Good attendance standing"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Missed Class Recovery Hub */}
        <Card className="overflow-hidden border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 shadow-md">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-amber-950 font-bold text-[10px]">
                    MISSED CLASS RECOVERY PLAN
                  </Badge>
                  <span className="text-xs text-muted-foreground">{synapse.missedClass.date}</span>
                </div>
                <CardTitle className="text-xl font-bold">
                  {synapse.missedClass.courseCode}: {synapse.missedClass.courseName}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Instructor: {synapse.missedClass.instructor} • Total catch-up duration: ~{synapse.missedClass.totalCatchupMinutes} minutes
                </CardDescription>
              </div>

              {synapse.missedClass.status === "completed" ? (
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs py-1 px-3 border-0">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Class Recovered
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-xs py-1 px-3">
                  Recovery Pending
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Topic & Concepts Missed */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Topics & Key Concepts Covered in This Session:
              </span>
              <div className="rounded-xl border border-border/50 bg-background/80 p-3">
                <p className="text-xs font-semibold text-foreground">{synapse.missedClass.topic}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {synapse.missedClass.missedConcepts.map((concept, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[11px] gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>{concept}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Curated 3-Step Recovery Roadmap */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Curated 30-Minute Recovery Roadmap:
              </span>

              {/* Step 1 */}
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-3.5 transition">
                <button
                  type="button"
                  className="mt-0.5"
                  onClick={() => toggleStep(0)}
                >
                  {completedSteps[0] ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-border/80 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      1
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Step 1: Watch Curated 15-Minute Core Lecture Segment
                    </span>
                    <Badge variant="outline" className="text-[10px]">15 min</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Jump straight to 19:42 where Dr. Thorne explains 2NF partial dependencies and schema decomposition.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 border-primary/40 text-primary mt-1"
                    onClick={() => navigate("/lectures/lec-dbms-norm?t=1182")}
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Watch Segment at 19:42</span>
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-3.5 transition">
                <button
                  type="button"
                  className="mt-0.5"
                  onClick={() => toggleStep(1)}
                >
                  {completedSteps[1] ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-border/80 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      2
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Step 2: Review Synthesized Lecture Cheat Sheet
                    </span>
                    <Badge variant="outline" className="text-[10px]">10 min</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Read the 2-page summarized notes on Armstrong axioms, 1NF/2NF rules, and candidate keys.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 border-primary/40 text-primary mt-1"
                    onClick={() => navigate("/notes")}
                  >
                    <BookOpen className="h-3 w-3" />
                    <span>Open Lecture Notes</span>
                  </Button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/80 p-3.5 transition">
                <button
                  type="button"
                  className="mt-0.5"
                  onClick={() => toggleStep(2)}
                >
                  {completedSteps[2] ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-border/80 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      3
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Step 3: Complete 3-Question Recovery Checkpoint
                    </span>
                    <Badge variant="outline" className="text-[10px]">5 min</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Verify that you understand partial dependency elimination before the upcoming class.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 border-primary/40 text-primary mt-1"
                    onClick={() => navigate("/assessments/quiz-2nf-targeted")}
                  >
                    <FileCheck2 className="h-3 w-3" />
                    <span>Take Checkpoint</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Complete Recovery Button */}
            <div className="pt-2 flex items-center justify-between border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                {allStepsDone
                  ? "All 3 steps completed! You are ready to close this recovery plan."
                  : "Mark steps as you finish them, or complete recovery now:"}
              </span>

              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                onClick={handleCompletePlan}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark Class as Recovered</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

