import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
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
  Award,
  BookOpen,
  TrendingUp,
  Loader2,
  Lock,
  Clock,
  FileCheck2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { calculateConceptStatus, calculatePerformanceTrend } from "@/services/conceptMasteryRules";
import {
  generatePostQuizAnalysis,
  buildMistakeExplanation,
  PostQuizAnalysisResult,
  QuestionMistake,
} from "@/services/postQuizAnalysisService";
import { youtubeRecommendationService } from "@/services/youtubeRecommendationService";
import { toast } from "sonner";

interface QuizDetail {
  id: string;
  title: string;
  topic: string;
  subject: string | null;
  difficulty: string;
  total_marks: number;
  time_limit_minutes: number;
  status: string;
  description: string | null;
  allow_multiple_attempts: boolean;
}

export function getOptionText(opt: any): string {
  if (opt === null || opt === undefined) return "";
  if (typeof opt === "string") return opt.trim();
  if (typeof opt === "object" && opt.text !== undefined) return String(opt.text).trim();
  return String(opt).trim();
}

interface QuestionItem {
  id: string;
  question: string;
  options: any[]; // JSON array of string or object
  correct_option: number;
  concept: string;
  marks: number;
  explanation?: string | null;
}

export default function QuizRunner() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString());

  // Result state
  const [attemptResult, setAttemptResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    correctCount: number;
    incorrectCount: number;
    conceptBreakdown: { concept: string; total: number; correct: number; accuracy: number }[];
  } | null>(null);

  const [analysisResult, setAnalysisResult] = useState<PostQuizAnalysisResult | null>(null);
  const [mistakesList, setMistakesList] = useState<QuestionMistake[]>([]);
  const [questionReviewList, setQuestionReviewList] = useState<any[]>([]);
  const [showAllQuestions, setShowAllQuestions] = useState(true);

  // Locked/Exceeded attempts state
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [previousAttempt, setPreviousAttempt] = useState<any>(null);

  const fetchQuizData = async () => {
    if (!quizId || !user) return;
    setLoading(true);

    try {
      // 1. Fetch Quiz Header
      const { data: qData, error: qErr } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();

      if (qErr) throw qErr;
      setQuiz(qData as QuizDetail);

      // Check status: only PUBLISHED quizzes can be attempted
      if (qData.status?.toUpperCase() !== "PUBLISHED") {
        setLoading(false);
        return;
      }

      // 2. Fetch Questions with deterministic ordering
      const { data: qList, error: qsErr } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (qsErr) throw qsErr;
      const loadedQuestions = (qList as QuestionItem[]) || [];
      setQuestions(loadedQuestions);

      // 3. Check previous attempts
      const { data: attemptsData, error: attErr } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (!attErr && attemptsData && attemptsData.length > 0) {
        const limit = qData.max_attempts || 1;
        if (attemptsData.length >= limit) {
          setMaxAttemptsReached(true);
          const latest = attemptsData[0];
          setPreviousAttempt(latest);

          // Populate previous result view if answers are present
          if (latest.answers && typeof latest.answers === "object") {
            buildPreviousAttemptView(latest, loadedQuestions, qData);
          }
          setLoading(false);
          return;
        }
      }

      setStartedAt(new Date().toISOString());
    } catch (err: any) {
      console.error("Failed to load quiz:", err);
      toast.error("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const buildPreviousAttemptView = (latest: any, qs: QuestionItem[], qInfo: QuizDetail) => {
    const rawAnswers = latest.answers || {};
    const mistakes: QuestionMistake[] = [];
    const reviews: any[] = [];
    const conceptMap: Record<string, { total: number; correct: number }> = {};

    qs.forEach((q) => {
      const recorded = rawAnswers[q.id];
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const correctIndex = Number(q.correct_option_index);
      const correctText =
        recorded?.correct_text ||
        (rawOptions[correctIndex] !== undefined ? getOptionText(rawOptions[correctIndex]) : "Correct Answer");

      let chosenIndex: number | null = null;
      let chosenText = "Not Answered";
      let isCorrect = false;

      if (recorded) {
        if (recorded.chosen_option !== null && recorded.chosen_option !== undefined) {
          chosenIndex = Number(recorded.chosen_option);
        }
        chosenText =
          recorded.chosen_text ||
          (chosenIndex !== null && rawOptions[chosenIndex] !== undefined
            ? getOptionText(rawOptions[chosenIndex])
            : "Not Answered");
        isCorrect = Boolean(recorded.is_correct);
      }

      const concept = q.concept || "Core Concept";
      if (!conceptMap[concept]) conceptMap[concept] = { total: 0, correct: 0 };
      conceptMap[concept].total += 1;
      if (isCorrect) conceptMap[concept].correct += 1;

      if (!isCorrect) {
        const expl = buildMistakeExplanation(q.question, concept, chosenText, correctText, q.explanation || undefined);
        mistakes.push({
          questionId: q.id,
          question: q.question,
          concept,
          studentAnswer: chosenText,
          correctAnswer: correctText,
          explanation: expl.explanation,
          whatToUnderstand: expl.whatToUnderstand,
        });
      }

      reviews.push({
        id: q.id,
        question: q.question,
        concept,
        is_correct: isCorrect,
        studentAnswer: chosenText,
        correctAnswer: correctText,
        marks: q.marks || 1,
        marksAwarded: isCorrect ? q.marks || 1 : 0,
        explanation: q.explanation || "Review the key relational definitions.",
      });
    });

    const breakdown = Object.entries(conceptMap).map(([c, data]) => ({
      concept: c,
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));

    setAttemptResult({
      score: latest.score,
      maxScore: latest.max_score,
      percentage: latest.percentage || Math.round((latest.score / (latest.max_score || 1)) * 100),
      correctCount: qs.length - mistakes.length,
      incorrectCount: mistakes.length,
      conceptBreakdown: breakdown,
    });
    setMistakesList(mistakes);
    setQuestionReviewList(reviews);

    generatePostQuizAnalysis({
      quizTitle: qInfo.title,
      subject: qInfo.subject || "Subject",
      topic: qInfo.topic,
      score: latest.score,
      maxScore: latest.max_score,
      percentage: latest.percentage || Math.round((latest.score / (latest.max_score || 1)) * 100),
      conceptBreakdown: breakdown,
      mistakes,
    }).then((res) => setAnalysisResult(res));
  };

  useEffect(() => {
    fetchQuizData();
  }, [quizId, user]);

  const handleSelectOption = (questionId: string, optIndex: number) => {
    if (attemptResult || maxAttemptsReached) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: Number(optIndex) }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Submit Quiz with Deterministic Scoring and Database Storage
  const handleSubmitQuiz = async () => {
    if (!quiz || !user || questions.length === 0) return;

    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < questions.length) {
      if (!confirm(`You have answered ${answeredCount} of ${questions.length} questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Deterministic scoring calculation
      let totalScore = 0;
      let maxScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      const conceptMap: Record<string, { correct: number; total: number }> = {};
      const answersObj: Record<string, any> = {};
      const mistakes: QuestionMistake[] = [];
      const reviews: any[] = [];

      questions.forEach((q) => {
        const weight = q.marks || 1;
        maxScore += weight;

        const concept = q.concept || "General";
        if (!conceptMap[concept]) conceptMap[concept] = { correct: 0, total: 0 };
        conceptMap[concept].total += 1;

        const rawOptions = Array.isArray(q.options) ? q.options : [];
        const chosen = selectedAnswers[q.id];
        const hasAnswered = chosen !== undefined && chosen !== null;
        const chosenIndex = hasAnswered ? Number(chosen) : null;
        const correctIndex = Number(q.correct_option_index);
        const isCorrect = hasAnswered && chosenIndex === correctIndex;

        if (isCorrect) {
          totalScore += weight;
          correctCount++;
          conceptMap[concept].correct += 1;
        } else {
          incorrectCount++;
        }

        const chosenText =
          chosenIndex !== null && rawOptions[chosenIndex] !== undefined
            ? getOptionText(rawOptions[chosenIndex])
            : "Not Answered";
        const correctText =
          rawOptions[correctIndex] !== undefined
            ? getOptionText(rawOptions[correctIndex])
            : "Correct Answer";

        answersObj[q.id] = {
          chosen_option: chosenIndex,
          chosen_text: chosenText,
          correct_option: correctIndex,
          correct_text: correctText,
          is_correct: isCorrect,
          topic: q.topic || quiz.topic,
          concept: q.concept || "General",
          marks: isCorrect ? weight : 0,
        };

        if (!isCorrect) {
          const expl = buildMistakeExplanation(q.question, concept, chosenText, correctText, q.explanation || undefined);
          mistakes.push({
            questionId: q.id,
            question: q.question,
            concept,
            studentAnswer: chosenText,
            correctAnswer: correctText,
            explanation: expl.explanation,
            whatToUnderstand: expl.whatToUnderstand,
          });
        }

        reviews.push({
          id: q.id,
          question: q.question,
          concept,
          is_correct: isCorrect,
          studentAnswer: chosenText,
          correctAnswer: correctText,
          marks: weight,
          marksAwarded: isCorrect ? weight : 0,
          explanation: q.explanation || "Review the key relational definitions.",
        });
      });

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const submittedAt = new Date().toISOString();

      // Fetch count of previous attempts to record accurate attempt_number
      const { count: prevAttCount } = await supabase
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", quiz.id)
        .eq("user_id", user.id);

      const attemptNum = (prevAttCount || 0) + 1;

      // 2. Insert into public.quiz_attempts
      const { data: createdAttempt, error: insertErr } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: user.id,
          quiz_id: quiz.id,
          attempt_number: attemptNum,
          started_at: startedAt,
          submitted_at: submittedAt,
          score: totalScore,
          max_score: maxScore,
          percentage: percentage,
          answers: answersObj,
          completed_at: submittedAt,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 3. Insert question answers into public.quiz_attempt_answers (Requirement 7)
      const attemptAnswerRows = questions.map((q) => {
        const chosen = selectedAnswers[q.id];
        const hasAnswered = chosen !== undefined && chosen !== null;
        const chosenIndex = hasAnswered ? Number(chosen) : null;
        const correctIndex = Number(q.correct_option_index);
        const isCorrect = hasAnswered && chosenIndex === correctIndex;
        const weight = q.marks || 1;
        return {
          attempt_id: createdAttempt.id,
          student_id: user.id,
          quiz_id: quiz.id,
          question_id: q.id,
          selected_option: chosenIndex,
          correct_option: correctIndex,
          is_correct: isCorrect,
          marks_awarded: isCorrect ? weight : 0,
          subject: quiz.subject,
          topic: q.topic || quiz.topic,
          concept: q.concept || "General",
          created_at: submittedAt,
        };
      });

      await supabase.from("quiz_attempt_answers").insert(attemptAnswerRows);

      // 4. Concept breakdown aggregation
      const breakdown = Object.entries(conceptMap).map(([concept, val]) => ({
        concept,
        correct: val.correct,
        total: val.total,
        accuracy: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      }));

      // 5. Insert historical records into public.student_concept_history (Requirement 11 & 15)
      const historyRows = breakdown.map((cb) => ({
        student_id: user.id,
        quiz_id: quiz.id,
        attempt_id: createdAttempt.id,
        subject: quiz.subject,
        topic: quiz.topic,
        concept: cb.concept,
        total_questions: cb.total,
        correct_answers: cb.correct,
        accuracy: cb.accuracy,
        assessed_at: submittedAt,
      }));

      await supabase.from("student_concept_history").insert(historyRows);

      // 6. Update student concept_mastery with historical rule evaluation (Requirement 12, 13, 14)
      for (const cb of breakdown) {
        const { data: existing } = await supabase
          .from("concept_mastery")
          .select("*")
          .eq("user_id", user.id)
          .eq("concept_name", cb.concept)
          .maybeSingle();

        const prevTotal = existing?.total_questions || 0;
        const prevCorrect = existing?.correct_count || 0;
        const prevAttempts = existing?.attempts_count || 0;

        const newTotal = prevTotal + cb.total;
        const newCorrect = prevCorrect + cb.correct;
        const newIncorrect = newTotal - newCorrect;
        const cumulativeAccuracy = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;
        const histAcc = existing ? existing.mastery_percentage : cb.accuracy;

        const status = calculateConceptStatus(cumulativeAccuracy, newTotal);
        const trend = calculatePerformanceTrend(cb.accuracy, histAcc);

        if (existing) {
          await supabase
            .from("concept_mastery")
            .update({
              subject: quiz.subject,
              topic: quiz.topic,
              total_questions: newTotal,
              correct_count: newCorrect,
              incorrect_count: newIncorrect,
              mastery_percentage: cumulativeAccuracy,
              latest_accuracy: cb.accuracy,
              historical_accuracy: histAcc,
              status: status,
              trend: trend,
              attempts_count: prevAttempts + 1,
              last_assessed_at: submittedAt,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("concept_mastery").insert({
            user_id: user.id,
            concept_name: cb.concept,
            subject: quiz.subject,
            topic: quiz.topic,
            total_questions: newTotal,
            correct_count: newCorrect,
            incorrect_count: newIncorrect,
            mastery_percentage: cumulativeAccuracy,
            latest_accuracy: cb.accuracy,
            historical_accuracy: cb.accuracy,
            status: status,
            trend: "stable",
            attempts_count: 1,
            last_assessed_at: submittedAt,
          });
        }

        // Closed learning loop: If student demonstrates mastery (>= 70%), resolve active recommendation
        if (cb.accuracy >= 70) {
          await youtubeRecommendationService.resolveRecommendationAfterQuiz(
            user.id,
            cb.concept,
            quiz.id
          );
        }
      }

      // If overall topic accuracy was high, resolve any topic-level recommendation
      if (percentage >= 70 && quiz.topic) {
        await youtubeRecommendationService.resolveRecommendationByTopic(
          user.id,
          quiz.topic,
          quiz.id
        );
      }

      setAttemptResult({
        score: totalScore,
        maxScore,
        percentage,
        correctCount,
        incorrectCount,
        conceptBreakdown: breakdown,
      });
      setMistakesList(mistakes);
      setQuestionReviewList(reviews);

      // 7. Generate evidence-based learning analysis
      const analysis = await generatePostQuizAnalysis({
        quizTitle: quiz.title,
        subject: quiz.subject || "Subject",
        topic: quiz.topic,
        score: totalScore,
        maxScore,
        percentage,
        conceptBreakdown: breakdown,
        mistakes,
      });
      setAnalysisResult(analysis);

      toast.success(`Assessment Complete! Score: ${totalScore}/${maxScore} (${percentage}%)`);
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      toast.error("Failed to submit quiz: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };



  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </StudentLayout>
    );
  }

  if (!quiz) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">Quiz Not Found</h2>
          <p className="text-xs text-muted-foreground">The requested assessment could not be located.</p>
          <Button onClick={() => navigate("/student/quizzes")} variant="outline" size="sm">
            Back to Quizzes
          </Button>
        </div>
      </StudentLayout>
    );
  }

  if (quiz.status?.toUpperCase() !== "PUBLISHED") {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Lock className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-bold">Assessment Not Available</h2>
          <p className="text-xs text-muted-foreground">
            This quiz is currently in {quiz.status} status and is not accepting submissions.
          </p>
          <Button onClick={() => navigate("/student/quizzes")} variant="outline" size="sm">
            Back to Quizzes
          </Button>
        </div>
      </StudentLayout>
    );
  }

  // =========================================================================
  // RESULT SCREEN AFTER SUBMISSION (Requirement 9, 10, 16, 19)
  // =========================================================================
  if (attemptResult) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
                  {maxAttemptsReached ? "Recorded Assessment Result" : "Assessment Complete"}
                </Badge>
                <span className="text-xs text-muted-foreground">{quiz.subject} • {quiz.topic}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-foreground mt-1">{quiz.title}</h1>
            </div>

            <Button
              onClick={() => navigate("/student/quizzes")}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Quizzes</span>
            </Button>
          </div>

          {/* 1. QUIZ RESULT BANNER */}
          <Card className="border shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-xl bg-muted/40 border">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Score</div>
                  <div className="text-2xl font-extrabold text-foreground">
                    {attemptResult.score} / {attemptResult.maxScore}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Percentage</div>
                  <div className="text-2xl font-extrabold text-indigo-600">
                    {attemptResult.percentage}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Correct</div>
                  <div className="text-2xl font-extrabold text-emerald-600">
                    {attemptResult.correctCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Incorrect</div>
                  <div className="text-2xl font-extrabold text-rose-600">
                    {attemptResult.incorrectCount}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. CONCEPT PERFORMANCE */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-600" />
                <span>Concept Performance</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Performance grouped by specific subject concepts assessed in this quiz.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                {attemptResult.conceptBreakdown.map((cb) => {
                  const status = calculateConceptStatus(cb.accuracy, cb.total);
                  return (
                    <div key={cb.concept} className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">{cb.concept}</span>
                        <Badge
                          className={`text-[10px] ${
                            status === "Strong"
                              ? "bg-emerald-600 text-white"
                              : status === "Developing"
                              ? "bg-indigo-600 text-white"
                              : status === "Needs Practice"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {status} • {cb.accuracy}%
                        </Badge>
                      </div>
                      <Progress value={cb.accuracy} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{cb.correct} of {cb.total} correct</span>
                        <span>{cb.accuracy >= 80 ? "Mastered" : "In Progress"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 3. NEEDS ATTENTION (Alert on weak/developing concepts) */}
          {analysisResult && analysisResult.needsAttention.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Needs Attention</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2 text-xs">
                {analysisResult.needsAttention.map((na) => (
                  <div key={na.concept} className="flex items-start gap-2 text-foreground">
                    <span className="font-bold text-amber-600">• {na.concept}:</span>
                    <span>{na.reason}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 4. AI LEARNING ANALYSIS */}
          {analysisResult && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                  <span>AI Learning Analysis</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Grounded diagnosis based strictly on your assessed questions and mistake evidence.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-2 text-xs leading-relaxed text-foreground">
                <p className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  {analysisResult.aiExplanation}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 5. RECOMMENDED NEXT STEPS */}
          {analysisResult && analysisResult.recommendedNextSteps.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>Recommended Next Steps</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2.5">
                {analysisResult.recommendedNextSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card text-xs">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-foreground">{step}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 6. QUESTION-LEVEL ANALYSIS */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-indigo-600" />
                  <span>Question-Level Mistake Analysis</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed breakdown of every question, your selected answer, and clear mistake explanations.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllQuestions(!showAllQuestions)}
                className="text-xs gap-1"
              >
                <span>{showAllQuestions ? "Collapse" : "Expand"}</span>
                {showAllQuestions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </CardHeader>

            {showAllQuestions && (
              <CardContent className="p-5 space-y-4">
                {questionReviewList.map((qr, idx) => (
                  <div
                    key={qr.id || idx}
                    className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                      qr.is_correct
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-rose-500/5 border-rose-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        {qr.is_correct ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        )}
                        <span>Q{idx + 1}. {qr.question}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                        Concept: {qr.concept}
                      </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      <div className={`p-2.5 rounded-lg border ${qr.is_correct ? "bg-card border-border/40" : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 font-semibold"}`}>
                        <span className="text-[10px] block text-muted-foreground uppercase">Your Choice:</span>
                        <span>{qr.studentAnswer}</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 font-semibold">
                        <span className="text-[10px] block text-muted-foreground uppercase">Correct Answer:</span>
                        <span>{qr.correctAnswer}</span>
                      </div>
                    </div>

                    {!qr.is_correct && (
                      <div className="p-2.5 rounded-lg bg-card border border-border/50 text-[11px] text-muted-foreground space-y-1">
                        <span className="font-semibold text-foreground block">Conceptual Explanation:</span>
                        <p>{qr.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/student/progress")}
              className="gap-1.5 text-xs font-semibold"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>View Updated Progress</span>
            </Button>

            <Button
              onClick={() => navigate("/student/quizzes")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Return to Quizzes
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Active Quiz View
  if (questions.length === 0) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">No Questions in Quiz</h2>
          <p className="text-xs text-muted-foreground">This assessment does not contain questions yet.</p>
          <Button onClick={() => navigate("/student/quizzes")} variant="outline" size="sm">
            Back to Quizzes
          </Button>
        </div>
      </StudentLayout>
    );
  }

  const currentQ = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const isSelected = (optIdx: number) =>
    selectedAnswers[currentQ.id] !== undefined && Number(selectedAnswers[currentQ.id]) === optIdx;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (confirm("Exit quiz? Your progress will not be saved.")) {
                navigate("/student/quizzes");
              }
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Exit Assessment</span>
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {quiz.subject || "Subject Quiz"}
            </Badge>
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
              Question {currentIndex + 1} of {questions.length}
            </Badge>
          </div>
        </div>

        {/* Quiz Title & Info */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {quiz.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            Topic: {quiz.topic} • Concept: <strong className="text-foreground">{currentQ.concept}</strong>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              Progress: {Object.keys(selectedAnswers).length}/{questions.length} Answered
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Question Card */}
        <Card className="shadow-card border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <span className="text-base font-semibold text-foreground leading-relaxed">
                {currentIndex + 1}. {currentQ.question}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {currentQ.marks || 1} mark{currentQ.marks > 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {currentQ.options.map((opt, optIdx) => {
              const selected = isSelected(optIdx);
              const label = ["A", "B", "C", "D"][optIdx] || String(optIdx + 1);
              const optText = getOptionText(opt);

              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all text-xs ${
                    selected
                      ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-semibold shadow-sm"
                      : "hover:bg-muted/40 bg-card border-slate-200 dark:border-slate-800 text-foreground"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                      selected
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {label}
                  </div>
                  <span className="leading-normal">{optText}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Controls (Prev / Next / Submit) */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="text-xs"
          >
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {currentIndex < questions.length - 1 ? (
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1"
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Submit Quiz</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
