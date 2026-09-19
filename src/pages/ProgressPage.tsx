import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Sparkles,
  Loader2,
  ChevronRight,
  RefreshCw,
  FolderTree,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { calculateConceptStatus, ConceptMasteryStatus } from "@/services/conceptMasteryRules";
import { cn } from "@/lib/utils";

interface ConceptMasteryRow {
  id: string;
  user_id: string;
  subject: string | null;
  topic: string | null;
  concept_name: string;
  mastery_percentage: number;
  status: ConceptMasteryStatus;
  trend: "improving" | "declining" | "stable" | null;
  total_questions: number;
  incorrect_count: number;
  latest_accuracy: number | null;
  historical_accuracy: number | null;
  last_assessed_at: string;
  correct_count: number;
  attempts_count: number;
}

interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number | null;
  completed_at: string;
  quiz?: {
    id: string;
    title: string;
    subject: string | null;
    topic: string;
    difficulty: string;
  } | null;
}

interface SubjectGroup {
  subject: string;
  topics: {
    topic: string;
    concepts: ConceptMasteryRow[];
  }[];
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [concepts, setConcepts] = useState<ConceptMasteryRow[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);

  const fetchProgressData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch real concept mastery records for this student
      const { data: cmData, error: cmErr } = await supabase
        .from("concept_mastery")
        .select("*")
        .eq("user_id", user.id)
        .order("last_assessed_at", { ascending: false });

      if (cmErr) throw cmErr;
      setConcepts((cmData as ConceptMasteryRow[]) || []);

