import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  FileCheck2,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { DEMO_QUIZZES } from "@/data/demoData";
import { useSynapse } from "@/hooks/useSynapse";
import { toast } from "sonner";

export default function Assessments() {
  const navigate = useNavigate();
  const synapse = useSynapse();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [topic, setTopic] = useState("Database Normalization");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState("5");
  const [source, setSource] = useState("lecture");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQuiz = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowGenerateDialog(false);
      toast.success(`AI Quiz on '${topic}' generated with ${count} questions!`);
      navigate("/assessments/quiz-norm-mastery");
    }, 600);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Adaptive Assessment
              </Badge>
              <span className="text-xs text-muted-foreground">• Concept-Level Mastery Tracking</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Assessments & Quizzes
            </h1>
            <p className="text-sm text-muted-foreground">
              Test your understanding. Every question updates your concept mastery tree in real-time.
            </p>
          </div>

          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-sm">
                <Sparkles className="h-4 w-4" />
                <span>Generate AI Quiz</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span>AI Quiz Generator</span>
                </DialogTitle>
                <DialogDescription>
                  Synthesize an adaptive assessment from lecture transcripts, course notes, or custom topics.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-foreground">Topic or Concept</label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. 2NF Partial Dependencies"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Difficulty</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy (Fundamentals)</SelectItem>
                        <SelectItem value="medium">Medium (Analytical)</SelectItem>
                        <SelectItem value="hard">Hard (Synthesis)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground">Question Count</label>
                    <Select value={count} onValueChange={setCount}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Questions (Quick)</SelectItem>
                        <SelectItem value="5">5 Questions (Standard)</SelectItem>
                        <SelectItem value="10">10 Questions (Deep)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Source Material</label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture">Lecture 4 Transcript (Normalization)</SelectItem>
                      <SelectItem value="notes">Dr. Thorne's Lecture Notes PDF</SelectItem>
                      <SelectItem value="course">General Course Syllabus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateQuiz}
                  disabled={isGenerating || !topic.trim()}
                  className="bg-primary text-primary-foreground font-medium"
                >
                  {isGenerating ? "Synthesizing Quiz..." : "Generate & Start"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Quizzes Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_QUIZZES.map((quiz) => {
            const history = synapse.quizHistory[quiz.id];

            return (
              <Card
                key={quiz.id}
                className="border-border/60 bg-card/80 transition hover:border-primary/40 hover:shadow-md"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                          {quiz.courseCode}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {quiz.difficulty}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-foreground">{quiz.title}</h3>
                      <p className="text-xs text-muted-foreground">{quiz.topic}</p>
                    </div>

                    {history && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-xs shrink-0">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Score: {history.score}/{history.maxScore}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <FileCheck2 className="h-3.5 w-3.5 text-primary" /> {quiz.questionsCount} Questions
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> ~{quiz.estimatedMinutes} mins
                    </span>
                    <span>•</span>
                    <span className="text-primary font-medium">Concept-Tagged</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {history ? "Retake to boost concept score" : "First attempt ready"}
                    </span>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs bg-primary text-primary-foreground font-medium"
                      onClick={() => navigate(/assessments/)}
                    >
                      <span>{history ? "Retake Quiz" : "Start Quiz"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

