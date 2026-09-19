import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapse } from "@/hooks/useSynapse";
import {
  User,
  GraduationCap,
  CalendarCheck,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Video,
  FileCheck2,
  Sparkles,
  Accessibility,
  Edit3,
  Phone,
  Mail,
  Building,
  Check,
  Eye,
  Volume2,
  Captions,
  Mic,
  FileText,
  Sliders,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { toast } from "sonner";

export default function StudentProfile() {
  const { profile, user } = useAuth();
  const synapse = useSynapse();
  const { preferences, updatePreferences } = useAccessibility();

  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);

  // Editable personal info state
  const [phone, setPhone] = useState("+91 98765 43210");
  const [bio, setBio] = useState(profile?.bio || "Computer Science Junior • Database Systems & Applied AI track");

  const rollNumber = profile?.roll_number || "CS22B042";
  const branch = profile?.course_branch || "B.Tech Computer Science & Engineering";
  const yearSection = "3rd Year • CSE 3A";
  const email = profile?.email || "alex.chen@synapse.edu";
  const name = profile?.name || "Alex Chen";

  const handleSaveInfo = () => {
    setEditOpen(false);
    toast.success("Academic identity details updated successfully");
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header: Academic Identity Card */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/30 shadow-md">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
                  AC
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background" title="Enrolled & Active" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{name}</h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
                  Roll No: {rollNumber}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                {branch}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                <span>{yearSection}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Personal Info
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Personal Information</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Academic Bio</Label>
                    <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roll">Roll Number (Institutional)</Label>
                    <Input id="roll" value={rollNumber} disabled className="bg-muted text-muted-foreground" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveInfo}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Tabs Layout: Overview, Attendance, Performance, Learning, Personal Info, Preferences */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-2xl flex flex-wrap h-auto gap-1 border">
          <TabsTrigger value="overview" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Attendance (82%)
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Academic Performance
          </TabsTrigger>
          <TabsTrigger value="learning" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Learning & Concepts
          </TabsTrigger>
          <TabsTrigger value="personal" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Personal Information
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl px-4 py-2 text-xs font-semibold">
            Preferences & Accessibility
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Overall Attendance</span>
                  <CalendarCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">82%</span>
                  <span className="text-xs text-muted-foreground">Target: 75%</span>
                </div>
                <Progress value={82} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Academic Performance</span>
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">76%</span>
                  <span className="text-xs text-emerald-500 font-medium">↑ +4% this month</span>
                </div>
                <Progress value={76} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Assignments</span>
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">8 / 11</span>
                  <span className="text-xs text-amber-500 font-medium">2 pending, 1 overdue</span>
                </div>
                <Progress value={(8 / 11) * 100} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium uppercase tracking-wider">Quiz Average</span>
                  <FileCheck2 className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">74%</span>
                  <span className="text-xs text-muted-foreground">4 Checkpoints</span>
                </div>
                <Progress value={74} className="h-1.5 bg-muted" />
              </CardContent>
            </Card>
          </div>

          {/* Core Focus Split: Strengths vs Needs Practice */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card border-emerald-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Strong Topics
                  </CardTitle>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                    Mastered
                  </Badge>
                </div>
                <CardDescription>Topics where you demonstrated high confidence and retention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-foreground">Structured Query Language (SQL)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">91%</span>
                  </div>
                  <Progress value={91} className="h-2 bg-emerald-500/20" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-foreground">Transaction ACID Properties</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">83%</span>
                  </div>
                  <Progress value={83} className="h-2 bg-emerald-500/20" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-foreground">First Normal Form (1NF)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">92%</span>
                  </div>
                  <Progress value={92} className="h-2 bg-emerald-500/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-rose-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                    Topics Needing Practice
                  </CardTitle>
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs">
                    Support Recommended
                  </Badge>
                </div>
                <CardDescription>Priority concepts flagged for targeted revision and practice quizzes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-foreground">Second Normal Form (2NF - Partial Dependencies)</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">46%</span>
                  </div>
                  <Progress value={46} className="h-2 bg-rose-500/20" />
                  <p className="text-xs text-muted-foreground">Struggled with composite primary keys in Quiz 3.</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-foreground">Third Normal Form (3NF - Transitive Dependencies)</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">51%</span>
                  </div>
                  <Progress value={51} className="h-2 bg-rose-500/20" />
                  <p className="text-xs text-muted-foreground">Non-prime attribute dependencies require review.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Attendance Analytics & Course Breakdown</CardTitle>
                  <CardDescription>Minimum institutional attendance requirement: 75%</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">82%</div>
                  <div className="text-xs text-muted-foreground">Overall Record</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span>CS301: Database Management Systems (DBMS)</span>
                    <span className="text-emerald-600 font-bold">82% (18 / 22 classes)</span>
                  </div>
                  <Progress value={82} className="h-2 bg-muted" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Status: Missed Lecture 14 (Recovery Module Available)</span>
                    <span className="font-medium text-emerald-500">Above Threshold</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span>CS302: Operating Systems (OS)</span>
                    <span className="text-emerald-600 font-bold">91% (20 / 22 classes)</span>
                  </div>
                  <Progress value={91} className="h-2 bg-muted" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Status: Full engagement</span>
                    <span className="font-medium text-emerald-500">Exemplary</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span>CS303: Computer Networks (CN)</span>
                    <span className="text-emerald-600 font-bold">88% (21 / 24 classes)</span>
                  </div>
                  <Progress value={88} className="h-2 bg-muted" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Status: Consistent attendance</span>
                    <span className="font-medium text-emerald-500">Above Threshold</span>
                  </div>
                </div>
              </div>

              {/* Attendance Trend */}
              <div className="p-4 rounded-2xl border bg-muted/30 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Attendance Trend</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-card border">
                    <div className="font-bold text-foreground">Week 1-2</div>
                    <div className="text-emerald-600 font-semibold">92%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-card border">
                    <div className="font-bold text-foreground">Week 3-4</div>
                    <div className="text-emerald-600 font-semibold">89%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-card border">
                    <div className="font-bold text-foreground">Week 5-6</div>
                    <div className="text-amber-500 font-semibold">78% (Flu)</div>
                  </div>
                  <div className="p-2 rounded-xl bg-card border border-primary/40 bg-primary/5">
                    <div className="font-bold text-foreground">Current</div>
                    <div className="text-emerald-600 font-bold">82% (Recovering)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACADEMIC PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Subject-Wise Performance & Exam Readiness</CardTitle>
              <CardDescription>Consolidated grades from internal assessments, lab work, and quizzes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">DBMS (CS301)</div>
                  <div className="text-2xl font-bold text-foreground">74%</div>
                  <Progress value={74} className="h-1.5 bg-muted" />
                  <p className="text-[11px] text-muted-foreground">Weight: 4 Credits • Dr. Rao</p>
                </div>
                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Operating Systems (CS302)</div>
                  <div className="text-2xl font-bold text-foreground">81%</div>
                  <Progress value={81} className="h-1.5 bg-muted" />
                  <p className="text-[11px] text-muted-foreground">Weight: 4 Credits • Prof. Kumar</p>
                </div>
                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Computer Networks (CS303)</div>
                  <div className="text-2xl font-bold text-foreground">88%</div>
                  <Progress value={88} className="h-1.5 bg-muted" />
                  <p className="text-[11px] text-muted-foreground">Weight: 3 Credits • Dr. Sharma</p>
                </div>
              </div>

              {/* Quiz Performance Trend */}
              <div className="p-4 rounded-2xl border bg-card/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">Recent Quiz Diagnostic Scores</h4>
                  <Badge variant="outline" className="text-xs">Average: 74%</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl border bg-card">
                    <div className="text-muted-foreground">Quiz 1 (ER Models)</div>
                    <div className="text-base font-bold text-emerald-600">81%</div>
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <div className="text-muted-foreground">Quiz 2 (Relational Alg)</div>
                    <div className="text-base font-bold text-emerald-600">78%</div>
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <div className="text-muted-foreground">Quiz 3 (Normalization)</div>
                    <div className="text-base font-bold text-rose-500">61%</div>
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <div className="text-muted-foreground">Quiz 4 (SQL DDL/DML)</div>
                    <div className="text-base font-bold text-emerald-600">76%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEARNING & CONCEPTS TAB */}
        <TabsContent value="learning" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Lecture & Learning Engagement</CardTitle>
              <CardDescription>Multimodal study progress across video lectures, transcripts, and reading notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Video Lecture Completion</span>
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-3xl font-bold">78%</div>
                  <Progress value={78} className="h-2 bg-muted" />
                  <p className="text-xs text-muted-foreground">14 of 18 chapters completed with synchronized transcript</p>
                </div>

                <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Learning Modules Mastered</span>
                    <BookOpen className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-3xl font-bold">84%</div>
                  <Progress value={84} className="h-2 bg-muted" />
                  <p className="text-xs text-muted-foreground">Completed study packets for 21 core academic topics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERSONAL INFORMATION TAB */}
        <TabsContent value="personal" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Institutional & Personal Profile</CardTitle>
              <CardDescription>Verified academic credentials and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Full Name</div>
                  <div className="font-semibold text-foreground">{name}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Institutional Email</div>
                  <div className="font-semibold text-foreground">{email}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Roll Number</div>
                  <div className="font-semibold text-foreground">{rollNumber}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Program & Department</div>
                  <div className="font-semibold text-foreground">{branch}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Academic Year & Section</div>
                  <div className="font-semibold text-foreground">{yearSection}</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Phone Number</div>
                  <div className="font-semibold text-foreground">{phone}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PREFERENCES & ACCESSIBILITY TAB */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Assistive Navigation & Voice */}
            <Card className="shadow-card border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Voice & Assistive Features
                </CardTitle>
                <CardDescription>
                  Hands-free voice control, narration, and lecture text alternatives
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voice Assistance Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Mic className="h-4 w-4 text-primary" />
                      <span>Voice Assistance (Alt + V)</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Hands-free spoken commands for navigation, attendance queries, and quiz interaction.
                    </div>
                  </div>
                  <Switch
                    checked={preferences.voice_assistance_enabled}
                    onCheckedChange={(checked) =>
                      updatePreferences({ voice_assistance_enabled: checked })
                    }
                    aria-label="Toggle voice assistance"
                  />
                </div>

                {/* On-Demand Transcripts Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      <span>On-Demand Lecture Transcripts</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generate timestamped transcripts, summaries, and key concepts for faculty lectures.
                    </div>
                  </div>
                  <Switch
                    checked={preferences.transcript_assistance_enabled}
                    onCheckedChange={(checked) =>
                      updatePreferences({ transcript_assistance_enabled: checked })
                    }
                    aria-label="Toggle on-demand lecture transcripts"
                  />
                </div>

                {/* Text-to-Speech Narration */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-accent" />
                      <span>Text-to-Speech (TTS) Read Aloud</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Enable spoken audio narration for quiz questions and academic summaries.
                    </div>
                  </div>
                  <Switch
                    checked={preferences.text_to_speech_enabled}
                    onCheckedChange={(checked) =>
                      updatePreferences({ text_to_speech_enabled: checked })
                    }
                    aria-label="Toggle text to speech narration"
                  />
                </div>

                {/* Speech Rate Controls */}
                <div className="p-3.5 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-muted-foreground" />
                      <span>Speech Narration Speed</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {preferences.speech_rate || 1.0}x
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                      <Button
                        key={rate}
                        type="button"
                        size="sm"
                        variant={preferences.speech_rate === rate ? "default" : "outline"}
                        className="flex-1 text-xs h-7"
                        onClick={() => updatePreferences({ speech_rate: rate })}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual & Motion Accommodations */}
            <Card className="shadow-card border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Accessibility className="h-5 w-5 text-primary" />
                  Visual & Display Accommodations
                </CardTitle>
                <CardDescription>
                  Contrast, typography sizing, and motion sensitivity preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* High Contrast Mode */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4 text-emerald-500" />
                      <span>High Contrast Mode</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Boost border definitions and contrast for improved readability.
                    </div>
                  </div>
                  <Switch
                    checked={preferences.high_contrast}
                    onCheckedChange={(checked) =>
                      updatePreferences({ high_contrast: checked })
                    }
                    aria-label="Toggle high contrast mode"
                  />
                </div>

                {/* Text Sizing */}
                <div className="p-3.5 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Base Text Sizing</div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {preferences.text_size || "normal"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {(["normal", "large", "extra-large"] as const).map((size) => (
                      <Button
                        key={size}
                        type="button"
                        size="sm"
                        variant={preferences.text_size === size ? "default" : "outline"}
                        className="flex-1 text-xs h-7 capitalize"
                        onClick={() => updatePreferences({ text_size: size })}
                      >
                        {size === "normal" ? "Standard" : size === "large" ? "Large" : "Extra Large"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="text-sm font-semibold">Reduced Motion</div>
                    <div className="text-xs text-muted-foreground">
                      Minimize screen animations, slides, and background effects.
                    </div>
                  </div>
                  <Switch
                    checked={preferences.reduced_motion}
                    onCheckedChange={(checked) =>
                      updatePreferences({ reduced_motion: checked })
                    }
                    aria-label="Toggle reduced motion"
                  />
                </div>

                {/* Synchronized Captions Preference */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Captions className="h-4 w-4 text-primary" />
                      <span>Prefer Closed Captions (CC)</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Default video players to display subtitles and caption tracks.
                    </div>
                  </div>
                  <Switch
                    checked={preferences.captions_enabled}
                    onCheckedChange={(checked) =>
                      updatePreferences({ captions_enabled: checked })
                    }
                    aria-label="Toggle closed captions"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
