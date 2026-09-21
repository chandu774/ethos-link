import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ArrowLeft,
  Users,
  BookOpen,
  ClipboardList,
  FileCheck2,
  Award,
  Calendar,
  Clock,
  Plus,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BarChart2,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function FacultyTeachingDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [teachingAssignment, setTeachingAssignment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);

  // Student Performance Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Create Quiz Modal State
  const [createQuizOpen, setCreateQuizOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDifficulty, setQuizDifficulty] = useState("medium");
  const [quizLoading, setQuizLoading] = useState(false);

  // Create Assignment Modal State
  const [createAsgOpen, setCreateAsgOpen] = useState(false);
  const [asgTitle, setAsgTitle] = useState("");
  const [asgDesc, setAsgDesc] = useState("");
  const [asgTopic, setAsgTopic] = useState("");
  const [asgDeadline, setAsgDeadline] = useState("");
  const [asgMaxMarks, setAsgMaxMarks] = useState("20");
  const [asgLoading, setAsgLoading] = useState(false);
  const [asgFile, setAsgFile] = useState<File | null>(null);

  const fetchAssignmentData = async () => {
    if (!assignmentId || !user) return;
    setLoading(true);

    try {
      // 1. Fetch teaching assignment - strictly authorized to current faculty
      const { data: ta, error: taErr } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          faculty_id,
          classroom_id,
          subject_name,
          subject_code,
          classroom:classrooms!teaching_assignments_classroom_id_fkey(id, name, course, branch, year, section, academic_year)
        `)
        .eq("id", assignmentId)
        .eq("faculty_id", user.id)
        .single();

      if (taErr || !ta) {
        toast.error("You are not authorized to view this teaching assignment, or it does not exist.");
        navigate("/faculty/dashboard");
        return;
      }
      setTeachingAssignment(ta);

      // 2. Fetch students enrolled in this classroom
      const { data: memberData } = await supabase
        .from("classroom_members")
        .select(`
          student_id,
          role,
          student:profiles!classroom_members_student_id_fkey(id, name, roll_number, course, branch, year, section, email)
        `)
        .eq("classroom_id", ta.classroom_id);

      const studentList = (memberData || []).map((m: any) => m.student).filter(Boolean);
      setStudents(studentList);

      // 3. Fetch quizzes for this teaching assignment
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id, title, topic, difficulty, created_at")
        .eq("teaching_assignment_id", assignmentId)
        .order("created_at", { ascending: false });
      setQuizzes(quizData || []);

      // 4. Fetch assignments for this teaching assignment
      const { data: asgData } = await supabase
        .from("assignments")
        .select(`
          id, title, topic, deadline, max_marks, estimated_effort, attachment_url, attachment_name, created_at,
          submissions:assignment_submissions(id, user_id, marks_obtained, status, submitted_at, attachment_url, attachment_name, submission_text)
        `)
        .eq("teaching_assignment_id", assignmentId)
        .order("created_at", { ascending: false });
      setAssignments(asgData || []);

      // 5. Fetch quiz attempts for these quizzes
      if (quizData && quizData.length > 0) {
        const quizIds = quizData.map((q) => q.id);
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("id, user_id, quiz_id, score, max_score, completed_at")
          .in("quiz_id", quizIds);
        setQuizAttempts(attempts || []);
      } else {
        setQuizAttempts([]);
      }
    } catch (err: any) {
      console.error("Failed to load teaching assignment data:", err);
      toast.error("Failed to load classroom details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, [assignmentId, user?.id]);

  // Create Quiz tied to this teaching assignment
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim() || !user || !teachingAssignment) return;

    setQuizLoading(true);
    try {
      const { data: newQuiz, error } = await supabase
        .from("quizzes")
        .insert({
          title: quizTitle.trim(),
          topic: quizTopic.trim() || teachingAssignment.subject_name,
          difficulty: quizDifficulty,
          subject: teachingAssignment.subject_name,
          teaching_assignment_id: teachingAssignment.id,
          classroom_id: teachingAssignment.classroom_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add a default sample question
      await supabase.from("quiz_questions").insert({
        quiz_id: newQuiz.id,
        question: `What is the core principle of ${quizTopic.trim() || teachingAssignment.subject_name}?`,
        options: ["Data Integrity & Isolation", "Redundant Storage", "Unindexed Tables", "Unchecked Updates"],
        correct_option_index: 0,
        explanation: "Maintains ACID properties and schema consistency.",
        topic: quizTopic.trim() || teachingAssignment.subject_name,
      });

      toast.success(`Quiz "${quizTitle}" created for ${teachingAssignment.classroom.name}!`);
      setQuizTitle("");
      setQuizTopic("");
      setCreateQuizOpen(false);
      fetchAssignmentData();
    } catch (err: any) {
      toast.error("Failed to create quiz: " + (err.message || "Unknown error"));
    } finally {
      setQuizLoading(false);
    }
  };

  // Create Assignment tied to this teaching assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim() || !asgDeadline || !user || !teachingAssignment) return;

    setAsgLoading(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (asgFile) {
        attachmentName = asgFile.name;
        const fileExt = asgFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("assignment-files")
          .upload(filePath, asgFile, { contentType: "application/pdf" });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("assignment-files")
          .getPublicUrl(filePath);

        attachmentUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from("assignments").insert({
        title: asgTitle.trim(),
        description: asgDesc.trim() || null,
        topic: asgTopic.trim() || teachingAssignment.subject_name,
        deadline: new Date(asgDeadline).toISOString(),
        max_marks: parseFloat(asgMaxMarks) || 20,
        teaching_assignment_id: teachingAssignment.id,
        classroom_id: teachingAssignment.classroom_id,
        created_by: user.id,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      });

      if (insertError) throw insertError;

      toast.success(`Assignment "${asgTitle}" posted for ${teachingAssignment.classroom.name}!`);
      setAsgTitle("");
      setAsgDesc("");
      setAsgTopic("");
      setAsgDeadline("");
      setAsgFile(null);
      setCreateAsgOpen(false);
      fetchAssignmentData();
    } catch (err: any) {
      toast.error("Failed to create assignment: " + (err.message || "Unknown error"));
    } finally {
      setAsgLoading(false);
    }
  };

  if (loading) {
    return (
      <FacultyLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </FacultyLayout>
    );
  }

  if (!teachingAssignment) {
    return null;
  }

  // Calculate real performance metrics
  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissions?.length || 0), 0);
  const totalAttemptsCount = quizAttempts.length;
  const avgQuizScore = totalAttemptsCount > 0
    ? Math.round(quizAttempts.reduce((acc, att) => acc + ((att.score / (att.max_score || 1)) * 100), 0) / totalAttemptsCount)
    : null;

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Navigation & Subject Header */}
        <div className="space-y-3">
          <Link
            to="/faculty/classrooms"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Classrooms
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border bg-card shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-xs font-mono">
                  {teachingAssignment.subject_code}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {teachingAssignment.classroom.name}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {teachingAssignment.subject_name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Cohort: {teachingAssignment.classroom.course} {teachingAssignment.classroom.branch} • Year {teachingAssignment.classroom.year} - Section {teachingAssignment.classroom.section} ({teachingAssignment.classroom.academic_year})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateQuizOpen(true)}
                className="gap-1.5 text-xs font-semibold border-indigo-200 dark:border-indigo-900"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Quiz</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateAsgOpen(true)}
                className="gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Post Assignment</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Real Performance Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Enrolled Students</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{students.length}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Active in cohort</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Subject Quizzes</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{quizzes.length}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalAttemptsCount} total attempts
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Quiz Average</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {avgQuizScore !== null ? `${avgQuizScore}%` : "—"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {avgQuizScore !== null ? "Across all attempts" : "No quiz data yet"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Assignments Posted</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{assignments.length}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalSubmissions} submissions received
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <ClipboardList className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Students, Quizzes, Assignments, Analysis */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="bg-muted/40 p-1">
            <TabsTrigger value="students" className="text-xs gap-1.5 font-medium">
              <Users className="h-3.5 w-3.5" />
              <span>Students ({students.length})</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs gap-1.5 font-medium">
              <Award className="h-3.5 w-3.5" />
              <span>Quizzes ({quizzes.length})</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs gap-1.5 font-medium">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Assignments ({assignments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs gap-1.5 font-medium">
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Topic Analysis</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Students Roster */}
          <TabsContent value="students" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base font-bold">Classroom Student Roster</CardTitle>
                <CardDescription className="text-xs">
                  Students enrolled in {teachingAssignment.classroom.name}. Click a student to inspect their {teachingAssignment.subject_name} performance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {students.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No students enrolled in this classroom</p>
                    <p className="text-xs mt-1">The administrator allocates students to this classroom cohort.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs font-semibold">Roll Number</TableHead>
                        <TableHead className="text-xs font-semibold">Student Name</TableHead>
                        <TableHead className="text-xs font-semibold">Course & Branch</TableHead>
                        <TableHead className="text-xs font-semibold">Subject Quizzes Taken</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((st) => {
                        const studentAttempts = quizAttempts.filter((qa) => qa.user_id === st.id);
                        return (
                          <TableRow key={st.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono font-semibold text-xs text-foreground">
                              {st.roll_number || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground">
                              {st.name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {st.course} ({st.branch})
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="secondary" className="text-[10px]">
                                {studentAttempts.length} quizzes
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setSelectedStudent(st)}
                              >
                                View Subject Performance
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Quizzes */}
          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Subject Quizzes</h3>
                <p className="text-xs text-muted-foreground">
                  Quizzes scoped exclusively to {teachingAssignment.subject_name} for {teachingAssignment.classroom.name}.
                </p>
              </div>
              <Button size="sm" onClick={() => setCreateQuizOpen(true)} className="gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-3.5 w-3.5" />
                Create Quiz
              </Button>
            </div>

            {quizzes.length === 0 ? (
              <Card className="border-dashed p-10 text-center">
                <Award className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No quizzes created yet for this class</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a diagnostic checkpoint or unit quiz using the button above.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((q) => {
                  const qAttempts = quizAttempts.filter((qa) => qa.quiz_id === q.id);
                  const qAvg = qAttempts.length > 0
                    ? Math.round(qAttempts.reduce((acc, att) => acc + ((att.score / (att.max_score || 1)) * 100), 0) / qAttempts.length)
                    : null;

                  return (
                    <Card key={q.id} className="border shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge variant="outline" className="text-[10px] mb-1">
                              {q.topic || teachingAssignment.subject_name}
                            </Badge>
                            <h4 className="text-sm font-bold text-foreground">{q.title}</h4>
                          </div>
                          <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] capitalize">
                            {q.difficulty}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>{qAttempts.length} student attempts</span>
                          <span className="font-semibold text-foreground">
                            {qAvg !== null ? `Average: ${qAvg}%` : "Pending attempts"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Assignments */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Coursework Assignments</h3>
                <p className="text-xs text-muted-foreground">
                  Problem sheets and submissions for {teachingAssignment.subject_name}.
                </p>
              </div>
              <Button size="sm" onClick={() => setCreateAsgOpen(true)} className="gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-3.5 w-3.5" />
                Post Assignment
              </Button>
            </div>

            {assignments.length === 0 ? (
              <Card className="border-dashed p-10 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No assignments posted yet for this class</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Post an assignment with an attached PDF problem sheet using the button above.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignments.map((asg) => (
                  <Card key={asg.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">{asg.title}</h4>
                            {asg.topic && (
                              <Badge variant="outline" className="text-[10px]">
                                {asg.topic}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Due: {new Date(asg.deadline).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>Max Marks: {asg.max_marks}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {asg.attachment_url && (
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                              <a href={asg.attachment_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3.5 w-3.5" />
                                Problem PDF
                              </a>
                            </Button>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {asg.submissions?.length || 0} Submissions
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: Topic Analysis */}
          <TabsContent value="analysis" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base font-bold">Subject Concept & Topic Performance</CardTitle>
                <CardDescription className="text-xs">
                  Derived from student quiz attempts in {teachingAssignment.subject_name}.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {quizzes.length === 0 || totalAttemptsCount === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <BarChart2 className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No quiz data available yet</p>
                    <p className="text-xs mt-1">
                      As students complete quizzes in {teachingAssignment.subject_name}, concept mastery metrics will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Analysis based on {totalAttemptsCount} quiz submissions across {quizzes.length} assessments.
                    </p>
                    <div className="space-y-3">
                      {quizzes.map((q) => {
                        const qAttempts = quizAttempts.filter((qa) => qa.quiz_id === q.id);
                        const avg = qAttempts.length > 0
                          ? Math.round(qAttempts.reduce((acc, att) => acc + ((att.score / (att.max_score || 1)) * 100), 0) / qAttempts.length)
                          : 0;

                        return (
                          <div key={q.id} className="p-3 border rounded-xl flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-foreground">{q.topic || q.title}</div>
                              <div className="text-[11px] text-muted-foreground">{qAttempts.length} students assessed</div>
                            </div>
                            <Badge className={avg >= 75 ? "bg-emerald-500/10 text-emerald-600" : avg >= 50 ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"}>
                              {avg}% Mastery
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal: Subject Student Performance (Section 14) */}
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {selectedStudent?.name} • {teachingAssignment.subject_name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Roll Number: {selectedStudent?.roll_number} • Cohort: {teachingAssignment.classroom.name}
              </DialogDescription>
            </DialogHeader>

            {selectedStudent && (
              <div className="space-y-4 py-2">
                <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
                  <div className="text-xs font-semibold text-foreground">
                    Subject Scoped Performance ({teachingAssignment.subject_code})
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Showing strictly {teachingAssignment.subject_name} records. Unrelated subject records are not accessible.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-foreground">Quizzes Taken in {teachingAssignment.subject_name}:</div>
                  {(() => {
                    const studentAttempts = quizAttempts.filter((qa) => qa.user_id === selectedStudent.id);
                    if (studentAttempts.length === 0) {
                      return <p className="text-xs text-muted-foreground italic">No quiz attempts recorded yet.</p>;
                    }
                    return (
                      <div className="space-y-1.5">
                        {studentAttempts.map((att) => (
                          <div key={att.id} className="flex items-center justify-between text-xs p-2 border rounded-lg">
                            <span>Score: {att.score} / {att.max_score}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {new Date(att.completed_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button size="sm" onClick={() => setSelectedStudent(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Create Quiz */}
        <Dialog open={createQuizOpen} onOpenChange={setCreateQuizOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Create Subject Quiz</DialogTitle>
              <DialogDescription className="text-xs">
                Creating quiz for {teachingAssignment.subject_name} ({teachingAssignment.classroom.name}).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateQuiz} className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-medium">Quiz Title *</Label>
                <Input
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Relational Normalization Checkpoint"
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Topic / Unit</Label>
                <Input
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="e.g. 2NF & BCNF"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateQuizOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={quizLoading} className="bg-indigo-600 text-white">
                  {quizLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Create Quiz
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Post Assignment */}
        <Dialog open={createAsgOpen} onOpenChange={setCreateAsgOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Post Subject Assignment</DialogTitle>
              <DialogDescription className="text-xs">
                Creating assignment for {teachingAssignment.subject_name} ({teachingAssignment.classroom.name}).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAssignment} className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-medium">Assignment Title *</Label>
                <Input
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  placeholder="e.g. Assignment 3: ACID Transactions"
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Topic</Label>
                  <Input
                    value={asgTopic}
                    onChange={(e) => setAsgTopic(e.target.value)}
                    placeholder="e.g. Transactions"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Max Marks</Label>
                  <Input
                    type="number"
                    value={asgMaxMarks}
                    onChange={(e) => setAsgMaxMarks(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Deadline *</Label>
                <Input
                  type="datetime-local"
                  value={asgDeadline}
                  onChange={(e) => setAsgDeadline(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Attach Problem Sheet PDF (Optional)</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAsgFile(e.target.files?.[0] || null)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Instructions (Optional)</Label>
                <Textarea
                  value={asgDesc}
                  onChange={(e) => setAsgDesc(e.target.value)}
                  placeholder="Instructions for students..."
                  className="mt-1 text-xs min-h-[60px]"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateAsgOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={asgLoading} className="bg-indigo-600 text-white">
                  {asgLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Post Assignment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
