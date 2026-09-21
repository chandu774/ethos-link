import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Send,
  Sparkles,
  FileCheck2,
  Video,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Play,
  RotateCcw,
  Layers,
  HelpCircle,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ClassroomDetail() {
  const { classroomId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const synapse = useSynapse();

  const isTeacher = synapse.currentRole === "teacher";
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  const classroom = synapse.classrooms.find((c) => c.id === classroomId) || synapse.classrooms[0];

  // Classroom Quizzes State
  const [classroomQuizzes, setClassroomQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  useEffect(() => {
    if (!classroomId) return;
    const fetchClassQuizzes = async () => {
      setLoadingQuizzes(true);
      try {
        const { data } = await supabase
          .from("quizzes")
          .select("id, title, topic, subject, difficulty, status, duration_minutes, max_attempts")
          .eq("classroom_id", classroomId)
          .ilike("status", "PUBLISHED");
        setClassroomQuizzes(data || []);
      } catch (err) {
        console.error("Error fetching classroom quizzes:", err);
      } finally {
        setLoadingQuizzes(false);
      }
    };
    fetchClassQuizzes();
  }, [classroomId]);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [isPostingAnn, setIsPostingAnn] = useState(false);

  // Assignment Modal State (Teacher)
  const [asgModalOpen, setAsgModalOpen] = useState(false);
  const [newAsgTitle, setNewAsgTitle] = useState("DBMS Assignment 4: Transaction Concurrency");
  const [newAsgDesc, setNewAsgDesc] = useState("Draw precedence graphs for concurrent schedules S1 and S2 to detect conflict serializability.");
  const [newAsgTopic, setNewAsgTopic] = useState("Transactions");
  const [newAsgDueDate, setNewAsgDueDate] = useState("Next Friday");
  const [newAsgDueTime, setNewAsgDueTime] = useState("Friday, 11:59 PM");
  const [newAsgMarks, setNewAsgMarks] = useState(25);
  const [newAsgEffort, setNewAsgEffort] = useState(40);

  // Submission Modal State (Student)
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submittingAsgId, setSubmittingAsgId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annContent.trim()) {
      toast.error("Announcement content cannot be empty.");
      return;
    }

    synapse.postClassroomAnnouncement(
      classroom.id,
      annTitle.trim() || "Course Update",
      annContent,
      annContent.toLowerCase().includes("assignment") ? "assignment_notice" : "announcement"
    );

    toast.success("Announcement posted to class feed. Students notified.");
    setAnnTitle("");
    setAnnContent("");
    setIsPostingAnn(false);
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgTitle.trim()) {
      toast.error("Please provide an assignment title.");
      return;
    }

    synapse.createTeacherAssignment(
      classroom.id,
      newAsgTitle,
      newAsgDesc,
      newAsgTopic,
      newAsgDueDate,
      newAsgDueTime,
      Number(newAsgMarks),
      Number(newAsgEffort),
      "HIGH"
    );

    toast.success(`Official Assignment "${newAsgTitle}" created and synchronized into student Tasks!`);
    setAsgModalOpen(false);
  };

  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAsgId) return;

    synapse.submitStudentAssignment(submittingAsgId, classroom.id, submissionText || "Completed relational schema decomposition into 2NF & 3NF.");
    toast.success("Assignment submitted successfully! Task marked completed.");
    setSubmitModalOpen(false);
    setSubmissionText("");
    setSubmittingAsgId(null);
  };

  const copyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(classroom.classCode);
      toast.success(`Class Code ${classroom.classCode} copied to clipboard!`);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Navigation & Classroom Header Banner */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/classrooms")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Classrooms</span>
          </Button>

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-card via-card/95 to-primary/5 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-mono font-semibold text-primary">
                    {classroom.code} • {classroom.section}
                  </Badge>
                  <Badge className="bg-muted text-foreground hover:bg-muted font-mono text-xs flex items-center gap-1 cursor-pointer" onClick={copyCode} title="Click to copy class code">
                    <span>Code: {classroom.classCode}</span>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </Badge>
                  <span className="text-xs text-muted-foreground">• Academic Year {classroom.academicYear}</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {classroom.name}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  {classroom.description}
                </p>

                <div className="pt-1 flex items-center gap-2 text-xs text-foreground font-medium">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span>Instructor: {classroom.teacherName}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 text-xs font-semibold",
                    isTeacher ? "border-purple-500/40 text-purple-600 bg-purple-500/10" : "border-blue-500/40 text-blue-600 bg-blue-500/10"
                  )}
                  onClick={() => {
                    const next = isTeacher ? "student" : "teacher";
                    synapse.switchRole(next);
                    toast.info(`Switched view to ${next === "teacher" ? "Faculty (Dr. Aris Rao)" : "Student (Alex Chen)"}`);
                  }}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Viewing as: {isTeacher ? "Teacher" : "Student"}</span>
                </Button>

                {isTeacher && (
                  <Button
                    size="sm"
                    className="h-9 gap-1.5 bg-primary text-primary-foreground font-medium"
                    onClick={() => setAsgModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Official Assignment</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Classroom Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="w-full flex-wrap justify-start h-auto gap-1 bg-muted/40 p-1 border border-border/50">
            <TabsTrigger value="overview" className="text-xs py-2 px-3">Overview</TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs py-2 px-3 flex items-center gap-1.5">
              <span>Announcements / Feed</span>
              {classroom.announcements.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{classroom.announcements.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs py-2 px-3 flex items-center gap-1.5">
              <span>Assignments</span>
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">{classroom.assignments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-xs py-2 px-3">Resources & Notes</TabsTrigger>
            <TabsTrigger value="lectures" className="text-xs py-2 px-3">Lectures</TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs py-2 px-3">Quizzes</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs py-2 px-3">Attendance</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs py-2 px-3 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Class Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* ================= TAB 1: OVERVIEW ================= */}
          <TabsContent value="overview" className="space-y-5">
            {/* Quick Metrics */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/60 bg-card/80 p-4">
                <span className="text-xs text-muted-foreground block">Enrolled Students</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">{classroom.studentsCount}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">Section {classroom.section}</span>
              </Card>

              <Card className="border-border/60 bg-card/80 p-4">
                <span className="text-xs text-muted-foreground block">Assignments</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">{classroom.assignmentsCount}</span>
                <span className="text-[11px] text-primary mt-0.5 block">{classroom.upcomingCount} pending review</span>
              </Card>

              <Card className="border-border/60 bg-card/80 p-4">
                <span className="text-xs text-muted-foreground block">Class Average Mastery</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">{classroom.averagePerformance}%</span>
                <Progress value={classroom.averagePerformance} className="mt-2 h-1.5" />
              </Card>

              <Card className="border-border/60 bg-card/80 p-4">
                <span className="text-xs text-muted-foreground block">Classroom Code</span>
                <span className="text-xl font-bold font-mono text-primary mt-1 block">{classroom.classCode}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">Share with classmates to join</span>
              </Card>
            </div>

            {/* Upcoming Deadlines & Active Topic Status */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Upcoming Deadlines */}
              <Card className="border-border/60 bg-card/80">
                <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Upcoming Classroom Deadlines</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Official dates set by instructor</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => handleTabChange("assignments")}>
                    View all
                  </Button>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3">
                  {classroom.assignments.map((asg) => (
                    <div key={asg.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground block">{asg.title}</span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{asg.topic}</Badge>
                          <span>Due: <strong className="text-foreground">{asg.dueDateTime}</strong></span>
                        </div>
                      </div>
                      <Badge className={asg.status === "submitted" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"}>
                        {asg.status === "submitted" ? "Submitted" : `${asg.maxMarks} Marks`}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Topic Mastery In This Subject */}
              <Card className="border-border/60 bg-card/80">
                <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Your Concept Mastery ({classroom.code})</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Calculated from your quiz results</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/my-learning")}>
                    Knowledge Map
                  </Button>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3">
                  {synapse.concepts.filter(c => c.courseCode === classroom.code).map((c) => (
                    <div key={c.id} className="space-y-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{c.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold",
                            c.status === "mastered" && "border-emerald-500/40 text-emerald-600 bg-emerald-500/10",
                            c.status === "improving" && "border-amber-500/40 text-amber-600 bg-amber-500/10",
                            c.status === "gap" && "border-red-500/40 text-red-600 bg-red-500/10 animate-pulse"
                          )}
                        >
                          {c.mastery}% • {c.status.toUpperCase()}
                        </Badge>
                      </div>
                      <Progress value={c.mastery} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ================= TAB 2: ANNOUNCEMENTS / CLASS FEED ================= */}
          <TabsContent value="announcements" className="space-y-4">
            {/* Teacher Post Announcement Box (Only Teacher Can Post) */}
            {isTeacher ? (
              <Card className="border-primary/30 bg-card/90 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold">Post to Classroom Feed</CardTitle>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Posts are analyzed by Synapse NLP. Deadlines and assignments mentioned will automatically synchronize into student Tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <form onSubmit={handlePostAnnouncement} className="space-y-3">
                    <Input
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Announcement Subject (e.g. DBMS Assignment 3 & Friday Quiz Notice)..."
                      className="text-xs h-9 bg-background"
                    />
                    <Textarea
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      placeholder="Write your announcement... (e.g. 'DBMS Assignment 3 is due Monday. Normalization quiz Friday.')"
                      className="text-xs min-h-[80px] bg-background"
                      required
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        Synapse NLP Task Extraction Active
                      </span>
                      <Button type="submit" size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground font-medium text-xs">
                        <Send className="h-3.5 w-3.5" />
                        <span>Post Announcement</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">
                  Official announcements from your instructor <strong>{classroom.teacherName}</strong>. Tasks and deadlines mentioned here automatically synchronize into your Tasks.
                </span>
                <Badge variant="outline" className="text-[10px]">Verified Feed</Badge>
              </div>
            )}

            {/* Announcements List */}
            <div className="space-y-3.5">
              {classroom.announcements.map((ann) => (
                <Card key={ann.id} className="border-border/60 bg-card/85 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {ann.authorName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-foreground block">{ann.authorName}</span>
                          <span className="text-[10px] text-muted-foreground block">{ann.date}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {ann.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground">{ann.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1 whitespace-pre-line">
                        {ann.content}
                      </p>
                    </div>

                    {/* Auto-extracted task banner if present */}
                    {ann.extractedTask && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Auto-Synchronized Academic Task</span>
                          </div>
                          <span className="text-foreground block font-medium">{ann.extractedTask.title}</span>
                          <span className="text-muted-foreground block text-[11px]">Due: {ann.extractedTask.deadline} • Estimated: {ann.extractedTask.estimatedMinutes} mins</span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-medium shrink-0"
                          onClick={() => navigate("/tasks")}
                        >
                          View in Tasks
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ================= TAB 3: ASSIGNMENTS ================= */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Classroom Assignments</h3>
                <p className="text-xs text-muted-foreground">Official coursework created by instructor. Synchronized with student Tasks.</p>
              </div>
              {isTeacher && (
                <Button size="sm" className="h-8 gap-1 text-xs bg-primary text-primary-foreground" onClick={() => setAsgModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Assignment</span>
                </Button>
              )}
            </div>

            <div className="grid gap-3.5">
              {classroom.assignments.map((asg) => (
                <Card key={asg.id} className="border-border/60 bg-card/85 shadow-sm">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold">
                          {asg.topic}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {asg.maxMarks} Marks
                        </Badge>
                        <span className="text-xs text-muted-foreground">⏱️ ~{asg.estimatedMinutes} min effort</span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground">{asg.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {asg.description}
                      </p>

                      <div className="text-[11px] text-muted-foreground pt-1">
                        Deadline: <strong className="text-foreground">{asg.dueDateTime}</strong>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {asg.status === "submitted" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 font-semibold px-3 py-1 text-xs">
                          ✓ Submitted
                        </Badge>
                      ) : asg.status === "graded" ? (
                        <div className="text-right">
                          <Badge className="bg-emerald-500/15 text-emerald-600 font-semibold text-xs">
                            Graded: {asg.submission?.marksObtained} / {asg.maxMarks}
                          </Badge>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-medium"
                          onClick={() => {
                            setSubmittingAsgId(asg.id);
                            setSubmitModalOpen(true);
                          }}
                        >
                          <span>Submit Assignment</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ================= TAB 4: RESOURCES & NOTES ================= */}
          <TabsContent value="resources" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Learning Resources & Notes</h3>
                <p className="text-xs text-muted-foreground">Distinguishing official teacher handouts from peer-shared study notes.</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => navigate("/notes")}>
                <BookOpen className="h-3.5 w-3.5" />
                <span>Upload Note</span>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classroom.resources.map((res) => {
                const isTeacherRes = res.type === "Teacher Resource";

                return (
                  <Card key={res.id} className="border-border/60 bg-card/85 p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={isTeacherRes ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px]" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]"}>
                          {res.type}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">{res.fileType}</Badge>
                      </div>

                      <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">{res.title}</h4>
                      <p className="text-[11px] text-muted-foreground">By {res.author} • {res.readTime}</p>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-muted-foreground">{res.size}</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1 px-2" onClick={() => toast.info(`Opened ${res.title}`)}>
                        <span>Read</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ================= TAB 5: LECTURES ================= */}
          <TabsContent value="lectures" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Video Lectures ({classroom.code})</h3>
                <p className="text-xs text-muted-foreground">Clickable chapters, synchronized transcripts, sign language stream, and audio summary.</p>
              </div>
            </div>

            <Card className="border-border/60 bg-card/85 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground text-[10px]">Lecture 14</Badge>
                    <Badge variant="outline" className="text-[10px]">45 Minutes</Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">🤟 Sign Language Supported</Badge>
                  </div>
                  <h4 className="text-base font-bold text-foreground">
                    Relational Schema Decomposition: 1NF, 2NF & 3NF
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    Covers full vs partial functional dependencies, candidate keys, and lossless join decomposition.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <span className="font-semibold text-foreground">Key Timestamps:</span>
                    <button type="button" className="text-primary hover:underline font-mono" onClick={() => navigate("/lectures/lec-dbms-norm?t=755")}>12:35 (1NF)</button>
                    <span>•</span>
                    <button type="button" className="text-red-500 hover:underline font-mono font-bold" onClick={() => navigate("/lectures/lec-dbms-norm?t=1182")}>19:42 (2NF Gap)</button>
                    <span>•</span>
                    <button type="button" className="text-primary hover:underline font-mono" onClick={() => navigate("/lectures/lec-dbms-norm?t=1638")}>27:18 (3NF)</button>
                  </div>
                </div>

                <Button className="gap-2 bg-primary text-primary-foreground font-medium shrink-0" onClick={() => navigate("/lectures/lec-dbms-norm")}>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Open Accessible Lecture</span>
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ================= TAB 6: QUIZZES ================= */}
          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Classroom Quizzes & Diagnostic Checkpoints</h3>
                <p className="text-xs text-muted-foreground">Every question updates concept mastery in your continuous learning profile.</p>
              </div>
            </div>

            {loadingQuizzes ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : classroomQuizzes.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <FileCheck2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <h4 className="text-sm font-semibold">No Quizzes Published Yet</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  When faculty publish quizzes for this classroom cohort, they will appear here.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {classroomQuizzes.map((q) => (
                  <Card key={q.id} className="border-border/60 bg-card/85 p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold">
                          {q.subject || "Quiz"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {q.difficulty || "Medium"}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-foreground">{q.title}</h4>
                      <p className="text-xs text-muted-foreground">Topic: {q.topic}</p>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t border-border/40">
                      <span className="text-xs text-muted-foreground font-mono">
                        ~{q.duration_minutes || 15} mins • Max {q.max_attempts || 1} att.
                      </span>
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1 bg-primary text-primary-foreground font-medium"
                        onClick={() => navigate(`/student/quizzes/${q.id}`)}
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        <span>Take Quiz</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ================= TAB 7: ATTENDANCE ================= */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Classroom Attendance</h3>
                <p className="text-xs text-muted-foreground">Attendance is treated as a learning signal connecting to recovery packages.</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                Your DBMS Attendance: {synapse.overallAttendance}%
              </Badge>
            </div>

            {/* Missed Class Recovery Alert if Pending */}
            {synapse.missedClass.status !== "completed" && (
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-background to-orange-500/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-amber-950 font-bold text-[10px]">MISSED CLASS ALERT</Badge>
                  <span className="text-xs text-muted-foreground">{synapse.missedClass.date}</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  You missed Lecture 14: {synapse.missedClass.topic}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Concepts covered: {synapse.missedClass.missedConcepts.join(", ")}. A 30-minute recovery package is ready for you.
                </p>
                <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold" onClick={() => navigate("/attendance-recovery")}>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start 30-Min Recovery Package</span>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ================= TAB 8: CLASS INSIGHTS (TEACHER) ================= */}
          <TabsContent value="insights" className="space-y-5">
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block">Class-Wide Topic Difficulty Heatmap</span>
                <span className="text-xs text-muted-foreground">Aggregated across all 62 students in section {classroom.section}.</span>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs border-purple-500/40 text-purple-600" onClick={() => navigate("/faculty")}>
                Full Faculty Dashboard
              </Button>
            </div>

            {/* Topic Heatmap */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-border/60 bg-card/80 p-4">
                <span className="text-xs font-semibold text-foreground block">SQL & Joins</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">84%</span>
                <span className="text-[11px] text-muted-foreground block">Mastered by 52/62 students</span>
                <Progress value={84} className="mt-2 h-1.5" />
              </Card>

              <Card className="border-border/60 bg-card/80 p-4">
                <span className="text-xs font-semibold text-foreground block">Transaction Concurrency</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">76%</span>
                <span className="text-[11px] text-muted-foreground block">Mastered by 44/62 students</span>
                <Progress value={76} className="mt-2 h-1.5" />
              </Card>

              <Card className="border-red-500/40 bg-red-500/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">Normalization</span>
                  <Badge variant="destructive" className="text-[10px]">Struggle Point</Badge>
                </div>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 block">53%</span>
                <span className="text-[11px] text-muted-foreground block">Only 21/62 students mastered 2NF/3NF</span>
                <Progress value={53} className="mt-2 h-1.5 bg-red-500/20" />
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* CREATE OFFICIAL ASSIGNMENT MODAL (TEACHER) */}
      <Dialog open={asgModalOpen} onOpenChange={setAsgModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateAssignment}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Create Official Classroom Assignment</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official assignments automatically synchronize into student Tasks and feed into their personalized workload roadmap.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Assignment Title *</Label>
                <Input
                  value={newAsgTitle}
                  onChange={(e) => setNewAsgTitle(e.target.value)}
                  placeholder="e.g. DBMS Assignment 4: Transaction Concurrency"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Related Topic / Concept *</Label>
                  <Input
                    value={newAsgTopic}
                    onChange={(e) => setNewAsgTopic(e.target.value)}
                    placeholder="e.g. Normalization or Transactions"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Maximum Marks</Label>
                  <Input
                    type="number"
                    value={newAsgMarks}
                    onChange={(e) => setNewAsgMarks(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    value={newAsgDueDate}
                    onChange={(e) => setNewAsgDueDate(e.target.value)}
                    placeholder="e.g. Tomorrow or Next Friday"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Exact Due Date/Time</Label>
                  <Input
                    value={newAsgDueTime}
                    onChange={(e) => setNewAsgDueTime(e.target.value)}
                    placeholder="e.g. Monday, 11:59 PM"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assignment Instructions</Label>
                <Textarea
                  value={newAsgDesc}
                  onChange={(e) => setNewAsgDesc(e.target.value)}
                  placeholder="Provide problem statement, guidelines, or submission formats..."
                  className="text-xs min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setAsgModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-medium">
                Create & Synchronize Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SUBMIT ASSIGNMENT MODAL (STUDENT) */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitAssignment}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Submit Assignment</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Submitting will update your assignment record and mark the synchronized task completed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs">Submission Summary or Notes</Label>
                <Textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Explain your approach, attach query scripts, or write comments for your instructor..."
                  className="text-xs min-h-[90px]"
                  required
                />
              </div>
              <div className="rounded-lg border border-dashed border-border/80 p-4 text-center cursor-pointer hover:bg-muted/30 transition">
                <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <span className="text-xs text-foreground font-medium block">Drag & Drop Solution File (PDF, ZIP, SQL)</span>
                <span className="text-[10px] text-muted-foreground block">or click to browse local files</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setSubmitModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-medium">
                Submit for Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
