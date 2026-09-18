import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Users,
  TrendingDown,
  TrendingUp,
  FileCheck2,
  CalendarCheck,
  ClipboardList,
  Video,
} from "lucide-react";
import { toast } from "sonner";

export default function FacultyAnalyticsPage() {
  const navigate = useNavigate();
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const handleGenerateRevisionQuiz = () => {
    setGeneratingQuiz(true);
    setTimeout(() => {
      setGeneratingQuiz(false);
      toast.success("Synapse AI created a 3-question targeted 2NF checkpoint quiz and deployed it to DBMS - CSE 3A!");
      navigate("/faculty/quizzes");
    }, 1200);
  };

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="border-b pb-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
              Academic Analytics & AI Insights
            </Badge>
            <span className="text-xs text-muted-foreground">• Evidence-Backed Diagnostics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
            Class Performance Summary & AI Insights
          </h1>
          <p className="text-sm text-muted-foreground">
            Cohort-level metrics, topic mastery bottlenecks, and evidence-driven intervention recommendations.
          </p>
        </div>

        {/* CLASS SUMMARY SECTION */}
        <Card className="shadow-card border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs mb-1">
                  Primary Cohort
                </Badge>
                <CardTitle className="text-xl font-extrabold">DBMS - CSE 3A</CardTitle>
                <CardDescription>CS301 • Database Management Systems • 62 Enrolled Students</CardDescription>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Overall Cohort Health</span>
                <div className="text-2xl font-bold text-emerald-600">76% Solid</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Top 4 Cohort Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Average Quiz</span>
                  <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">76%</div>
                <Progress value={76} className="h-1.5 bg-muted" />
              </div>

              <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Average Attendance</span>
                  <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">82%</div>
                <Progress value={82} className="h-1.5 bg-muted" />
              </div>

              <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Assignment Completion</span>
                  <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">87%</div>
                <Progress value={87} className="h-1.5 bg-muted" />
              </div>

              <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Lecture Completion</span>
                  <Video className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">79%</div>
                <Progress value={79} className="h-1.5 bg-muted" />
              </div>
            </div>

            {/* TOPIC MASTERY HEATMAP */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                TOPIC MASTERY BREAKDOWN
              </h3>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1.5">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Structured Query Language (SQL)</span>
                    <span className="text-emerald-600 font-extrabold">84% 🟢</span>
                  </div>
                  <Progress value={84} className="h-2 bg-emerald-500/20" />
                  <p className="text-xs text-muted-foreground">Strong performance in joins, aggregate queries, and subqueries.</p>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1.5">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Transactions & Concurrency</span>
                    <span className="text-emerald-600 font-extrabold">76% 🟢</span>
                  </div>
                  <Progress value={76} className="h-2 bg-emerald-500/20" />
                  <p className="text-xs text-muted-foreground">High retention of ACID properties and serializability concepts.</p>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1.5">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4" />
                      Normalization (1NF, 2NF, 3NF, BCNF)
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">53% ⚠️</span>
                  </div>
                  <Progress value={53} className="h-2 bg-rose-500/20" />
                  <p className="text-xs text-muted-foreground">Critical cohort bottleneck requiring targeted intervention.</p>
                </div>
              </div>
            </div>

            {/* AREAS NEEDING ATTENTION */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                AREAS NEEDING ATTENTION
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Normalization Module
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">18 students</strong> may benefit from additional practice and concept decomposition.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-1">
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    Second Normal Form (2NF)
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">12 students</strong> show low recent performance specifically on partial dependency checks.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EVIDENCE-BACKED AI INSIGHT */}
        <Card className="shadow-card border-indigo-500/40 bg-gradient-to-br from-card via-card to-indigo-500/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Lightbulb className="h-5 w-5" />
              <CardTitle className="text-lg font-bold">SYNAPSE AI INSIGHT & RECOMMENDATION</CardTitle>
            </div>
            <CardDescription>
              Objective analysis of cohort performance data with transparent evidence rationale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-5 rounded-2xl border bg-card/80 space-y-3">
              <div className="text-base font-extrabold text-foreground">
                "Normalization is currently the lowest-performing topic in DBMS."
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground border-l-2 border-indigo-500 pl-3">
                <div className="font-bold text-foreground">Evidence from Cohort Signals:</div>
                <div>• Average topic performance across 62 students is <strong>53%</strong>.</div>
                <div>• <strong>18 students</strong> are currently below the configured academic support threshold of 60%.</div>
                <div>• Assessment 3 accuracy on Question 2 (Partial dependencies with composite PKs) was only <strong>42%</strong>.</div>
                <div>• 4 students (including Rahul Kumar and Alex Chen) missed Lecture 14 covering relational decomposition.</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Recommended Intervention
                </div>
                <p className="text-sm font-medium text-foreground">
                  Create a short revision lesson and assign a targeted 3-question 2NF checkpoint quiz.
                </p>
              </div>

              <Button
                onClick={handleGenerateRevisionQuiz}
                disabled={generatingQuiz}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 shrink-0 shadow-md shadow-indigo-600/25"
              >
                <Sparkles className="h-4 w-4" />
                {generatingQuiz ? "Generating Checkpoint with AI..." : "Generate Revision Quiz"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FacultyLayout>
  );
}
