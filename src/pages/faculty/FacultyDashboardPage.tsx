import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileCheck2,
  Sparkles,
  Send,
  Plus,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapse } from "@/hooks/useSynapse";
import { DEMO_FACULTY_STUDENTS, DEMO_FACULTY_ASSIGNMENTS } from "@/data/facultyDemoData";
import { toast } from "sonner";

export default function FacultyDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const synapse = useSynapse();

  const [announcementText, setAnnouncementText] = useState("");
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const instructorName = profile?.name || "Dr. Aris Thorne";

  const handlePostAnnouncement = () => {
    if (!announcementText.trim()) return;
    toast.success("Announcement broadcasted! Synapse AI has synchronized action items to student calendars.");
    setAnnounceOpen(false);
    setAnnouncementText("");
  };

  const handleGenerateRevisionQuiz = () => {
    setGeneratingQuiz(true);
    setTimeout(() => {
      setGeneratingQuiz(false);
      toast.success("AI generated a 3-question targeted 2NF Checkpoint Quiz and scheduled it for DBMS - CSE 3A!");
      navigate("/faculty/quizzes");
    }, 1200);
  };

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-xs">
                Instructor Administration
              </Badge>
              <span className="text-xs text-muted-foreground">• Academic Year 2026-27</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
              Good morning, {instructorName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Department of Computer Science & Engineering • 2 active cohorts under instruction
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Dialog open={announceOpen} onOpenChange={setAnnounceOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                  <Send className="h-4 w-4 text-indigo-600" />
                  Post Announcement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Post Course Announcement</DialogTitle>
                  <DialogDescription>
                    Broadcasting to DBMS - CSE 3A. Synapse NLP will automatically parse deadlines and create official student tasks.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="e.g. Please submit Assignment 3 by Monday at 11:59 PM. Diagnostic quiz on 2NF scheduled for Friday."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handlePostAnnouncement} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Publish & Sync Tasks
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Link to="/faculty/assignments">
              <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25">
                <Plus className="h-4 w-4" />
                Create Assignment
              </Button>
            </Link>
          </div>
        </div>

        {/* Top 4 Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Classrooms</span>
                <BookOpen className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">2</div>
              <p className="text-xs text-muted-foreground">DBMS - CSE 3A & OS - CSE 3A</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Students</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">120</div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">96% active engagement</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Assignments</span>
                <ClipboardList className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">3</div>
              <p className="text-xs text-muted-foreground">Auto-synced to student task lists</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Grading</span>
                <FileCheck2 className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">14</div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Assignment 3 submissions</p>
            </CardContent>
          </Card>
        </div>

        {/* CLASS OVERVIEW SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">CLASS OVERVIEW</h2>
            <Link to="/faculty/classrooms" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              View All Classrooms <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* DBMS Class Card */}
            <Card className="shadow-card border-indigo-500/20 hover:border-indigo-500/40 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px] mb-1">
                      Code: DBMS3A26
                    </Badge>
                    <CardTitle className="text-lg font-bold">DBMS - CSE 3A</CardTitle>
                    <CardDescription>CS301 • Database Management Systems</CardDescription>
                  </div>
                  <Badge className="bg-indigo-600 text-white text-xs">Lead Faculty</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-muted/40 border">
                  <div>
                    <div className="text-xs text-muted-foreground">Students</div>
                    <div className="text-lg font-bold text-foreground">62</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Performance</div>
                    <div className="text-lg font-bold text-indigo-600">76%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                    <div className="text-lg font-bold text-emerald-600">82%</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Syllabus Coverage: Unit 3 (Normalization & Indexing)</span>
                    <span className="font-semibold text-foreground">68%</span>
                  </div>
                  <Progress value={68} className="h-2 bg-muted" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-muted-foreground">Next lecture: Tomorrow 10:00 AM</span>
                  <Link to="/faculty/classrooms">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700">
                      Open Classroom
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* OS Class Card */}
            <Card className="shadow-card border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20 text-[10px] mb-1">
                      Code: OSCSE3A
                    </Badge>
                    <CardTitle className="text-lg font-bold">OS - CSE 3A</CardTitle>
                    <CardDescription>CS302 • Operating Systems & Virtual Memory</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">Co-Faculty</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-muted/40 border">
                  <div>
                    <div className="text-xs text-muted-foreground">Students</div>
                    <div className="text-lg font-bold text-foreground">58</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Performance</div>
                    <div className="text-lg font-bold text-foreground">71%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Attendance</div>
                    <div className="text-lg font-bold text-emerald-600">79%</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Syllabus Coverage: Unit 2 (Process Synchronization)</span>
                    <span className="font-semibold text-foreground">55%</span>
                  </div>
                  <Progress value={55} className="h-2 bg-muted" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-muted-foreground">Next lab: Thursday 2:00 PM</span>
                  <Link to="/faculty/classrooms">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      Open Classroom
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ACADEMIC INSIGHTS & SUPPORT SIGNALS (Supportive, Non-Alarming Language) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">ACADEMIC INSIGHTS</h2>
              <p className="text-xs text-muted-foreground">
                Constructive support signals based on attendance patterns, submission rates, and diagnostic checkpoints
              </p>
            </div>
            <Link to="/faculty/students">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-indigo-500/30">
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                Manage All 120 Students
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-card border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Additional Support
                  </span>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-foreground">7</div>
                <p className="text-xs text-muted-foreground">
                  7 students may benefit from additional support (e.g. Rahul Kumar, Alex Chen on 2NF)
                </p>
                <Link to="/faculty/students?filter=needs_support" className="inline-block pt-1 text-xs font-semibold text-amber-600 hover:underline">
                  Review support candidates →
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                    Routine Monitoring
                  </span>
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-3xl font-extrabold text-foreground">14</div>
                <p className="text-xs text-muted-foreground">
                  14 students require monitoring based on recent assignment or quiz signals
                </p>
                <Link to="/faculty/students?filter=monitoring" className="inline-block pt-1 text-xs font-semibold text-blue-600 hover:underline">
                  View monitored cohort →
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Progressing Well
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-extrabold text-foreground">41</div>
                <p className="text-xs text-muted-foreground">
                  41 students consistently on track across attendance and quiz mastery
                </p>
                <Link to="/faculty/students?filter=on_track" className="inline-block pt-1 text-xs font-semibold text-emerald-600 hover:underline">
                  View high performers →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* TOPIC MASTERY & AI INSIGHT (Evidence-backed) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Class Topic Difficulty Heatmap */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Class Topic Mastery: DBMS</CardTitle>
                  <CardDescription>Aggregate performance across 62 students</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">Spring Checkpoint</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-foreground">Structured Query Language (SQL)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">84% 🟢</span>
                </div>
                <Progress value={84} className="h-2 bg-emerald-500/20" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-foreground">Transactions & ACID Properties</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">76% 🟢</span>
                </div>
                <Progress value={76} className="h-2 bg-emerald-500/20" />
              </div>

              <div className="space-y-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/5">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Normalization & Decomposition
                  </span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">53% ⚠️</span>
                </div>
                <Progress value={53} className="h-2 bg-rose-500/20" />
                <p className="text-xs text-muted-foreground pt-1">
                  18 students below the configured support threshold (46% struggle on 2NF partial dependencies).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights & Evidence-Backed Recommendation */}
          <Card className="shadow-card border-indigo-500/30 bg-gradient-to-br from-card via-card to-indigo-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Lightbulb className="h-5 w-5" />
                <CardTitle className="text-base font-bold">AI Diagnostic Insight</CardTitle>
              </div>
              <CardDescription>Evidence-based curriculum recommendation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl border bg-card/80 space-y-2">
                <div className="text-sm font-bold text-foreground">
                  "Normalization is currently the lowest-performing topic in DBMS."
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground/80">Observed Evidence:</div>
                  <div>• Average topic performance: 53%</div>
                  <div>• 18 students scored below 50% on Quiz 3</div>
                  <div>• Primary bottleneck: Identifying partial dependencies on composite primary keys (42% accuracy)</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Recommended Action
                </div>
                <p className="text-xs text-foreground">
                  Publish a 3-question targeted 2NF checkpoint quiz and assign a 15-minute Socratic review session.
                </p>
                <Button
                  onClick={handleGenerateRevisionQuiz}
                  disabled={generatingQuiz}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 gap-2 shadow-sm shadow-indigo-600/20"
                >
                  <Sparkles className="h-4 w-4" />
                  {generatingQuiz ? "Generating Quiz with Synapse AI..." : "Generate Revision Quiz"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </FacultyLayout>
  );
}
