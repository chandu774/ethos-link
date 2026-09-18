import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
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
  Compass,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  BookOpen,
  Video,
  Volume2,
  Play,
  RotateCcw,
  FileCheck2,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { ConceptMasteryItem } from "@/data/demoData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MyLearning() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const synapse = useSynapse();

  const [selectedConcept, setSelectedConcept] = useState<ConceptMasteryItem | null>(null);
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Auto-select concept if URL parameter is present (e.g. ?concept=c-2nf)
  useEffect(() => {
    const conceptParam = searchParams.get("concept");
    if (conceptParam) {
      const found = synapse.concepts.find((c) => c.id === conceptParam);
      if (found) setSelectedConcept(found);
    }
  }, [searchParams, synapse.concepts]);

  const handleSpeakConcept = (concept: ConceptMasteryItem) => {
    if (isSpeaking) {
      synapse.stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    const text = `${concept.name}. Concept Mastery is currently ${concept.mastery} percent. ${concept.description}. Key rule: ${concept.rules.join(". ")}`;
    setIsSpeaking(true);
    synapse.speakText(text, () => setIsSpeaking(false));
  };

  const filteredConcepts = synapse.concepts.filter((c) => {
    if (activeSubject === "all") return true;
    if (activeSubject === "DBMS" && c.courseCode === "CS301") return true;
    if (activeSubject === "OS" && c.courseCode === "CS302") return true;
    return false;
  });

  const gapConcepts = synapse.concepts.filter((c) => c.status === "gap");
  const masteredConcepts = synapse.concepts.filter((c) => c.status === "mastered");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Signature Feature
              </Badge>
              <span className="text-xs text-muted-foreground">ï¿½ Deep Concept Analytics</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Student Knowledge Map
            </h1>
            <p className="text-sm text-muted-foreground">
              Concept-level understanding across your subjects. Click any concept to view notes, lecture timestamps, and targeted practice.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm"
              onClick={() => navigate("/ai-tutor")}
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI About Gaps</span>
            </Button>
          </div>
        </div>

        {/* Top Summary Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground">Mastered Concepts (&gt;80%)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-500">{masteredConcepts.length}</span>
                <span className="text-xs text-muted-foreground">solid foundation</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">SQL, CPU Scheduling, Functional Dependencies</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Critical Learning Gaps (&lt;60%)
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-500">{gapConcepts.length} detected</span>
                <span className="text-xs text-muted-foreground">action needed</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-600/90 dark:text-amber-400/90 font-medium">
                2NF (46%) in DBMS, Virtual Memory (52%) in OS
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <span className="text-xs text-muted-foreground">Average Concept Mastery</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">73.8%</span>
                <span className="text-xs text-emerald-500 font-medium">+4.2% this week</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Continuously adapts after every quiz attempt</p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          {[
            { id: "all", label: "All Subjects" },
            { id: "DBMS", label: "CS301: Databases" },
            { id: "OS", label: "CS302: Operating Systems" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeSubject === tab.id ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setActiveSubject(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Visual Concept Tree / Cards */}
        <div className="space-y-6">
          {/* DBMS Section */}
          {(activeSubject === "all" || activeSubject === "DBMS") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    CS301: Database Management Systems
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Relational Model, Normalization & Query Processing
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-xs">
                  Overall: 71%
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {synapse.concepts
                  .filter((c) => c.courseCode === "CS301")
                  .map((concept) => {
                    const isGap = concept.status === "gap";
                    const isMastered = concept.status === "mastered";

                    return (
                      <Card
                        key={concept.id}
                        className={cn(
                          "cursor-pointer border transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
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
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-foreground">{concept.name}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">{concept.category}</span>
                            </div>

                            <Badge
                              variant={isGap ? "destructive" : isMastered ? "default" : "secondary"}
                              className={cn(
                                "text-[10px] uppercase font-bold",
                                isMastered && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
                              )}
                            >
                              {isGap ? "GAP" : isMastered ? "MASTERED" : "IN PROGRESS"}
                            </Badge>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{concept.mastery}% Mastery</span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                {concept.trend === "up" ? (
                                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-destructive" />
                                )}
                                {concept.practiceCount} attempts
                              </span>
                            </div>
                            <Progress
                              value={concept.mastery}
                              className={cn(
                                "mt-1.5 h-2",
                                isGap && "[&>div]:bg-amber-500",
                                isMastered && "[&>div]:bg-emerald-500"
                              )}
                            />
                          </div>

                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {concept.description}
                          </p>

                          <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-primary font-medium">
                            <span>Inspect Concept & Lecture Jump</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Operating Systems Section */}
          {(activeSubject === "all" || activeSubject === "OS") && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    CS302: Operating Systems
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Process Scheduling, Memory Hierarchy & Synchronization
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-xs">
                  Overall: 76%
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {synapse.concepts
                  .filter((c) => c.courseCode === "CS302")
                  .map((concept) => {
                    const isGap = concept.status === "gap";
                    const isMastered = concept.status === "mastered";

                    return (
                      <Card
                        key={concept.id}
                        className={cn(
                          "cursor-pointer border transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
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
                            <div className="space-y-1">
                              <span className="text-sm font-bold text-foreground">{concept.name}</span>
                              <span className="block text-[11px] text-muted-foreground">{concept.category}</span>
                            </div>

                            <Badge
                              variant={isGap ? "destructive" : isMastered ? "default" : "secondary"}
                              className={cn(
                                "text-[10px] uppercase font-bold",
                                isMastered && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
                              )}
                            >
                              {isGap ? "GAP" : isMastered ? "MASTERED" : "IN PROGRESS"}
                            </Badge>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{concept.mastery}% Mastery</span>
                              <span className="text-[11px] text-muted-foreground">{concept.practiceCount} attempts</span>
                            </div>
                            <Progress
                              value={concept.mastery}
                              className={cn(
                                "mt-1.5 h-2",
                                isGap && "[&>div]:bg-amber-500",
                                isMastered && "[&>div]:bg-emerald-500"
                              )}
                            />
                          </div>

                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {concept.description}
                          </p>

                          <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-primary font-medium">
                            <span>Inspect Concept</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RICH CONCEPT DETAIL DRAWER */}
      <Sheet open={!!selectedConcept} onOpenChange={(open) => !open && setSelectedConcept(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedConcept && (
            <div className="space-y-5 pt-2">
              <SheetHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                    {selectedConcept.courseCode}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-primary"
                    onClick={() => handleSpeakConcept(selectedConcept)}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{isSpeaking ? "Stop Audio" : "Listen (TTS)"}</span>
                  </Button>
                </div>
                <SheetTitle className="text-xl font-bold">{selectedConcept.name}</SheetTitle>
                <SheetDescription className="text-xs">
                  Category: {selectedConcept.category} ï¿½ Current Mastery: {selectedConcept.mastery}%
                </SheetDescription>
              </SheetHeader>

              {/* Status Alert */}
              <div
                className={cn(
                  "rounded-xl border p-3",
                  selectedConcept.status === "gap"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                )}
              >
                <div className="flex items-center gap-2">
                  {selectedConcept.status === "gap" ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                  <span className="text-xs font-bold uppercase">
                    {selectedConcept.status === "gap"
                      ? "Attention Required: Academic Gap Detected"
                      : "Concept Mastery Verified"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {selectedConcept.status === "gap"
                    ? "Your score on this concept is currently below 60%. Reviewing the lecture timestamp and attempting 3 practice questions will close this gap."
                    : "You consistently perform well on this topic across quizzes and homework."}
                </p>
              </div>

              {/* Deep Explanation */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Core Concept Explanation
                </h4>
                <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/40">
                  {selectedConcept.description}
                </p>
              </div>

              {/* Governing Principles & Rules */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Invariants & Rules
                </h4>
                <div className="space-y-2">
                  {selectedConcept.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground bg-background/80 p-2 rounded-lg border border-border/40">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {idx + 1}
                      </span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Actions Grid */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Immediate Interventions
                </h4>

                {/* Jump to Lecture */}
                {selectedConcept.lectureTimestamp && (
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-2.5 border-primary/30 hover:bg-primary/5"
                    onClick={() => {
                      const ts = selectedConcept.lectureTimestamp!;
                      navigate(`/lectures/${ts.lectureId}?t=${ts.seconds}`);
                    }}
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <Play className="h-4 w-4 fill-current" />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-foreground">Jump to Lecture Segment</span>
                        <span className="block text-[11px] text-muted-foreground">Timestamp: {selectedConcept.lectureTimestamp.time} (Covers Partial Dependencies)</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}

                {/* Take Targeted Practice Quiz */}
                <Button
                  className="w-full justify-between h-auto py-2.5 bg-primary text-primary-foreground font-medium"
                  onClick={() => {
                    navigate("/assessments/quiz-2nf-targeted");
                  }}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground">
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold">Take 3-Question Targeted Checkpoint</span>
                      <span className="block text-[11px] text-primary-foreground/80">Instantly boosts concept mastery upon correct answers</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {/* Ask AI Tutor */}
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-2.5"
                  onClick={() => {
                    navigate(`/ai-tutor?concept=${encodeURIComponent(selectedConcept.name)}`);
                  }}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-foreground">Ask Contextual AI Tutor</span>
                      <span className="block text-[11px] text-muted-foreground">Get a Socratic explanation tailored to this concept</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

