import { useState, useEffect } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  FileCheck2,
  Users,
  Award,
  AlertTriangle,
  HelpCircle,
  BarChart2,
  Loader2,
  CheckCircle2,
  Eye,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateAndValidateQuiz, getTopicBoundary } from "@/services/quizGenerationService";

interface TeachingCohort {
  id: string;
  subject_name: string;
  subject_code: string | null;
  classroom_id: string;
  classroom?: {
    name: string;
    course: string;
    branch: string;
    year: number;
    section: string;
  };
}

interface QuestionDraft {
  id?: string;
  question: string;
  options: string[];
  correct_option_index: number;
  topic: string;
  concept: string;
  marks: number;
  explanation?: string;
}

interface RealQuiz {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  subject: string | null;
  difficulty: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  duration_minutes: number;
  max_attempts: number;
  teaching_assignment_id: string | null;
  classroom_id: string | null;
  created_at: string;
  questions_count?: number;
  attempts_count?: number;
  avg_score?: number;
  cohort_name?: string;
}

export default function FacultyQuizzesPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<RealQuiz[]>([]);
  const [teachingCohorts, setTeachingCohorts] = useState<TeachingCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  // Manual Creation Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDuration, setQuizDuration] = useState("15");
  const [quizMaxAttempts, setQuizMaxAttempts] = useState("1");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  // Current single question being edited or added in builder
  const [qText, setQText] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qCorrect, setQCorrect] = useState(0);
  const [qTopic, setQTopic] = useState("");
  const [qConcept, setQConcept] = useState("");
  const [qMarks, setQMarks] = useState("1");

  // AI Quiz Generation Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingStage, setAiGeneratingStage] = useState(""); // stage label during generation
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuizTitle, setAiQuizTitle] = useState("");
  const [aiConcepts, setAiConcepts] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [aiNumQuestions, setAiNumQuestions] = useState("4");
  const [aiDuration, setAiDuration] = useState("15");

  // AI Review Modal (MANDATORY faculty review before publish)
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiPublishing, setAiPublishing] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<QuestionDraft[]>([]);

  // Performance Modal State
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const [selectedQuizForPerf, setSelectedQuizForPerf] = useState<RealQuiz | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [attemptsList, setAttemptsList] = useState<any[]>([]);
  const [questionStats, setQuestionStats] = useState<any[]>([]);
  const [conceptStats, setConceptStats] = useState<{ concept: string; correct: number; total: number; pct: number }[]>([]);
  const [selectedConceptDrilldown, setSelectedConceptDrilldown] = useState<string | null>(null);
  const [conceptStudentDrilldown, setConceptStudentDrilldown] = useState<
    Record<string, Array<{ studentId: string; name: string; rollNumber: string; correct: number; total: number; pct: number }>>
  >({});

  const fetchQuizzesAndCohorts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch teaching assignments
      const { data: taData, error: taErr } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          classroom_id,
          classroom:classrooms!teaching_assignments_classroom_id_fkey (
            name,
            course,
            branch,
            year,
            section
          )
        `)
        .eq("faculty_id", user.id);

      if (taErr) throw taErr;

      const cohorts = (taData as any[]) || [];
      setTeachingCohorts(cohorts);
      if (cohorts.length > 0 && !selectedCohortId) {
        setSelectedCohortId(cohorts[0].id);
      }

      const teachingIds = cohorts.map((c) => c.id);

      // 2. Fetch quizzes created by this faculty or for their teaching assignments
      let query = supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (teachingIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},teaching_assignment_id.in.(${teachingIds.join(",")})`);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data: quizData, error: qzErr } = await query;
      if (qzErr) throw qzErr;

      const rawQuizzes = quizData || [];

      // 3. For each quiz, fetch question count and attempt stats
      const enriched: RealQuiz[] = [];
      for (const q of rawQuizzes) {
        const cohort = cohorts.find((c) => c.id === q.teaching_assignment_id);

        const { count: qCount } = await supabase
          .from("quiz_questions")
          .select("id", { count: "exact", head: true })
          .eq("quiz_id", q.id);

        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("score, max_score")
          .eq("quiz_id", q.id);

        let avg = 0;
        if (attempts && attempts.length > 0) {
          const totalPct = attempts.reduce((sum, att) => {
            const max = att.max_score || 100;
            return sum + ((att.score || 0) / max) * 100;
          }, 0);
          avg = Math.round(totalPct / attempts.length);
        }

        enriched.push({
          ...q,
          status: q.status || "PUBLISHED",
          questions_count: qCount || 0,
          attempts_count: attempts?.length || 0,
          avg_score: avg,
          cohort_name: cohort ? `${cohort.subject_name} · ${cohort.classroom?.name}` : (q.subject || "Classroom Quiz"),
        });
      }

      setQuizzes(enriched);
    } catch (err: any) {
      console.error("Failed to load quizzes:", err);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzesAndCohorts();
  }, [user]);

  // Reset question builder form
  const resetQuestionInput = () => {
    setQText("");
    setQOptA("");
    setQOptB("");
    setQOptC("");
    setQOptD("");
    setQCorrect(0);
    setQTopic(quizTopic || "");
    setQConcept("");
    setQMarks("1");
  };

  // Add question to manual list
  const handleAddQuestionToDraft = () => {
    if (!qText.trim() || !qOptA.trim() || !qOptB.trim()) {
      toast.error("Please enter question text and at least Options A and B.");
      return;
    }
    if (!qTopic.trim() || !qConcept.trim()) {
      toast.error("Both Topic and Concept metadata are required for each question.");
      return;
    }

    const newQ: QuestionDraft = {
      question: qText.trim(),
      options: [qOptA.trim(), qOptB.trim(), qOptC.trim() || "N/A", qOptD.trim() || "N/A"],
      correct_option_index: Number(qCorrect),
      topic: qTopic.trim(),
      concept: qConcept.trim(),
      marks: Number(qMarks) || 1,
    };

    setQuestions([...questions, newQ]);
    resetQuestionInput();
    toast.success(`Question added! (${questions.length + 1} total questions)`);
  };

  // Remove question from manual list
  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  // Save Manual Quiz (Draft or Published)
  const handleSaveManualQuiz = async (status: "DRAFT" | "PUBLISHED") => {
    if (!quizTitle.trim() || !quizTopic.trim()) {
      toast.error("Please fill in Quiz Title and Topic.");
      return;
    }
    const cohort = teachingCohorts.find((c) => c.id === selectedCohortId);
    if (!cohort) {
      toast.error("Please select a teaching cohort.");
      return;
    }
    if (questions.length === 0) {
      toast.error("Please add at least one question before saving.");
      return;
    }

    setManualSaving(true);
    try {
      // 1. Insert quiz
      const { data: createdQuiz, error: qzErr } = await supabase
        .from("quizzes")
        .insert({
          title: quizTitle.trim(),
          description: quizDesc.trim() || null,
          topic: quizTopic.trim(),
          subject: cohort.subject_name,
          difficulty: "Medium",
          status: status,
          duration_minutes: Number(quizDuration) || 15,
          max_attempts: Number(quizMaxAttempts) || 1,
          teaching_assignment_id: cohort.id,
          classroom_id: cohort.classroom_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (qzErr) throw qzErr;

      // 2. Insert questions with topic and concept
      const toInsert = questions.map((q) => ({
        quiz_id: createdQuiz.id,
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        topic: q.topic,
        concept: q.concept,
        marks: q.marks,
      }));

      const { error: qErr } = await supabase.from("quiz_questions").insert(toInsert);
      if (qErr) throw qErr;

      toast.success(
        status === "PUBLISHED"
          ? `Quiz "${quizTitle}" published to ${cohort.subject_name} (${cohort.classroom?.name})!`
          : `Quiz "${quizTitle}" saved as Draft!`
      );

      setManualModalOpen(false);
      setQuizTitle("");
      setQuizDesc("");
      setQuizTopic("");
      setQuestions([]);
      resetQuestionInput();
      fetchQuizzesAndCohorts();
    } catch (err: any) {
      console.error("Error creating manual quiz:", err);
      toast.error("Failed to create quiz: " + err.message);
    } finally {
      setManualSaving(false);
    }
  };

  // AI Generation Step 1: Generate Questions into Review State
  const handleGenerateAIQuestions = async () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter the target Topic.");
      return;
    }
    const cohort = teachingCohorts.find((c) => c.id === selectedCohortId);
    if (!cohort) {
      toast.error("Please select a teaching cohort.");
      return;
    }

    setAiGenerating(true);
    setAiGeneratingStage("Calling AI engine...");
    try {
      const count = Number(aiNumQuestions) || 4;
      const parsedConcepts = aiConcepts.split(",").map((c) => c.trim()).filter(Boolean);

      setAiGeneratingStage("Generating questions...");
      const result = await generateAndValidateQuiz({
        subject: cohort.subject_name,
        topic: aiTopic.trim(),
        concepts: parsedConcepts,
        difficulty: aiDifficulty as any,
        questionCount: count,
      });
      setAiGeneratingStage("Validating topic accuracy...");

      if (result.error && result.questions.length === 0) {
        console.error("[AI Quiz Generation] Failure:", {
          error: result.error,
          topic: aiTopic,
          concepts: parsedConcepts,
          subject: cohort.subject_name,
        });

        const errLower = (result.error || "").toLowerCase();
        if (errLower.includes("configuration") || errLower.includes("gemini_api_key") || errLower.includes("missing")) {
          toast.error(`AI Configuration Error: ${result.error}`);
        } else if (errLower.includes("rate limit") || errLower.includes("503") || errLower.includes("busy") || errLower.includes("quota")) {
          toast.error(`AI Service Busy: ${result.error}. Please try again in a few moments.`);
        } else {
          toast.error(`Could not generate questions: ${result.error}. Try selecting different concept tags or adjusting the topic.`);
        }
        return;
      }

      if (result.questions.length === 0) {
        toast.error(`No questions met the strict academic criteria for '${aiTopic}'. Try selecting specific concept chips below.`);
        return;
      }

      setAiGeneratedQuestions(result.questions);
      setAiModalOpen(false);
      setAiReviewOpen(true);

      if (result.generatedCount < result.requestedCount) {
        toast.warning(
          `Generated ${result.generatedCount}/${result.requestedCount} questions. ` +
          `${result.rejectedCount} questions were off-topic and removed. ` +
          `You can add more questions manually in the review screen.`
        );
      } else {
        toast.success(
          `Generated ${result.generatedCount} validated, topic-accurate questions!` +
          (result.rejectedCount > 0 ? ` (${result.rejectedCount} off-topic questions auto-removed)` : "")
        );
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      toast.error("Failed to generate questions: " + (err.message || "Unknown error"));
    } finally {
      setAiGenerating(false);
      setAiGeneratingStage("");
    }
  };


  // AI Generation Step 2: Publish or Save Draft from Review Modal
  const handlePublishReviewedQuiz = async (status: "PUBLISHED" | "DRAFT") => {
    if (aiGeneratedQuestions.length === 0) {
      toast.error("Quiz must have at least one question.");
      return;
    }
    const cohort = teachingCohorts.find((c) => c.id === selectedCohortId);
    if (!cohort) return;

    setAiPublishing(true);
    try {
      const title = aiQuizTitle.trim() || `AI Diagnostic: ${aiTopic.trim()}`;
      const { data: createdQuiz, error: qzErr } = await supabase
        .from("quizzes")
        .insert({
          title: title,
          description: `Diagnostic assessment generated with Synapse AI covering: ${aiConcepts || aiTopic}`,
          topic: aiTopic.trim(),
          subject: cohort.subject_name,
          difficulty: aiDifficulty,
          status: status,
          duration_minutes: Number(aiDuration) || 15,
          max_attempts: 1,
          teaching_assignment_id: cohort.id,
          classroom_id: cohort.classroom_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (qzErr) throw qzErr;

      const toInsert = aiGeneratedQuestions.map((q) => ({
        quiz_id: createdQuiz.id,
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        topic: q.topic || aiTopic.trim(),
        concept: q.concept,
        marks: q.marks,
        difficulty: q.difficulty || aiDifficulty,
        explanation: q.explanation || null,
      }));

      const { error: qErr } = await supabase.from("quiz_questions").insert(toInsert);
      if (qErr) throw qErr;

      toast.success(
        status === "PUBLISHED"
          ? `Quiz "${title}" published! Authorized students can now attempt.`
          : `Quiz "${title}" saved as Draft!`
      );

      setAiReviewOpen(false);
      setAiTopic("");
      setAiQuizTitle("");
      setAiConcepts("");
      setAiGeneratedQuestions([]);
      fetchQuizzesAndCohorts();
    } catch (err: any) {
      console.error("Error saving reviewed quiz:", err);
      toast.error("Failed to publish quiz: " + err.message);
    } finally {
      setAiPublishing(false);
    }
  };

  // Toggle quiz status (Publish draft or Close quiz)
  const handleUpdateQuizStatus = async (quizId: string, newStatus: "PUBLISHED" | "CLOSED") => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ status: newStatus })
        .eq("id", quizId);

      if (error) throw error;
      toast.success(`Quiz status updated to ${newStatus}`);
      fetchQuizzesAndCohorts();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (!confirm(`Delete quiz "${title}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
      if (error) throw error;
      toast.success(`Deleted quiz "${title}"`);
      fetchQuizzesAndCohorts();
    } catch (err: any) {
      toast.error("Failed to delete quiz: " + err.message);
    }
  };

  // Open Performance View
  const handleOpenPerformance = async (quiz: RealQuiz) => {
    setSelectedQuizForPerf(quiz);
    setPerfModalOpen(true);
    setPerfLoading(true);

    try {
      // 1. Fetch questions for this quiz with deterministic ordering
      const { data: qData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      const qs = qData || [];

      // 2. Fetch attempts for this quiz
      const { data: attData } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          user_id,
          score,
          max_score,
          percentage,
          answers,
          completed_at,
          user:profiles!quiz_attempts_user_id_fkey(id, name, roll_number)
        `)
        .eq("quiz_id", quiz.id)
        .order("completed_at", { ascending: false });

      const atts = attData || [];
      setAttemptsList(atts);

      // 3. Fetch granular answers from quiz_attempt_answers for authoritative option distribution
      const { data: qAnsData } = await supabase
        .from("quiz_attempt_answers")
        .select("id, attempt_id, student_id, question_id, selected_option, correct_option, is_correct, marks_awarded")
        .eq("quiz_id", quiz.id);

      const attemptAnswers = qAnsData || [];

      // 4. Calculate question-level performance and option distribution
      const optKeys = ["A", "B", "C", "D"] as const;
      const qStats = qs.map((q, idx) => {
        let correctCount = 0;
        let totalAnswered = 0;
        const distribution = { A: 0, B: 0, C: 0, D: 0, unattempted: 0 };
        const correctIndex = Number(q.correct_option_index);

        atts.forEach((a: any) => {
          // Check authoritative quiz_attempt_answers first
          const qAnsRow = attemptAnswers.find(
            (r) => r.attempt_id === a.id && r.question_id === q.id
          );

          if (qAnsRow) {
            if (qAnsRow.selected_option !== null && qAnsRow.selected_option !== undefined) {
              totalAnswered++;
              const optIndex = Number(qAnsRow.selected_option);
              if (optIndex >= 0 && optIndex < 4) {
                distribution[optKeys[optIndex]]++;
              }
              if (qAnsRow.is_correct || optIndex === correctIndex) {
                correctCount++;
              }
            } else {
              distribution.unattempted++;
            }
          } else {
            // Fallback to a.answers
            const ans = a.answers?.[q.id];
            if (ans !== undefined && ans !== null) {
              const chosen = typeof ans === "object" ? ans.chosen_option : ans;
              if (chosen !== null && chosen !== undefined) {
                totalAnswered++;
                const optIndex = Number(chosen);
                if (optIndex >= 0 && optIndex < 4) {
                  distribution[optKeys[optIndex]]++;
                }
                const isCorr =
                  typeof ans === "object"
                    ? Boolean(ans.is_correct)
                    : optIndex === correctIndex;
                if (isCorr) {
                  correctCount++;
                }
              } else {
                distribution.unattempted++;
              }
            } else {
              distribution.unattempted++;
            }
          }
        });

        const pct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
        return {
          id: q.id,
          num: idx + 1,
          question: q.question,
          options: q.options || [],
          correct_option_index: correctIndex,
          topic: q.topic || "General",
          concept: q.concept || "Core Concept",
          correctCount,
          totalAnswered,
          pct,
          distribution,
        };
      });
      setQuestionStats(qStats);

      // 5. Calculate concept-level performance
      const conceptMap: Record<string, { correct: number; total: number }> = {};
      qStats.forEach((qs) => {
        const c = qs.concept;
        if (!conceptMap[c]) conceptMap[c] = { correct: 0, total: 0 };
        conceptMap[c].correct += qs.correctCount;
        conceptMap[c].total += qs.totalAnswered;
      });

      const cStats = Object.entries(conceptMap).map(([concept, data]) => ({
        concept,
        correct: data.correct,
        total: data.total,
        pct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }));
      setConceptStats(cStats);

      // 6. Calculate student-level drilldown for each concept
      const drilldown: Record<
        string,
        Array<{ studentId: string; name: string; rollNumber: string; correct: number; total: number; pct: number }>
      > = {};

      const uniqueConcepts = Array.from(new Set(qs.map((q) => q.concept || "General")));
      uniqueConcepts.forEach((c) => {
        const matchingQIds = qs.filter((q) => (q.concept || "General") === c).map((q) => q.id);
        const studentList: any[] = [];

        atts.forEach((a: any) => {
          let cCorrect = 0;
          let cTotal = 0;

          matchingQIds.forEach((qId) => {
            const qAnsRow = attemptAnswers.find(
              (r) => r.attempt_id === a.id && r.question_id === qId
            );
            if (qAnsRow && qAnsRow.selected_option !== null && qAnsRow.selected_option !== undefined) {
              cTotal++;
              if (qAnsRow.is_correct || qAnsRow.marks_awarded > 0) cCorrect++;
            } else {
              const ans = a.answers?.[qId];
              if (ans !== undefined && ans !== null) {
                const chosen = typeof ans === "object" ? ans.chosen_option : ans;
                if (chosen !== null && chosen !== undefined) {
                  cTotal++;
                  if (ans.is_correct || ans.marks > 0) cCorrect++;
                }
              }
            }
          });

          if (cTotal > 0) {
            const studentId = a.user_id || a.user?.id || a.id;
            studentList.push({
              studentId,
              name: a.user?.name || "Student",
              rollNumber: a.user?.roll_number || "—",
              correct: cCorrect,
              total: cTotal,
              pct: Math.round((cCorrect / cTotal) * 100),
            });
          }
        });

        drilldown[c] = studentList.sort((x, y) => x.pct - y.pct);
      });

      setConceptStudentDrilldown(drilldown);
      setSelectedConceptDrilldown(null);
    } catch (err: any) {
      console.error("Error loading quiz performance:", err);
      toast.error("Failed to load performance analytics");
    } finally {
      setPerfLoading(false);
    }
  };

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                Assessment Studio & Concept Diagnostics
              </Badge>
              <span className="text-xs text-muted-foreground">• Authorized Faculty View</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              Quizzes & Diagnostics
            </h1>
            <p className="text-sm text-muted-foreground">
              Create manual quizzes or generate targeted diagnostic assessments with Synapse AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* AI Generator Button */}
            <Button
              onClick={() => setAiModalOpen(true)}
              disabled={teachingCohorts.length === 0}
              className="gap-2 bg-gradient-to-r from-indigo-600 to-primary text-white font-semibold shadow-md shadow-indigo-500/20 text-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>Create with AI</span>
            </Button>

            {/* Manual Quiz Button */}
            <Button
              onClick={() => {
                setQuizTitle("");
                setQuizDesc("");
                setQuizTopic("");
                setQuestions([]);
                resetQuestionInput();
                setManualModalOpen(true);
              }}
              disabled={teachingCohorts.length === 0}
              variant="outline"
              className="gap-2 text-xs border-indigo-500/30"
            >
              <Plus className="h-4 w-4 text-indigo-600" />
              <span>Manual Quiz</span>
            </Button>
          </div>
        </div>

        {/* Quizzes List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Classroom Quizzes</h2>
            <Badge variant="secondary" className="text-xs">
              {quizzes.length} Total Assessments
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-16 bg-muted/20 rounded-2xl border border-dashed">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : quizzes.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <FileCheck2 className="h-7 w-7" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-base font-bold text-foreground">No Quizzes Created Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    {teachingCohorts.length === 0
                      ? "You do not have any active teaching assignments yet. Contact your administrator to be assigned a subject and cohort."
                      : "Create a manual quiz with custom questions or generate diagnostic questions using Synapse AI."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                            {quiz.cohort_name}
                          </Badge>
                          {quiz.topic && (
                            <Badge variant="secondary" className="text-xs">
                              Topic: {quiz.topic}
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] ${
                              quiz.status === "PUBLISHED"
                                ? "bg-emerald-600 text-white"
                                : quiz.status === "DRAFT"
                                ? "bg-amber-500 text-white"
                                : "bg-slate-500 text-white"
                            }`}
                          >
                            {quiz.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold">{quiz.title}</CardTitle>
                        {quiz.description && (
                          <CardDescription className="text-xs">{quiz.description}</CardDescription>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {quiz.status === "DRAFT" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateQuizStatus(quiz.id, "PUBLISHED")}
                            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Publish
                          </Button>
                        )}
                        {quiz.status === "PUBLISHED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuizStatus(quiz.id, "CLOSED")}
                            className="text-xs h-8 text-amber-600 border-amber-500/30 hover:bg-amber-50"
                          >
                            Close Quiz
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPerformance(quiz)}
                          className="text-xs h-8 gap-1.5 border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                          <span>Performance</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                          className="text-xs h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Quiz"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3 rounded-xl bg-muted/40 border">
                      <div>
                        <span className="text-muted-foreground">Attempts:</span>{" "}
                        <span className="font-bold text-foreground">{quiz.attempts_count || 0} students</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Questions:</span>{" "}
                        <span className="font-bold text-foreground">{quiz.questions_count || 0} items</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Average Score:</span>{" "}
                        <span className="font-bold text-emerald-600">
                          {quiz.attempts_count ? `${quiz.avg_score}%` : "Pending"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>{" "}
                        <span className="font-bold text-foreground">{quiz.duration_minutes || 15} mins</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* MODAL: MANUAL QUIZ BUILDER */}
        <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Create Manual Quiz</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Define questions manually with required Topic and Concept metadata for diagnostic analytics.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Target Cohort */}
              <div className="space-y-1.5">
                <Label htmlFor="m-cohort" className="font-semibold">Assign To Cohort *</Label>
                <select
                  id="m-cohort"
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                >
                  {teachingCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject_name} · {c.classroom?.name} ({c.classroom?.course} Sec {c.classroom?.section})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Topic */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-title" className="font-semibold">Quiz Title *</Label>
                  <Input
                    id="m-title"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="e.g. Normalization & Decomposition Quiz"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-topic" className="font-semibold">Overall Topic *</Label>
                  <Input
                    id="m-topic"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="e.g. Relational Normalization"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Duration & Max Attempts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-dur" className="font-semibold">Duration (Minutes)</Label>
                  <Input
                    id="m-dur"
                    type="number"
                    value={quizDuration}
                    onChange={(e) => setQuizDuration(e.target.value)}
                    min="5"
                    max="180"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-att" className="font-semibold">Max Attempts Allowed</Label>
                  <Input
                    id="m-att"
                    type="number"
                    value={quizMaxAttempts}
                    onChange={(e) => setQuizMaxAttempts(e.target.value)}
                    min="1"
                    max="5"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Added Questions List */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-foreground">Added Questions ({questions.length})</Label>
                  <span className="text-[11px] text-muted-foreground">Each question includes Topic & Concept tags</span>
                </div>

                {questions.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-center text-muted-foreground bg-muted/20">
                    No questions added yet. Use the question builder below.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-start justify-between p-3 rounded-xl border bg-card text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">Q{i + 1}.</span>
                            <Badge variant="outline" className="text-[10px]">Topic: {q.topic}</Badge>
                            <Badge variant="secondary" className="text-[10px]">Concept: {q.concept}</Badge>
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Correct: {["A", "B", "C", "D"][q.correct_option_index]}
                            </Badge>
                          </div>
                          <p className="text-foreground">{q.question}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(i)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question Builder Box */}
              <div className="p-4 rounded-2xl border bg-muted/30 space-y-3">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Add New Question</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Question Statement *</Label>
                  <Textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Enter question statement..."
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Option A *</Label>
                    <Input value={qOptA} onChange={(e) => setQOptA(e.target.value)} placeholder="Option A text" className="text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Option B *</Label>
                    <Input value={qOptB} onChange={(e) => setQOptB(e.target.value)} placeholder="Option B text" className="text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Option C</Label>
                    <Input value={qOptC} onChange={(e) => setQOptC(e.target.value)} placeholder="Option C text" className="text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Option D</Label>
                    <Input value={qOptD} onChange={(e) => setQOptD(e.target.value)} placeholder="Option D text" className="text-xs h-8" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Correct Answer *</Label>
                    <select
                      value={qCorrect}
                      onChange={(e) => setQCorrect(Number(e.target.value))}
                      className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Question Topic *</Label>
                    <Input
                      value={qTopic}
                      onChange={(e) => setQTopic(e.target.value)}
                      placeholder="e.g. Normalization"
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Question Concept *</Label>
                    <Input
                      value={qConcept}
                      onChange={(e) => setQConcept(e.target.value)}
                      placeholder="e.g. 2NF Partial Dep."
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddQuestionToDraft}
                  size="sm"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                >
                  + Add Question to Quiz
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManualModalOpen(false)}
                disabled={manualSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleSaveManualQuiz("DRAFT")}
                disabled={manualSaving || questions.length === 0}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveManualQuiz("PUBLISHED")}
                disabled={manualSaving || questions.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {manualSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Publish Quiz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 1: AI GENERATOR PARAMS */}
        <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <span>AI Assessment Generator</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Generates diagnostic questions with concept tags. You will review and edit all questions before publishing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="ai-cohort" className="font-semibold">Target Cohort *</Label>
                <select
                  id="ai-cohort"
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                >
                  {teachingCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject_name} · {c.classroom?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-quiz-title" className="font-semibold">Quiz Title (optional)</Label>
                <Input
                  id="ai-quiz-title"
                  value={aiQuizTitle}
                  onChange={(e) => setAiQuizTitle(e.target.value)}
                  placeholder={`AI Diagnostic: ${aiTopic || "Topic"}`}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-topic" className="font-semibold">Topic *</Label>
                <Input
                  id="ai-topic"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. Normalization"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-concepts" className="font-semibold">Target Concepts (Comma separated)</Label>
                <Input
                  id="ai-concepts"
                  value={aiConcepts}
                  onChange={(e) => setAiConcepts(e.target.value)}
                  placeholder="e.g. 1NF, 2NF, 3NF, BCNF"
                  className="text-xs"
                />
                {(() => {
                  const activeCohort = teachingCohorts.find((c) => c.id === selectedCohortId);
                  const boundary = activeCohort && aiTopic.trim() ? getTopicBoundary(activeCohort.subject_name, aiTopic) : null;
                  if (!boundary) return null;

                  return (
                    <div className="space-y-1 pt-1 bg-muted/30 p-2 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                        <span>Curriculum concepts for {aiTopic}:</span>
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold">Click to select</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5 max-h-24 overflow-y-auto">
                        {boundary.allowedConcepts.map((c) => {
                          const selected = aiConcepts.toLowerCase().includes(c.toLowerCase());
                          return (
                            <Badge
                              key={c}
                              variant={selected ? "default" : "outline"}
                              className="text-[10px] cursor-pointer hover:opacity-85 transition-opacity"
                              onClick={() => {
                                if (selected) {
                                  const parts = aiConcepts
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter((s) => s.toLowerCase() !== c.toLowerCase());
                                  setAiConcepts(parts.join(", "));
                                } else {
                                  const parts = aiConcepts
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean);
                                  if (!parts.some((s) => s.toLowerCase() === c.toLowerCase())) {
                                    parts.push(c);
                                  }
                                  setAiConcepts(parts.join(", "));
                                }
                              }}
                            >
                              {selected ? `✓ ${c}` : `+ ${c}`}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px]">Difficulty</Label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[11px]">Questions</Label>
                  <Input
                    type="number"
                    value={aiNumQuestions}
                    onChange={(e) => setAiNumQuestions(e.target.value)}
                    min="1"
                    max="10"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Duration (min)</Label>
                  <Input
                    type="number"
                    value={aiDuration}
                    onChange={(e) => setAiDuration(e.target.value)}
                    min="5"
                    max="120"
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={handleGenerateAIQuestions}
                disabled={aiGenerating || !aiTopic.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    <span>{aiGeneratingStage || "Generating questions..."}</span>
                  </>
                ) : (
                  <span>Generate Questions & Review</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: MANDATORY AI REVIEW MODAL BEFORE PUBLISH */}
        <Dialog open={aiReviewOpen} onOpenChange={setAiReviewOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-white text-[10px]">Mandatory Review</Badge>
                <DialogTitle className="text-base font-bold">Review Generated AI Quiz</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Inspect each generated question, edit options or correct answers, and refine concepts before publishing to students.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-indigo-900 dark:text-indigo-300">
                      Topic: {aiTopic} · {aiGeneratedQuestions.length} Questions
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Difficulty: {aiDifficulty} • Target Concepts: {aiConcepts || "Standard Curriculum"}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-background text-xs">
                    {aiDuration} mins
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Quiz Title</Label>
                  <Input
                    value={aiQuizTitle}
                    onChange={(e) => setAiQuizTitle(e.target.value)}
                    placeholder={`AI Diagnostic: ${aiTopic}`}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* Editable Question Cards */}
              <div className="space-y-3">
                {aiGeneratedQuestions.map((q, idx) => (
                  <Card key={idx} className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Question {idx + 1}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Concept: {q.concept}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAiGeneratedQuestions(aiGeneratedQuestions.filter((_, i) => i !== idx))
                        }
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <Input
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...aiGeneratedQuestions];
                          updated[idx].question = e.target.value;
                          setAiGeneratedQuestions(updated);
                        }}
                        className="text-xs"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {["A", "B", "C", "D"][oIdx]}:
                            </span>
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const updated = [...aiGeneratedQuestions];
                                updated[idx].options[oIdx] = e.target.value;
                                setAiGeneratedQuestions(updated);
                              }}
                              className="text-xs h-7"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px]">Correct Answer:</Label>
                          <select
                            value={q.correct_option_index}
                            onChange={(e) => {
                              const updated = [...aiGeneratedQuestions];
                              updated[idx].correct_option_index = Number(e.target.value);
                              setAiGeneratedQuestions(updated);
                            }}
                            className="h-7 rounded border bg-background px-2 text-xs"
                          >
                            <option value={0}>Option A</option>
                            <option value={1}>Option B</option>
                            <option value={2}>Option C</option>
                            <option value={3}>Option D</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-[11px]">Concept Tag:</Label>
                          <Input
                            value={q.concept}
                            onChange={(e) => {
                              const updated = [...aiGeneratedQuestions];
                              updated[idx].concept = e.target.value;
                              setAiGeneratedQuestions(updated);
                            }}
                            className="text-xs h-7 w-32"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Label className="text-[11px]">Marks:</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={q.marks || 1}
                            onChange={(e) => {
                              const updated = [...aiGeneratedQuestions];
                              updated[idx].marks = Number(e.target.value) || 1;
                              setAiGeneratedQuestions(updated);
                            }}
                            className="text-xs h-7 w-16"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const cohort = teachingCohorts.find((c) => c.id === selectedCohortId);
                    setAiGeneratedQuestions([
                      ...aiGeneratedQuestions,
                      {
                        question: "",
                        options: ["", "", "", ""],
                        correct_option_index: 0,
                        subject: cohort?.subject_name || "Subject",
                        topic: aiTopic || "Topic",
                        concept: aiConcepts?.split(",")[0]?.trim() || "Core Concept",
                        difficulty: (aiDifficulty as any) || "Medium",
                        marks: 1,
                        explanation: "",
                      },
                    ]);
                  }}
                  className="w-full text-xs border-dashed gap-1.5 py-4"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Question to Quiz</span>
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAiReviewOpen(false)}
                disabled={aiPublishing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handlePublishReviewedQuiz("DRAFT")}
                disabled={aiPublishing || aiGeneratedQuestions.length === 0}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handlePublishReviewedQuiz("PUBLISHED")}
                disabled={aiPublishing || aiGeneratedQuestions.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {aiPublishing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                <span>Publish Quiz to Classroom</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: PERFORMANCE VIEW (OVERALL + QUESTION LEVEL + CONCEPT LEVEL) */}
        <Dialog open={perfModalOpen} onOpenChange={setPerfModalOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-indigo-600" />
                <span>Quiz Performance: {selectedQuizForPerf?.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Deterministic performance metrics aggregated from actual student attempts.
              </DialogDescription>
            </DialogHeader>

            {perfLoading ? (
              <div className="flex items-center justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : attemptsList.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground border rounded-xl bg-muted/20">
                <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No attempts yet</p>
                <p className="text-xs mt-1">
                  Once enrolled students submit their answers, question and concept performance will calculate automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-6 py-2 text-xs">
                {/* 1. Overall Summary */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl border bg-muted/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Attempts</div>
                    <div className="text-2xl font-extrabold text-foreground">{attemptsList.length}</div>
                  </div>
                  <div className="p-3 rounded-xl border bg-muted/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Average</div>
                    <div className="text-2xl font-extrabold text-indigo-600">
                      {Math.round(
                        attemptsList.reduce((acc, a) => acc + (a.score / (a.max_score || 1)) * 100, 0) /
                          attemptsList.length
                      )}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border bg-muted/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Highest</div>
                    <div className="text-2xl font-extrabold text-emerald-600">
                      {Math.max(...attemptsList.map((a) => a.score))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border bg-muted/40">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Lowest</div>
                    <div className="text-2xl font-extrabold text-amber-600">
                      {Math.min(...attemptsList.map((a) => a.score))}
                    </div>
                  </div>
                </div>

                {/* 2. Concept Performance Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Concept Performance</span>
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {conceptStats.map((cs) => {
                      const isDrilldown = selectedConceptDrilldown === cs.concept;
                      const studentsForConcept = conceptStudentDrilldown[cs.concept] || [];

                      return (
                        <div key={cs.concept} className="space-y-2 border rounded-xl p-3 bg-card transition-all">
                          <div
                            onClick={() => setSelectedConceptDrilldown(isDrilldown ? null : cs.concept)}
                            className="flex items-center justify-between cursor-pointer hover:opacity-85"
                          >
                            <div>
                              <span className="font-semibold text-foreground text-xs">{cs.concept}</span>
                              <span className="text-[10px] text-muted-foreground block">
                                {cs.correct}/{cs.total} correct overall • Click to {isDrilldown ? "close" : "drill down"}
                              </span>
                            </div>
                            <Badge
                              className={`text-xs font-bold ${
                                cs.pct >= 75
                                  ? "bg-emerald-600 text-white"
                                  : cs.pct >= 50
                                  ? "bg-amber-500 text-white"
                                  : "bg-rose-600 text-white"
                              }`}
                            >
                              {cs.pct}%
                            </Badge>
                          </div>

                          {isDrilldown && (
                            <div className="pt-2 border-t space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                                Student Breakdown for {cs.concept}:
                              </span>
                              {studentsForConcept.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">No student attempts recorded for this concept.</p>
                              ) : (
                                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                  {studentsForConcept.map((st) => (
                                    <div
                                      key={st.studentId}
                                      className="flex items-center justify-between p-1.5 rounded bg-muted/30 text-[11px]"
                                    >
                                      <span>
                                        <strong>{st.name}</strong> ({st.rollNumber})
                                      </span>
                                      <span
                                        className={`font-bold ${
                                          st.pct >= 75 ? "text-emerald-600" : st.pct >= 50 ? "text-amber-600" : "text-rose-600"
                                        }`}
                                      >
                                        {st.pct}% ({st.correct}/{st.total})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Question Level Performance Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Question-Level Performance</span>
                  </h4>
                  <div className="border rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Concept</TableHead>
                          <TableHead>Question Preview</TableHead>
                          <TableHead>Option Distribution</TableHead>
                          <TableHead className="text-right">Pass Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questionStats.map((qs) => (
                          <TableRow key={qs.id}>
                            <TableCell className="font-bold text-muted-foreground">Q{qs.num}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{qs.concept}</Badge>
                            </TableCell>
                            <TableCell className="text-foreground max-w-sm truncate">
                              {qs.question}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(["A", "B", "C", "D"] as const).map((letter, optIdx) => {
                                  const isCorrectOpt = optIdx === qs.correct_option_index;
                                  const count = qs.distribution?.[letter] || 0;
                                  return (
                                    <span
                                      key={letter}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                                        isCorrectOpt
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                          : count > 0
                                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                          : "bg-muted/40 text-muted-foreground border-border/50"
                                      }`}
                                      title={`Option ${letter}: ${count} student${count === 1 ? "" : "s"}${isCorrectOpt ? " (Correct Answer)" : ""}`}
                                    >
                                      <span>{letter}:</span>
                                      <span className="font-bold">{count}</span>
                                      {isCorrectOpt && <span className="text-[9px] text-emerald-600 font-bold">✓</span>}
                                    </span>
                                  );
                                })}
                                {(qs.distribution?.unattempted || 0) > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground border bg-muted/20"
                                    title={`Unattempted: ${qs.distribution.unattempted}`}
                                  >
                                    <span>Skip:</span>
                                    <span>{qs.distribution.unattempted}</span>
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              <span className={qs.pct >= 70 ? "text-emerald-600" : "text-amber-600"}>
                                {qs.pct}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 4. Student Submissions Roster */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Student Submissions ({attemptsList.length})</span>
                  </h4>
                  <div className="border rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Student</TableHead>
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead className="text-right">Completed At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attemptsList.map((att) => {
                          const pct = Math.round((att.score / (att.max_score || 1)) * 100);
                          return (
                            <TableRow key={att.id}>
                              <TableCell className="font-semibold text-foreground">
                                {att.user?.name || "Student"}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {att.user?.roll_number || "—"}
                              </TableCell>
                              <TableCell className="font-bold">
                                {att.score} / {att.max_score}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`text-[10px] ${
                                    pct >= 75 ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                                  }`}
                                >
                                  {pct}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {new Date(att.completed_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
