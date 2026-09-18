import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Award,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { DEMO_QUIZZES } from "@/data/demoData";
import { useSynapse } from "@/hooks/useSynapse";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function QuizRunner() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const synapse = useSynapse();

  const quiz = DEMO_QUIZZES.find((q) => q.id === quizId) || DEMO_QUIZZES[0];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = quiz.questions[currentIndex];

  const handleSelectOption = (optIndex: number) => {
    if (submitted) return;
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: optIndex });
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const calculateScore = () => {
    let score = 0;
    quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score++;
      }
    });
    return score;
  };

  const handleSubmitQuiz = () => {
    const score = calculateScore();
    const maxScore = quiz.questions.length;
    setSubmitted(true);

    // Record quiz result into synapseCore to dynamically boost concept mastery
    synapse.recordQuizResult(quiz.id, score, maxScore, quiz.questions[0].conceptTag);
    toast.success(`Assessment Complete! Score: ${score}/${maxScore}`);
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Back & Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/assessments")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Exit Assessment</span>
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {quiz.courseCode}
            </Badge>
            <Badge className="bg-primary/10 text-primary border-0 text-xs">
              Question {currentIndex + 1} of {quiz.questions.length}
            </Badge>
          </div>
        </div>

        {/* Quiz Title Card */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {quiz.title}
          </h1>
          <p className="text-xs text-muted-foreground">{quiz.topic}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Progress: {answeredCount}/{quiz.questions.length} Answered</span>
            <span>{progressPercent}% Completed</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Results Screen if Submitted */}
        {submitted ? (
          <Card className="border-border/60 bg-card/85 shadow-md">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                <Award className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">
                  Assessment Completed!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Score: <strong className="text-foreground">{calculateScore()} / {quiz.questions.length}</strong> ({Math.round((calculateScore() / quiz.questions.length) * 100)}%)
                </p>
              </div>

              {/* Concept Mastery Impact Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase">
                  <TrendingUp className="h-4 w-4" />
                  <span>Concept Mastery Updated</span>
                </div>
                <p className="text-xs text-foreground/90">
                  Your performance on this assessment updated your mastery for <strong>{quiz.questions[0].conceptTag}</strong>.
                  {calculateScore() >= 2
                    ? " Your learning gap has been resolved and marked 'In Progress / Mastered' on your Knowledge Map!"
                    : " Further practice recommended to elevate your mastery above 70%."}
                </p>
              </div>

              {/* Question Review Accordion / List */}
              <div className="space-y-3 text-left pt-4 border-t border-border/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Question Breakdown & Concept Explanations:
                </h4>
                {quiz.questions.map((q, idx) => {
                  const userAnswer = selectedAnswers[idx];
                  const isCorrect = userAnswer === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      className={cn(
                        "rounded-xl border p-3 text-xs space-y-1.5",
                        isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {idx + 1}. {q.question}
                        </span>
                        {isCorrect ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px] shrink-0 border-0">
                            Correct +1
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            Incorrect
                          </Badge>
                        )}
                      </div>

                      <p className="text-muted-foreground">
                        Your answer: <strong>{q.options[userAnswer] || "Skipped"}</strong>
                      </p>
                      {!isCorrect && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Correct answer: {q.options[q.correctIndex]}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
                        ?? <strong>Concept Rule:</strong> {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Button variant="outline" size="sm" onClick={handleRetake} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" />
                  <span>Retake Quiz</span>
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-primary text-primary-foreground font-medium"
                  onClick={() => navigate("/my-learning")}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>View Updated Knowledge Map</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => navigate("/ai-tutor")}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Ask AI Tutor to Explain</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Active Question Card */
          <Card className="border-border/60 bg-card/85 shadow-sm">
            <CardContent className="p-6 space-y-5">
              {/* Question Text */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    Concept: {currentQuestion.conceptTag}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {currentQuestion.difficulty}
                  </Badge>
                </div>
                <h3 className="text-base font-semibold text-foreground leading-relaxed">
                  {currentIndex + 1}. {currentQuestion.question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-2">
                {currentQuestion.options.map((option, optIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === optIdx;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      className={cn(
                        "w-full text-left rounded-xl p-3 text-xs border transition-all duration-150 flex items-center justify-between",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm font-medium text-foreground"
                          : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-background text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-xs leading-relaxed">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {currentIndex < quiz.questions.length - 1 ? (
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground font-medium"
                      onClick={handleNext}
                    >
                      <span>Next</span>
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      disabled={answeredCount < quiz.questions.length}
                      onClick={handleSubmitQuiz}
                    >
                      Submit Assessment
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

