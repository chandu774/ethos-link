import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileCheck2,
  Clock,
  ArrowRight,
  CheckCircle2,
  Search,
  Award,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentQuizItem {
  id: string;
  title: string;
  topic: string;
  subject: string | null;
  difficulty: string;
  status: string;
  duration_minutes: number;
  max_attempts: number;
  classroom_id: string | null;
  classroom_name?: string;
  created_at: string;
  questions_count: number;
  attempts: {
    id: string;
    score: number;
    max_score: number;
    completed_at: string;
  }[];
}

export default function Assessments() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<StudentQuizItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const fetchStudentQuizzes = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch student's enrolled classrooms
      const { data: memberData, error: memErr } = await supabase
        .from("classroom_members")
        .select(`
          classroom_id,
          classroom:classrooms!classroom_members_classroom_id_fkey(
            id,
            name,
            course,
            branch,
            year,
            section
          )
        `)
        .eq("student_id", user.id);

      if (memErr) throw memErr;

      const classroomsMap = new Map<string, string>();
      const enrolledClassroomIds: string[] = [];

      (memberData || []).forEach((m: any) => {
        if (m.classroom_id) {
          enrolledClassroomIds.push(m.classroom_id);
          const c = m.classroom;
          if (c) {
            classroomsMap.set(m.classroom_id, c.name || `${c.course} ${c.branch} - ${c.section}`);
          }
        }
      });

      // 2. Fetch published quizzes for this student's cohort
      let quizQuery = supabase
        .from("quizzes")
        .select("id, title, topic, subject, difficulty, status, duration_minutes, max_attempts, classroom_id, created_at")
        .ilike("status", "PUBLISHED")
        .order("created_at", { ascending: false });

      if (enrolledClassroomIds.length > 0) {
        quizQuery = quizQuery.or(`classroom_id.in.(${enrolledClassroomIds.join(",")}),classroom_id.is.null`);
      } else {
        quizQuery = quizQuery.is("classroom_id", null);
      }

      const { data: rawQuizzes, error: qzErr } = await quizQuery;
      if (qzErr) throw qzErr;

      const quizList = rawQuizzes || [];
      if (quizList.length === 0) {
        setQuizzes([]);
        return;
      }

      // 3. Fetch questions count for each quiz
      const quizIds = quizList.map((q) => q.id);
      const { data: qQuestions } = await supabase
        .from("quiz_questions")
        .select("id, quiz_id")
        .in("quiz_id", quizIds);

      const questionCounts: Record<string, number> = {};
      (qQuestions || []).forEach((q: any) => {
        questionCounts[q.quiz_id] = (questionCounts[q.quiz_id] || 0) + 1;
      });

      // 4. Fetch student's attempts for these quizzes
      const { data: studentAttempts } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, max_score, completed_at")
        .eq("user_id", user.id)
        .in("quiz_id", quizIds)
        .order("completed_at", { ascending: false });

      const attemptsByQuiz: Record<string, any[]> = {};
      (studentAttempts || []).forEach((att: any) => {
        if (!attemptsByQuiz[att.quiz_id]) {
          attemptsByQuiz[att.quiz_id] = [];
        }
        attemptsByQuiz[att.quiz_id].push(att);
      });

      // 5. Assemble enriched quiz items
      const enriched: StudentQuizItem[] = quizList.map((q) => {
        const clsName = q.classroom_id ? classroomsMap.get(q.classroom_id) || "Enrolled Classroom" : "General";
        return {
          id: q.id,
          title: q.title,
          topic: q.topic,
          subject: q.subject,
          difficulty: q.difficulty || "Medium",
          status: q.status,
          duration_minutes: q.duration_minutes || 15,
          max_attempts: q.max_attempts || 1,
          classroom_id: q.classroom_id,
          classroom_name: clsName,
          created_at: q.created_at,
          questions_count: questionCounts[q.id] || 0,
          attempts: attemptsByQuiz[q.id] || [],
        };
      });

      setQuizzes(enriched);
    } catch (err: any) {
      console.error("Failed to load student quizzes:", err);
      toast.error("Failed to load assessments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentQuizzes();
  }, [user]);

  // Filtered quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.subject && q.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.classroom_name && q.classroom_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const isCompleted = q.attempts.length >= q.max_attempts;
    if (filter === "completed") return isCompleted;
    if (filter === "pending") return !isCompleted;
    return true;
  });

  // Calculate high-level summary metrics
  const totalQuizzes = quizzes.length;
  const completedCount = quizzes.filter((q) => q.attempts.length >= q.max_attempts).length;
  const attemptedQuizzes = quizzes.filter((q) => q.attempts.length > 0);
  const avgPercentage =
    attemptedQuizzes.length > 0
      ? Math.round(
          attemptedQuizzes.reduce((acc, q) => {
            const best = q.attempts[0];
            const max = best.max_score || 1;
            return acc + ((best.score || 0) / max) * 100;
          }, 0) / attemptedQuizzes.length
        )
      : null;

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Classroom Assessments
              </Badge>
              <span className="text-xs text-muted-foreground">• Real Faculty Quizzes</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Quizzes & Assessments
            </h1>
            <p className="text-sm text-muted-foreground">
              Official quizzes and checkpoints published by your faculty. Submissions update your concept mastery profile.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStudentQuizzes}
            disabled={loading}
            className="gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Assigned Quizzes</p>
                <div className="text-2xl font-bold">{totalQuizzes}</div>
                <p className="text-[11px] text-muted-foreground">Cohort Assessments</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <FileCheck2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Completed</p>
                <div className="text-2xl font-bold">{completedCount}</div>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{totalQuizzes > 0 ? `${Math.round((completedCount / totalQuizzes) * 100)}% finished` : "Up to date"}</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Average Mastery</p>
                <div className="text-2xl font-bold">
                  {avgPercentage !== null ? `${avgPercentage}%` : "—"}
                </div>
                <p className="text-[11px] text-muted-foreground">Across graded attempts</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by topic, subject, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border text-xs">
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs font-medium px-3"
              onClick={() => setFilter("all")}
            >
              All ({quizzes.length})
            </Button>
            <Button
              variant={filter === "pending" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs font-medium px-3"
              onClick={() => setFilter("pending")}
            >
              Pending ({quizzes.filter((q) => q.attempts.length < q.max_attempts).length})
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs font-medium px-3"
              onClick={() => setFilter("completed")}
            >
              Completed ({completedCount})
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs text-muted-foreground">Loading your classroom quizzes...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredQuizzes.length === 0 && (
          <Card className="border shadow-sm">
            <CardContent className="py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {searchTerm || filter !== "all" ? "No Matching Quizzes" : "No Quizzes Published Yet"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {searchTerm || filter !== "all"
                  ? "Try adjusting your search query or switching filters to see all available assessments."
                  : "Your faculty members haven't published any quizzes for your classrooms yet. When a new quiz is published, it will appear here immediately."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quizzes List / Grid */}
        {!loading && filteredQuizzes.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredQuizzes.map((quiz) => {
              const attemptCount = quiz.attempts.length;
              const hasAttempts = attemptCount > 0;
              const isMaxReached = attemptCount >= quiz.max_attempts;
              const latestAttempt = hasAttempts ? quiz.attempts[0] : null;
              const latestScore = latestAttempt
                ? Math.round(((latestAttempt.score || 0) / (latestAttempt.max_score || 1)) * 100)
                : null;

              return (
                <Card
                  key={quiz.id}
                  className="border shadow-sm hover:border-indigo-500/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Badges Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {quiz.subject && (
                          <Badge variant="outline" className="border-indigo-500/30 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            {quiz.subject}
                          </Badge>
                        )}
                        {quiz.classroom_name && (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            {quiz.classroom_name}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            quiz.difficulty === "Easy"
                              ? "text-emerald-600 border-emerald-500/30"
                              : quiz.difficulty === "Hard"
                              ? "text-rose-600 border-rose-500/30"
                              : "text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {quiz.difficulty}
                        </Badge>
                      </div>

                      {hasAttempts && (
                        <Badge
                          className={`text-[11px] shrink-0 ${
                            isMaxReached
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0"
                          }`}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Score: {latestAttempt?.score}/{latestAttempt?.max_score} ({latestScore}%)
                        </Badge>
                      )}
                    </div>

                    {/* Quiz Title & Topic */}
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground line-clamp-1">{quiz.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        Topic: <strong className="text-foreground">{quiz.topic}</strong>
                      </p>
                    </div>

                    {/* Metadata strip */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />
                        {quiz.questions_count} Question{quiz.questions_count !== 1 ? "s" : ""}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        ~{quiz.duration_minutes} mins
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        {attemptCount}/{quiz.max_attempts} Attempt{quiz.max_attempts !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {isMaxReached
                          ? "Maximum attempts completed"
                          : hasAttempts
                          ? "Attempts remaining"
                          : "Ready to start"}
                      </span>

                      <Button
                        size="sm"
                        onClick={() => navigate(`/student/quizzes/${quiz.id}`)}
                        className={`gap-1.5 text-xs font-semibold ${
                          isMaxReached
                            ? "bg-muted text-foreground hover:bg-muted/80 border"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25"
                        }`}
                      >
                        <span>
                          {isMaxReached ? "View Score" : hasAttempts ? "Retake Quiz" : "Start Quiz"}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
