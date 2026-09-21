import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowRight,
  BookOpen,
  Play,
  FileCheck2,
  Loader2,
  Clock,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  studentAnalyticsService,
  ConceptMasteryData,
  QuizMetrics,
  StudentAcademicContext,
  RecentActivityItem,
} from "@/services/studentAnalyticsService";
import {
  getStudentConceptMastery,
  StudentConceptMasteryRecord,
} from "@/services/studentLearningProfileService";

export default function MyLearning() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedConcept, setSelectedConcept] = useState<ConceptMasteryData | null>(null);
  const [activeSubject, setActiveSubject] = useState<string>("all");

  // Fetch real student academic context (enrolled classroom and subjects)
  const { data: context, isLoading: contextLoading } = useQuery<StudentAcademicContext | null>({
    queryKey: ["student-academic-context", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await studentAnalyticsService.getStudentAcademicContext(user.id);
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

  // Fetch real quiz attempts metrics
  const { data: quizMetrics, isLoading: metricsLoading } = useQuery<QuizMetrics>({
    queryKey: ["student-quiz-metrics", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      return await studentAnalyticsService.getStudentQuizMetrics(user.id);
    },
    enabled: !!user?.id,
  });

  // Fetch real recent activity timeline
  const { data: recentActivity = [] } = useQuery<RecentActivityItem[]>({
    queryKey: ["student-recent-activity", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await studentAnalyticsService.getStudentRecentActivity(user.id);
    },
    enabled: !!user?.id,
  });

  // Map authoritative records into ConceptMasteryData, maintaining strict DB identity
  const concepts: ConceptMasteryData[] = useMemo(() => {
    return conceptRecords.map((cr) => ({
      id: cr.id,
      conceptId: cr.conceptId,
      conceptName: cr.conceptName,
      subject: cr.subject,
      topic: cr.topic,
      masteryPercentage: cr.masteryPercentage,
      status: cr.status,
      trend: cr.trend,
      totalQuestions: cr.totalAnswers,
      correctCount: cr.correctAnswers,
      incorrectCount: Math.max(0, cr.totalAnswers - cr.correctAnswers),
      lastAssessedAt: cr.lastAssessedAt || new Date().toISOString(),
    }));
  }, [conceptRecords]);

  // Auto-select concept if URL parameter is present (?conceptId=xxx or ?concept=yyy)
  useEffect(() => {
    const conceptIdParam = searchParams.get("conceptId");
    const conceptNameParam = searchParams.get("concept");

    if (concepts.length > 0) {
      if (conceptIdParam) {
        const found = concepts.find((c) => c.id === conceptIdParam || c.conceptId === conceptIdParam);
        if (found) {
          setSelectedConcept(found);
          return;
        }
      }
      if (conceptNameParam) {
        const found = concepts.find((c) => c.conceptName.toLowerCase() === conceptNameParam.toLowerCase());
        if (found) setSelectedConcept(found);
      }
    }
  }, [searchParams, concepts]);

  const isLoading = contextLoading || conceptsLoading || metricsLoading;

  // Filtered concepts based on selected subject tab
  const filteredConcepts = useMemo(() => {
    return concepts.filter((c) => {
      if (activeSubject === "all") return true;
      return c.subject.toLowerCase() === activeSubject.toLowerCase();
    });
  }, [concepts, activeSubject]);

  // Aggregate stats from assessed concepts only (concepts with actual questions tested)
  const assessedConcepts = useMemo(() => concepts.filter((c) => c.totalQuestions > 0), [concepts]);
  const masteredConcepts = useMemo(() => assessedConcepts.filter((c) => c.masteryPercentage >= 80), [assessedConcepts]);
  const gapConcepts = useMemo(() => assessedConcepts.filter((c) => c.masteryPercentage < 60), [assessedConcepts]);

  // Pure average of assessed concept mastery percentages
  const averageMastery = useMemo(() => {
    if (assessedConcepts.length === 0) return null;
    const sum = assessedConcepts.reduce((acc, c) => acc + c.masteryPercentage, 0);
    return Math.round(sum / assessedConcepts.length);
  }, [assessedConcepts]);

  // Group concepts by Subject -> Topic (preserving exact DB records)
  interface GroupedTree {
    subject: string;
    topics: {
      topic: string;
      concepts: ConceptMasteryData[];
    }[];
  }

  const groupedTree = useMemo(() => {
    const tree: GroupedTree[] = [];
    filteredConcepts.forEach((c) => {
      let sGroup = tree.find((g) => g.subject.toLowerCase() === c.subject.toLowerCase());
      if (!sGroup) {
        sGroup = { subject: c.subject, topics: [] };
        tree.push(sGroup);
      }
      let tGroup = sGroup.topics.find((t) => t.topic.toLowerCase() === c.topic.toLowerCase());
      if (!tGroup) {
        tGroup = { topic: c.topic, concepts: [] };
        sGroup.topics.push(tGroup);
      }
      tGroup.concepts.push(c);
    });
    return tree;
  }, [filteredConcepts]);

  // Authentic enrolled subjects list from teaching assignments
  const availableSubjects = useMemo(() => {
    const subs: { id: string; name: string }[] = [];
    if (context?.subjects && context.subjects.length > 0) {
      context.subjects.forEach((s) => {
        if (!subs.some((item) => item.name.toLowerCase() === s.subjectName.toLowerCase())) {
          subs.push({ id: s.id, name: s.subjectName });
        }
      });
    } else {
      // Fallback only if no classroom is assigned: derive from student's assessed concepts
      concepts.forEach((c) => {
        if (!subs.some((item) => item.name.toLowerCase() === c.subject.toLowerCase())) {
          subs.push({ id: c.subject, name: c.subject });
        }
      });
    }
    return subs;
  }, [context, concepts]);

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Curriculum Analytics
              </Badge>
              <span className="text-xs text-muted-foreground">• Authentic Assessment Telemetry</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Student Knowledge Map
            </h1>
            <p className="text-sm text-muted-foreground">
              Objective concept-level mastery derived from your faculty-assigned assessments and quiz attempts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm"
              onClick={() => navigate("/student/ai-tutor")}
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI Tutor</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Loading curriculum knowledge map...</p>
          </div>
        ) : (
          <>
            {/* Top Summary Row */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/50 bg-card/70">
                <CardContent className="p-4">
                  <span className="text-xs text-muted-foreground">Mastered Concepts (&ge;80%)</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-500">{masteredConcepts.length}</span>
                    <span className="text-xs text-muted-foreground">
                      of {assessedConcepts.length} assessed ({concepts.length} total)
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">
                    {masteredConcepts.length > 0
                      ? masteredConcepts.map((m) => m.conceptName).slice(0, 3).join(", ")
                      : "Assessments require &ge;80% accuracy for mastery"}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "border-border/50 bg-card/70",
                  gapConcepts.length > 0 && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <CardContent className="p-4">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      gapConcepts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}
                  >
                    Critical Learning Gaps (&lt;60%)
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        gapConcepts.length > 0 ? "text-amber-500" : "text-foreground"
                      )}
                    >
                      {gapConcepts.length > 0 ? `${gapConcepts.length} detected` : assessedConcepts.length > 0 ? "0 detected" : "No data yet"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {gapConcepts.length > 0 ? "revision suggested" : assessedConcepts.length > 0 ? "all on track" : "not assessed yet"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">
                    {gapConcepts.length > 0
                      ? gapConcepts.map((g) => `${g.conceptName} (${g.masteryPercentage}%)`).join(", ")
                      : assessedConcepts.length > 0
                      ? "No concepts currently scoring below 60%"
                      : "Not enough assessment data yet"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/70">
                <CardContent className="p-4">
                  <span className="text-xs text-muted-foreground">Average Concept Mastery</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {averageMastery !== null ? `${averageMastery}%` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {quizMetrics?.totalAttempts || 0} quiz attempt{(quizMetrics?.totalAttempts || 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Calculated across your assessed curriculum concepts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Dynamic Subject Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-border/50 pb-3">
              <Button
                variant={activeSubject === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() => setActiveSubject("all")}
              >
                All Enrolled Subjects ({availableSubjects.length})
              </Button>
              {availableSubjects.map((sub) => {
                const count = concepts.filter(
                  (c) => c.subject.toLowerCase() === sub.name.toLowerCase()
                ).length;
                return (
                  <Button
                    key={sub.id}
                    variant={activeSubject.toLowerCase() === sub.name.toLowerCase() ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    onClick={() => setActiveSubject(sub.name)}
                  >
                    {sub.name} {count > 0 ? `(${count})` : ""}
                  </Button>
                );
              })}
            </div>

            {/* Concept Tree / Cards */}
            {concepts.length === 0 ? (
              <Card className="border-dashed p-12 text-center bg-muted/20">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                  <FileCheck2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No Diagnostic Data Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                  You haven't completed any faculty quizzes yet. Once you take quizzes in {context?.classroomName || "your classroom"}, your Subject &rarr; Topic &rarr; Concept mastery tree will appear here.
                </p>
                <Button
                  className="bg-primary text-primary-foreground font-semibold"
                  onClick={() => navigate("/student/quizzes")}
                >
                  Explore Available Quizzes
                </Button>
              </Card>
            ) : filteredConcepts.length === 0 ? (
              <Card className="border-dashed p-8 text-center bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  No concept assessments recorded yet for <strong>{activeSubject}</strong>. Complete quizzes in this subject to build mastery telemetry.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {groupedTree.map((sg) => (
                  <div key={sg.subject} className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-bold text-base text-foreground">{sg.subject}</h3>
                          <p className="text-xs text-muted-foreground">
                            Classroom Curriculum Concepts
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {sg.topics.reduce((acc, t) => acc + t.concepts.length, 0)} Concepts
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {sg.topics.map((tg) => (
                        <div
                          key={tg.topic}
                          className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                Topic: {tg.topic}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {tg.concepts.length} concept{tg.concepts.length === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {tg.concepts.map((concept) => {
                              const isUnassessed = concept.status === "Not Assessed" || concept.totalQuestions === 0;
                              const isGap = !isUnassessed && concept.masteryPercentage < 60;
                              const isMastered = !isUnassessed && concept.masteryPercentage >= 80;

                              return (
                                <Card
                                  key={concept.id || concept.conceptId || concept.conceptName}
                                  className={cn(
                                    "cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                                    isGap
                                      ? "border-amber-500/50 bg-amber-500/10 shadow-sm shadow-amber-500/10"
                                      : isMastered
                                      ? "border-emerald-500/30 bg-card/80"
                                      : "border-border/60 bg-card/80"
                                  )}
                                  onClick={() => setSelectedConcept(concept)}
                                >
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-0.5">
                                        <h4 className="text-sm font-bold text-foreground">
                                          {concept.conceptName}
                                        </h4>
                                        <span className="text-[11px] text-muted-foreground">
                                          {concept.topic}
                                        </span>
                                      </div>

                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] uppercase font-bold",
                                          isMastered && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0",
                                          isGap && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0",
                                          isUnassessed && "bg-muted text-muted-foreground border-border"
                                        )}
                                      >
                                        {concept.status}
                                      </Badge>
                                    </div>

                                    <div>
                                      {isUnassessed ? (
                                        <div className="flex items-center justify-between text-xs py-1 text-muted-foreground">
                                          <span className="italic">Not assessed yet</span>
                                          <span className="text-[11px] flex items-center gap-1">
                                            <HelpCircle className="h-3 w-3" /> 0 questions
                                          </span>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-foreground">
                                              {concept.masteryPercentage}% Mastery
                                            </span>
                                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                              {concept.trend === "improving" ? (
                                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                              ) : concept.trend === "declining" ? (
                                                <TrendingDown className="h-3 w-3 text-destructive" />
                                              ) : (
                                                <Minus className="h-3 w-3 text-muted-foreground" />
                                              )}
                                              {concept.correctCount}/{concept.totalQuestions} correct
                                            </span>
                                          </div>
                                          <Progress
                                            value={concept.masteryPercentage}
                                            className={cn(
                                              "mt-1.5 h-1.5",
                                              isGap && "[&>div]:bg-amber-500",
                                              isMastered && "[&>div]:bg-emerald-500"
                                            )}
                                          />
                                        </>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-primary font-medium">
                                      <span>Inspect Concept Details</span>
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Real Chronological Learning Activity Timeline */}
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Recent Learning Activity Timeline</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chronological log of submitted assessments, assignments, and class attendance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No learning events recorded yet. Complete quizzes or submit coursework to view activity logs.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {recentActivity.map((act) => (
                      <div
                        key={act.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-background/50 text-xs hover:bg-background/80 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{act.title}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {act.subject}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{act.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 sm:text-right">
                          {act.scoreOrStatus && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[11px] font-semibold",
                                act.scoreOrStatus.includes("Present") && "bg-emerald-500/15 text-emerald-600",
                                act.scoreOrStatus.includes("Absent") && "bg-rose-500/15 text-rose-600"
                              )}
                            >
                              {act.scoreOrStatus}
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(act.timestamp).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Concept Detail Drawer (Sheet) */}
      <Sheet open={!!selectedConcept} onOpenChange={(open) => !open && setSelectedConcept(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedConcept && (
            <div className="space-y-5 pt-2">
              <SheetHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                    {selectedConcept.subject}
                  </Badge>
                </div>
                <SheetTitle className="text-xl font-bold">{selectedConcept.conceptName}</SheetTitle>
                <SheetDescription className="text-xs">
                  Topic: {selectedConcept.topic} &bull;{" "}
                  {selectedConcept.totalQuestions > 0
                    ? `Accuracy: ${selectedConcept.masteryPercentage}% (${selectedConcept.correctCount}/${selectedConcept.totalQuestions} correct)`
                    : "Not assessed in quizzes yet"}
                </SheetDescription>
              </SheetHeader>

              {/* Status Alert */}
              <div
                className={cn(
                  "rounded-xl border p-3",
                  selectedConcept.totalQuestions === 0
                    ? "border-muted bg-muted/30 text-muted-foreground"
                    : selectedConcept.masteryPercentage < 60
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                )}
              >
                <div className="flex items-center gap-2">
                  {selectedConcept.totalQuestions === 0 ? (
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  ) : selectedConcept.masteryPercentage < 60 ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  <span className="text-xs font-bold uppercase">
                    {selectedConcept.totalQuestions === 0
                      ? "Curriculum Concept: Awaiting Assessment"
                      : selectedConcept.masteryPercentage < 60
                      ? "Attention Required: Concept Gap Identified"
                      : "Concept Mastery Verified"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {selectedConcept.totalQuestions === 0
                    ? `This concept is part of your ${selectedConcept.subject} curriculum. Take upcoming quizzes to test your understanding.`
                    : selectedConcept.masteryPercentage < 60
                    ? `Your assessed accuracy in ${selectedConcept.conceptName} is below 60%. Reviewing lecture materials and attempting targeted practice questions will help close this gap.`
                    : `You have demonstrated strong performance in ${selectedConcept.conceptName} across your quiz evaluations.`}
                </p>
              </div>

              {/* Diagnostic Assessment Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Diagnostic Performance Breakdown
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
                    <span className="block text-[11px] text-muted-foreground">Mastery</span>
                    <span className="block text-sm font-bold text-foreground">
                      {selectedConcept.totalQuestions > 0 ? `${selectedConcept.masteryPercentage}%` : "—"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
                    <span className="block text-[11px] text-muted-foreground">Correct</span>
                    <span className="block text-sm font-bold text-emerald-500">{selectedConcept.correctCount}</span>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/50 p-2.5">
                    <span className="block text-[11px] text-muted-foreground">Incorrect</span>
                    <span className="block text-sm font-bold text-destructive">{selectedConcept.incorrectCount}</span>
                  </div>
                </div>
              </div>

              {/* Action Interventions */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Immediate Learning Interventions
                </h4>

                {/* Jump to Topic Lecture */}
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-2.5 border-primary/30 hover:bg-primary/5"
                  onClick={() => {
                    navigate(`/student/lectures?topic=${encodeURIComponent(selectedConcept.topic)}`);
                  }}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                      <Play className="h-4 w-4 fill-current" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-foreground">Find Faculty Lecture</span>
                      <span className="block text-[11px] text-muted-foreground">Search videos covering {selectedConcept.topic}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>

                {/* Take Practice Quiz */}
                <Button
                  className="w-full justify-between h-auto py-2.5 bg-primary text-primary-foreground font-medium"
                  onClick={() => {
                    navigate(`/student/quizzes?concept=${encodeURIComponent(selectedConcept.conceptName)}`);
                  }}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground">
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold">Take Practice Quiz</span>
                      <span className="block text-[11px] text-primary-foreground/80">Reinforce {selectedConcept.conceptName}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {/* Ask AI Tutor */}
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-2.5"
                  onClick={() => {
                    navigate(`/student/ai-tutor?concept=${encodeURIComponent(selectedConcept.conceptName)}`);
                  }}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-foreground">Ask Synapse AI Tutor</span>
                      <span className="block text-[11px] text-muted-foreground">Get conceptual breakdown of {selectedConcept.conceptName}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </StudentLayout>
  );
}
