import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  KeyRound,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Layers,
  FileCheck2,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ClassroomsPage() {
  const navigate = useNavigate();
  const synapse = useSynapse();

  const isTeacher = synapse.currentRole === 'teacher';

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Create Classroom Form State
  const [name, setName] = useState("Distributed Systems");
  const [code, setCode] = useState("CS401");
  const [section, setSection] = useState("CSE 4A");
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [description, setDescription] = useState("Consensus algorithms, Raft, Paxos, vector clocks, and fault-tolerant microservice coordination.");
  const [customClassCode, setCustomClassCode] = useState("DS4A26");

  // Join Classroom Form State
  const [joinCodeInput, setJoinCodeInput] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Please fill in classroom name and subject code.");
      return;
    }

    const newClassroom = synapse.createClassroom(
      name,
      code,
      section,
      academicYear,
      description,
      customClassCode
    );

    toast.success(`Classroom "${newClassroom.name}" created with code: ${newClassroom.classCode}`);
    setCreateModalOpen(false);
    navigate(`/classrooms/${newClassroom.id}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      toast.error("Please enter a class code.");
      return;
    }

    const res = synapse.joinClassroom(joinCodeInput);
    if (res.success && res.classroom) {
      toast.success(res.message);
      setJoinModalOpen(false);
      navigate(`/classrooms/${res.classroom.id}`);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header & Role Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Academic Hub
              </Badge>
              <span className="text-xs text-muted-foreground">• Central Classroom Environments</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Classrooms
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isTeacher
                ? "Manage your teaching classes, post official announcements, track attendance, and analyze topic-level student performance."
                : "Your enrolled college classrooms with synchronized assignments, class feed, lectures, and topic mastery."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Role Toggle for Hackathon Presenter */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-1.5 text-xs font-semibold transition-all",
                isTeacher ? "border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400" : "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400"
              )}
              onClick={() => {
                const nextRole = isTeacher ? 'student' : 'teacher';
                synapse.switchRole(nextRole);
                toast.info(`Switched view to ${nextRole === 'teacher' ? 'Faculty (Dr. Aris Rao)' : 'Student (Alex Chen)'}`);
              }}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Role: {isTeacher ? "Teacher Mode" : "Student Mode"}</span>
            </Button>

            {isTeacher ? (
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-primary text-primary-foreground font-medium shadow-sm"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Create Classroom</span>
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-primary text-primary-foreground font-medium shadow-sm"
                onClick={() => setJoinModalOpen(true)}
              >
                <KeyRound className="h-4 w-4" />
                <span>Join with Code</span>
              </Button>
            )}
          </div>
        </div>

        {/* Info Banner on Classroom Architecture */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-primary shrink-0" />
            <div>
              <span className="font-semibold text-foreground block">
                {isTeacher ? "Teacher Management Controls Active" : "Classroom-Centered Learning Environment"}
              </span>
              <span className="text-muted-foreground">
                {isTeacher
                  ? "Only teachers can create official classroom assignments and deadlines. Assignments automatically synchronize into student Tasks."
                  : "All assignments posted by your professors automatically appear in your personalized Tasks and feed into your daily roadmap."}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="text-[11px] font-mono">
            {synapse.classrooms.length} Active Classrooms
          </Badge>
        </div>

        {/* Classrooms Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {synapse.classrooms.map((cls) => (
            <Card
              key={cls.id}
              className="group relative overflow-hidden border-border/60 bg-card/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md cursor-pointer flex flex-col justify-between"
              onClick={() => navigate(`/classrooms/${cls.id}`)}
            >
              {/* Header Gradient Ribbon */}
              <div className={cn("h-3 w-full bg-gradient-to-r", cls.color)} />

              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="border-primary/30 text-xs font-mono font-semibold text-primary">
                    {cls.code} • {cls.section}
                  </Badge>
                  <Badge className="bg-muted text-muted-foreground hover:bg-muted font-mono text-[11px]">
                    Code: {cls.classCode}
                  </Badge>
                </div>

                <CardTitle className="mt-2 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {cls.name}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                  {cls.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-2 space-y-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span>Instructor: <strong className="text-foreground font-medium">{cls.teacherName}</strong></span>
                </div>

                {/* 3 Metrics Badges */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center text-xs">
                  <div>
                    <span className="block text-[10px] text-muted-foreground">Students</span>
                    <span className="font-bold text-foreground">{cls.studentsCount}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">Assignments</span>
                    <span className="font-bold text-foreground">{cls.assignmentsCount}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground">Avg Mastery</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{cls.averagePerformance}%</span>
                  </div>
                </div>

                {/* Active Assignments Alert if Any */}
                {cls.upcomingCount > 0 && (
                  <div className="flex items-center justify-between text-xs rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-primary font-medium">
                    <span>{cls.upcomingCount} upcoming deadline{cls.upcomingCount > 1 ? 's' : ''}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Semester: {cls.academicYear}</span>
                  <span className="font-semibold text-primary group-hover:underline flex items-center gap-1">
                    Enter Classroom <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CREATE CLASSROOM MODAL (TEACHER) */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Create New Classroom</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up a new college class. Students can join using the generated class code.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Classroom Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject Code *</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. CS401"
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Section</Label>
                  <Input
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. CSE 4A"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Academic Year / Term</Label>
                  <Input
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2026-27"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Class Code (Unique Joining Key)</Label>
                <Input
                  value={customClassCode}
                  onChange={(e) => setCustomClassCode(e.target.value)}
                  placeholder="e.g. DS4A26"
                  className="h-9 text-xs font-mono uppercase"
                />
                <p className="text-[10px] text-muted-foreground">Share this code with your students to let them join with 1 click.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Course Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize course scope, syllabus modules, or prerequisites..."
                  className="text-xs min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-medium">
                Create Classroom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* JOIN CLASSROOM MODAL (STUDENT) */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleJoin}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Join a Classroom</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter the class code provided by your instructor to enroll in the classroom.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Enter Class Code</Label>
                <Input
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DBMS3A26 or OS3A26"
                  className="h-10 text-center font-mono uppercase tracking-widest text-sm font-bold"
                  required
                />
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Sample Demo Codes:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded bg-background px-2 py-0.5 font-mono text-primary border border-border"
                    onClick={() => setJoinCodeInput("DBMS3A26")}
                  >
                    DBMS3A26
                  </button>
                  <button
                    type="button"
                    className="rounded bg-background px-2 py-0.5 font-mono text-primary border border-border"
                    onClick={() => setJoinCodeInput("OS3A26")}
                  >
                    OS3A26
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setJoinModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-medium">
                Join Classroom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