      // 2. Fetch real quiz attempts with quiz metadata
      const { data: attData, error: attErr } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          quiz_id,
          score,
          max_score,
          percentage,
          completed_at,
          quiz:quizzes!quiz_attempts_quiz_id_fkey (
            id,
            title,
            subject,
            topic,
            difficulty
          )
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (attErr) throw attErr;
      setAttempts((attData as any[]) || []);
    } catch (err: any) {
      console.error("Error loading progress data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, [user]);

  // Aggregate high-level stats
  const strongCount = concepts.filter((c) => c.status === "Strong").length;
  const developingCount = concepts.filter((c) => c.status === "Developing").length;
  const needsPracticeCount = concepts.filter((c) => c.status === "Needs Practice" || c.status === "Weak").length;

  const averageScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((acc, cur) => {
            const pct =
              cur.percentage !== null && cur.percentage !== undefined
                ? cur.percentage
                : cur.max_score > 0
                ? (cur.score / cur.max_score) * 100
                : 0;
            return acc + pct;
          }, 0) / attempts.length
        )
      : null;

  // Group concepts into Subject -> Topic -> Concepts hierarchy
  const subjectGroups: SubjectGroup[] = [];
  concepts.forEach((c) => {
    const subName = c.subject || "General Academic";
    const topName = c.topic || "Core Curriculum";

    let sGroup = subjectGroups.find((g) => g.subject === subName);
    if (!sGroup) {
      sGroup = { subject: subName, topics: [] };
      subjectGroups.push(sGroup);
    }

    let tGroup = sGroup.topics.find((t) => t.topic === topName);
    if (!tGroup) {
      tGroup = { topic: topName, concepts: [] };
      sGroup.topics.push(tGroup);
    }

    tGroup.concepts.push(c);
  });

  // Highlight concepts needing recovery
  const focusConcepts = concepts.filter(
    (c) => c.status === "Weak" || c.status === "Needs Practice"
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Curriculum Analytics
              </Badge>
              <span className="text-xs text-muted-foreground">• Real Quiz Performance Data</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Academic Progress & Concept Mastery
            </h1>
            <p className="text-sm text-muted-foreground">
              Objective diagnostic tracking structured by Subject, Topic, and Concept based on your submitted assessments.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProgressData}
            disabled={loading}
            className="self-start sm:self-auto gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : concepts.length === 0 && attempts.length === 0 ? (
          /* Empty State when no quizzes attempted */
          <Card className="border-dashed p-12 text-center bg-muted/20">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <FileCheck2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No Diagnostic Data Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              Complete faculty-assigned quizzes to see your Subject &rarr; Topic &rarr; Concept mastery tree, historical accuracy trends, and personalized focus recommendations.
            </p>
            <Link to="/student/quizzes">
              <Button className="bg-primary text-primary-foreground font-semibold">
                Explore Available Quizzes
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* 4 High-Level Metric Tiles */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/60 bg-card/80 shadow-sm">
                <CardContent className="p-4">
                  <span className="text-xs text-muted-foreground">Average Assessment Score</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {averageScore !== null ? `${averageScore}%` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">across {attempts.length} attempts</span>
                  </div>
                  {averageScore !== null && <Progress value={averageScore} className="mt-2 h-1.5" />}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80 shadow-sm">
                <CardContent className="p-4">
                  <span className="text-xs text-muted-foreground">Assessed Concepts</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{concepts.length}</span>
                    <span className="text-xs text-muted-foreground">distinct concepts tracked</span>
                  </div>
                  <Progress
                    value={concepts.length > 0 ? (strongCount / concepts.length) * 100 : 0}
                    className="mt-2 h-1.5"
                  />
                </CardContent>
              </Card>

              <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
                <CardContent className="p-4">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Strong Mastery
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{strongCount}</span>
                    <span className="text-xs text-muted-foreground">(&ge; 80% accuracy)</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Consistent accuracy across multiple attempts
                  </p>
                </CardContent>
              </Card>

              <Card className={cn(
                "shadow-sm",
                needsPracticeCount > 0
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border/60 bg-card/80"
              )}>
                <CardContent className="p-4">
                  <span className={cn(
                    "text-xs font-semibold",
                    needsPracticeCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  )}>
                    Needs Focus / Practice
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={cn(
                      "text-2xl font-bold",
                      needsPracticeCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                    )}>
                      {needsPracticeCount}
                    </span>
                    <span className="text-xs text-muted-foreground">concept{needsPracticeCount === 1 ? "" : "s"}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {needsPracticeCount > 0 ? "Targeted review suggested below" : "All assessed concepts on track!"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Targeted Recovery / Focus Recommendations */}
            {focusConcepts.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
                <CardHeader className="pb-3 border-b border-amber-500/20">
                  <CardTitle className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Targeted Recovery & Concept Review</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-600/90 dark:text-amber-400/80">
                    The following concepts have lower diagnostic accuracy. Focus revision here before your next classroom evaluation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {focusConcepts.map((fc) => (
                      <div
                        key={fc.id}
                        className="rounded-xl border border-amber-500/20 bg-background/80 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{fc.concept_name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-semibold",
                              fc.status === "Weak"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            )}
                          >
                            {fc.status}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {fc.subject} &bull; {fc.topic}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-muted-foreground text-[11px]">
                            Accuracy: <strong>{fc.latest_accuracy ?? fc.mastery_percentage}%</strong>
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            ({fc.correct_count}/{fc.total_questions} correct)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subject -> Topic -> Concept Mastery Tree */}
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-primary" />
                      <span>Curriculum Mastery Tree</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Hierarchical view structured by Subject &rarr; Topic &rarr; Concept with deterministic mastery classifications.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {concepts.length} Concepts Tracked
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-6">
                {subjectGroups.map((sg) => (
                  <div key={sg.subject} className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <h3 className="font-bold text-sm text-foreground">{sg.subject}</h3>
                    </div>

                    <div className="space-y-4 pl-2 sm:pl-4">
                      {sg.topics.map((tg) => (
                        <div
                          key={tg.topic}
                          className="rounded-xl border border-border/50 bg-background/60 p-3.5 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              <span className="text-xs font-bold text-foreground">
                                Topic: {tg.topic}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {tg.concepts.length} evaluated concept{tg.concepts.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="grid gap-2.5 sm:grid-cols-2">
                            {tg.concepts.map((concept) => {
                              const acc =
                                concept.latest_accuracy ??
                                concept.historical_accuracy ??
                                concept.mastery_percentage;

                              return (
                                <div
                                  key={concept.id}
                                  className="rounded-lg border border-border/40 bg-card/70 p-3 space-y-2 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-foreground truncate">
                                      {concept.concept_name}
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {/* Trend Icon */}
                                      {concept.trend === "improving" ? (
                                        <span className="flex items-center text-emerald-500 text-[11px]" title="Improving Trend">
                                          <TrendingUp className="h-3 w-3 mr-0.5" />
                                        </span>
                                      ) : concept.trend === "declining" ? (
                                        <span className="flex items-center text-rose-500 text-[11px]" title="Declining Trend">
                                          <TrendingDown className="h-3 w-3 mr-0.5" />
                                        </span>
                                      ) : (
                                        <span className="flex items-center text-muted-foreground text-[11px]" title="Stable">
                                          <Minus className="h-3 w-3 mr-0.5" />
                                        </span>
                                      )}

                                      {/* Status Badge */}
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] font-bold px-1.5 py-0.5",
                                          concept.status === "Strong" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                                          concept.status === "Developing" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                                          concept.status === "Needs Practice" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                                          concept.status === "Weak" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                        )}
                                      >
                                        {concept.status}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                                      <span>Accuracy</span>
                                      <span className="font-mono font-bold text-foreground">{acc}%</span>
                                    </div>
                                    <Progress
                                      value={acc}
                                      className={cn(
                                        "h-1.5",
                                        acc >= 80 && "[&>div]:bg-emerald-500",
                                        acc >= 60 && acc < 80 && "[&>div]:bg-blue-500",
                                        acc >= 40 && acc < 60 && "[&>div]:bg-amber-500",
                                        acc < 40 && "[&>div]:bg-rose-500"
                                      )}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                                    <span>
                                      {concept.correct_count} of {concept.total_questions} questions correct
                                    </span>
                                    <span>
                                      {concept.last_assessed_at
                                        ? new Date(concept.last_assessed_at).toLocaleDateString()
                                        : "Recent"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Quiz Attempts Roster */}
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-primary" />
                      <span>Recent Quiz Submissions</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      History of your submitted assessments with score percentages and topics.
                    </CardDescription>
                  </div>
                  <Link to="/student/quizzes">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <span>View All Assessments</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {attempts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No quiz submissions found.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {attempts.map((att) => {
                      const pct =
                        att.percentage !== null && att.percentage !== undefined
                          ? att.percentage
                          : att.max_score > 0
                          ? Math.round((att.score / att.max_score) * 100)
                          : 0;

                      return (
                        <div
                          key={att.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-background/50 text-xs hover:bg-background/80 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground">
                              {att.quiz?.title || "Classroom Assessment"}
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {att.quiz?.subject ? `${att.quiz.subject} • ` : ""}
                              {att.quiz?.topic || "Diagnostic"} •{" "}
                              {new Date(att.completed_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-foreground">
                              {att.score} / {att.max_score} marks
                            </span>
                            <Badge
                              className={cn(
                                "text-xs font-bold",
                                pct >= 75
                                  ? "bg-emerald-600 text-white"
                                  : pct >= 50
                                  ? "bg-amber-500 text-white"
                                  : "bg-rose-600 text-white"
                              )}
                            >
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}


