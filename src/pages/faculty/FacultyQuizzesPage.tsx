import { useState } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Plus,
  FileCheck2,
  Users,
  Award,
  AlertTriangle,
  HelpCircle,
  BarChart2,
} from "lucide-react";
import { DEMO_FACULTY_QUIZZES } from "@/data/facultyDemoData";
import { toast } from "sonner";

export default function FacultyQuizzesPage() {
  const [quizzes, setQuizzes] = useState(DEMO_FACULTY_QUIZZES);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // AI Quiz Generation State
  const [aiTopic, setAiTopic] = useState("Second Normal Form (2NF)");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [aiNumQuestions, setAiNumQuestions] = useState("3");
  const [generating, setGenerating] = useState(false);

  // Manual Creation State
  const [manualTitle, setManualTitle] = useState("");
  const [manualTopic, setManualTopic] = useState("");

  const handleGenerateAIQuiz = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      const newQuiz = {
        id: `fac-quiz-${Date.now()}`,
        title: `AI Generated: ${aiTopic} Diagnostic`,
        courseCode: "CS301",
        topic: aiTopic,
        difficulty: aiDifficulty,
        questionsCount: Number(aiNumQuestions) || 3,
        attemptedCount: 0,
        totalStudents: 62,
        averageScore: 0,
        struggleQuestion: "Pending student attempts to evaluate struggle points",
      };
      setQuizzes([newQuiz, ...quizzes]);
      setAiModalOpen(false);
      toast.success(`Synapse AI generated ${aiNumQuestions} diagnostic questions for '${aiTopic}'!`);
    }, 1200);
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    const newQuiz = {
      id: `fac-quiz-${Date.now()}`,
      title: manualTitle,
      courseCode: "CS301",
      topic: manualTopic || "General",
      difficulty: "Medium",
      questionsCount: 4,
      attemptedCount: 0,
      totalStudents: 62,
      averageScore: 0,
      struggleQuestion: "Pending student attempts",
    };
    setQuizzes([newQuiz, ...quizzes]);
    setCreateModalOpen(false);
    setManualTitle("");
    toast.success("New quiz published to classroom!");
  };

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                Assessment Studio
              </Badge>
              <span className="text-xs text-muted-foreground">• Concept Diagnostics & AI Generation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              Quizzes & Diagnostics
            </h1>
            <p className="text-sm text-muted-foreground">
              Evaluate cohort understanding, analyze question-level difficulty, and generate targeted revision quizzes using Synapse AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* AI Generator Modal */}
            <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-primary text-white font-semibold shadow-md shadow-indigo-500/20">
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz with AI
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    AI Assessment Generator
                  </DialogTitle>
                  <DialogDescription>
                    Synapse AI analyzes recent student struggle points to craft high-yield diagnostic questions.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-topic">Target Topic / Concept Gap</Label>
                    <Input
                      id="ai-topic"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g. Second Normal Form (2NF)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-diff">Difficulty Tier</Label>
                      <select
                        id="ai-diff"
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="Easy">Easy (Foundational)</option>
                        <option value="Medium">Medium (Diagnostic)</option>
                        <option value="Hard">Hard (Application)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ai-count">Question Count</Label>
                      <Input
                        id="ai-count"
                        type="number"
                        value={aiNumQuestions}
                        onChange={(e) => setAiNumQuestions(e.target.value)}
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleGenerateAIQuiz}
                    disabled={generating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {generating ? "Crafting Questions & Rubric with AI..." : "Generate & Publish Quiz"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Manual Create Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Manual Quiz
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleManualCreate}>
                  <DialogHeader>
                    <DialogTitle>Create Custom Quiz</DialogTitle>
                    <DialogDescription>Define questions, answer keys, and concept tags manually.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-title">Quiz Title</Label>
                      <Input
                        id="m-title"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Transaction Isolation Levels Check"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="m-topic">Topic</Label>
                      <Input
                        id="m-topic"
                        value={manualTopic}
                        onChange={(e) => setManualTopic(e.target.value)}
                        placeholder="Transactions"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Create & Publish
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quizzes List & Difficulty Analysis */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">Published Class Diagnostics</h2>

          <div className="grid gap-6">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="shadow-card border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                          {quiz.courseCode}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Topic: {quiz.topic}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            quiz.difficulty === "Hard"
                              ? "text-rose-600 border-rose-500/30"
                              : quiz.difficulty === "Medium"
                              ? "text-amber-600 border-amber-500/30"
                              : "text-emerald-600 border-emerald-500/30"
                          }`}
                        >
                          {quiz.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold">{quiz.title}</CardTitle>
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      {quiz.averageScore > 0 ? (
                        <div>
                          <div className="text-2xl font-extrabold text-foreground">{quiz.averageScore}%</div>
                          <div className="text-xs text-muted-foreground">Class Average</div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending Attempts</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Attempt Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 rounded-xl bg-muted/40 border">
                    <div>
                      <span className="text-muted-foreground">Attempted:</span>{" "}
                      <span className="font-bold text-foreground">
                        {quiz.attemptedCount} / {quiz.totalStudents} students
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Questions:</span>{" "}
                      <span className="font-bold text-foreground">{quiz.questionsCount} items</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pass Rate:</span>{" "}
                      <span className="font-bold text-emerald-600">
                        {quiz.averageScore ? `${Math.round(quiz.averageScore * 0.9)}%` : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span className="font-bold text-indigo-600">Active</span>
                    </div>
                  </div>

                  {/* Question Level Struggle Breakdown */}
                  {quiz.struggleQuestion && (
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-700 dark:text-amber-400">
                          Identified Question-Level Bottleneck:
                        </span>
                        <p className="text-muted-foreground pt-0.5">{quiz.struggleQuestion}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </FacultyLayout>
  );
}
