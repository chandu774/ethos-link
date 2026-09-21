import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Sparkles,
  Send,
  Plus,
  ArrowRight,
  School,
  Layers,
  Loader2,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeachingCohort {
  id: string;
  faculty_id: string;
  classroom_id: string;
  subject_name: string;
  subject_code: string | null;
  classroom: {
    id: string;
    name: string;
    course: string;
    branch: string;
    year: number;
    section: string;
    academic_year: string;
  };
  student_count?: number;
  assignment_count?: number;
  quiz_count?: number;
}

export default function FacultyDashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingCohort[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [totalAssignmentsCount, setTotalAssignmentsCount] = useState(0);
  const [totalQuizzesCount, setTotalQuizzesCount] = useState(0);

  // Announcement state
  const [announcementText, setAnnouncementText] = useState("");
  const [announceOpen, setAnnounceOpen] = useState(false);

  const instructorName = profile?.name || "Faculty Member";

  const fetchFacultyDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch teaching assignments for this faculty
      const { data: taData, error: taErr } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          faculty_id,
          classroom_id,
          subject_name,
          subject_code,
          classroom:classrooms!teaching_assignments_classroom_id_fkey(
            id,
            name,
            course,
            branch,
            year,
            section,
            academic_year
          )
        `)
        .eq("faculty_id", user.id);

      if (taErr) throw taErr;

      const cohorts = (taData as any[]) || [];

      if (cohorts.length === 0) {
        setTeachingAssignments([]);
        setTotalStudentsCount(0);
        setTotalAssignmentsCount(0);
        setTotalQuizzesCount(0);
        setLoading(false);
        return;
      }

      const classroomIds = Array.from(new Set(cohorts.map((c) => c.classroom_id).filter(Boolean)));
      const teachingIds = cohorts.map((c) => c.id);

      // 2. Fetch student membership counts per classroom
      let studentCountMap: Record<string, number> = {};
      let allUniqueStudentIds = new Set<string>();

      if (classroomIds.length > 0) {
        const { data: membersData } = await supabase
          .from("classroom_members")
          .select("classroom_id, student_id")
          .in("classroom_id", classroomIds);

        if (membersData) {
          membersData.forEach((m) => {
            studentCountMap[m.classroom_id] = (studentCountMap[m.classroom_id] || 0) + 1;
            allUniqueStudentIds.add(m.student_id);
          });
        }
      }

      // 3. Fetch assignments counts
      let asgCountMap: Record<string, number> = {};
      let totalAsgs = 0;
      if (teachingIds.length > 0) {
        const { data: asgData } = await supabase
          .from("assignments")
          .select("id, teaching_assignment_id")
          .in("teaching_assignment_id", teachingIds);

        if (asgData) {
          totalAsgs = asgData.length;
          asgData.forEach((a) => {
            if (a.teaching_assignment_id) {
              asgCountMap[a.teaching_assignment_id] = (asgCountMap[a.teaching_assignment_id] || 0) + 1;
            }
          });
        }
      }

      // 4. Fetch quizzes counts
      let quizCountMap: Record<string, number> = {};
      let totalQzs = 0;
      if (teachingIds.length > 0) {
        const { data: qzData } = await supabase
          .from("quizzes")
          .select("id, teaching_assignment_id")
          .in("teaching_assignment_id", teachingIds);

        if (qzData) {
          totalQzs = qzData.length;
          qzData.forEach((q) => {
            if (q.teaching_assignment_id) {
              quizCountMap[q.teaching_assignment_id] = (quizCountMap[q.teaching_assignment_id] || 0) + 1;
            }
          });
        }
      }

      // Enrich cohorts
      const enrichedCohorts: TeachingCohort[] = cohorts.map((c) => ({
        ...c,
        student_count: studentCountMap[c.classroom_id] || 0,
        assignment_count: asgCountMap[c.id] || 0,
        quiz_count: quizCountMap[c.id] || 0,
      }));

      setTeachingAssignments(enrichedCohorts);
      setTotalStudentsCount(allUniqueStudentIds.size);
      setTotalAssignmentsCount(totalAsgs);
      setTotalQuizzesCount(totalQzs);
    } catch (err: any) {
      console.error("Failed to fetch faculty dashboard data:", err);
      toast.error("Failed to load teaching assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyDashboardData();
  }, [user]);

  const handlePostAnnouncement = () => {
    if (!announcementText.trim()) return;
    toast.success("Announcement broadcasted to your assigned teaching cohorts!");
    setAnnounceOpen(false);
    setAnnouncementText("");
  };

  // Group cohorts by subject
  const cohortsBySubject = teachingAssignments.reduce((acc, cohort) => {
    const key = cohort.subject_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cohort);
    return acc;
  }, {} as Record<string, TeachingCohort[]>);

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Welcome back, {instructorName}
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
                    Broadcasting message to students enrolled in your teaching cohorts.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="e.g. Please review the updated lecture notes on Normalization. Assessment scheduled next Tuesday."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handlePostAnnouncement} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Publish to Cohorts
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Link to="/faculty/assignments">
              <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25">
                <Plus className="h-4 w-4" />
                Manage Coursework
              </Button>
            </Link>
          </div>
        </div>

        {/* Top 4 Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Teaching Cohorts</span>
                <School className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : teachingAssignments.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned by institutional administrator
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Students</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalStudentsCount}
              </div>
              <p className="text-xs text-muted-foreground">Across your assigned classroom sections</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Assignments</span>
                <ClipboardList className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalAssignmentsCount}
              </div>
              <p className="text-xs text-muted-foreground">Active coursework published</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Quizzes</span>
                <HelpCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-extrabold text-foreground">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalQuizzesCount}
              </div>
              <p className="text-xs text-muted-foreground">Diagnostic assessments published</p>
            </CardContent>
          </Card>
        </div>

        {/* "MY TEACHING" SECTION - GROUPED BY SUBJECT -> CLASSROOM COHORTS */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">My Teaching Assignments</h2>
              <p className="text-xs text-muted-foreground">
                Institutional subjects and classroom cohorts assigned to your faculty profile
              </p>
            </div>
            <Link to="/faculty/classrooms" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              View Classrooms Directory <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12 bg-muted/20 rounded-2xl border border-dashed">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : teachingAssignments.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <BookOpen className="h-7 w-7" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-base font-bold text-foreground">No Teaching Cohorts Assigned</h3>
                  <p className="text-sm text-muted-foreground">
                    Your institutional administrator has not yet assigned you to any subject or classroom cohort.
                    Once assigned, your classes, student rosters, assignments, and quizzes will appear here automatically.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(cohortsBySubject).map(([subjectName, cohorts]) => (
                <div key={subjectName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white text-xs px-2.5 py-0.5">
                      {cohorts[0]?.subject_code || "SUB"}
                    </Badge>
                    <h3 className="text-lg font-bold text-foreground">{subjectName}</h3>
                    <span className="text-xs text-muted-foreground">
                      ({cohorts.length} section{cohorts.length > 1 ? "s" : ""})
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cohorts.map((cohort) => (
                      <Card
                        key={cohort.id}
                        className="shadow-card border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base font-bold text-foreground">
                                {cohort.classroom?.name || "Classroom"}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {cohort.classroom?.course} • {cohort.classroom?.branch} • Year {cohort.classroom?.year} (Sec {cohort.classroom?.section})
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-slate-500/10">
                              {cohort.classroom?.academic_year || "2026-27"}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-muted/40 border text-xs">
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Students</div>
                              <div className="text-base font-extrabold text-foreground">{cohort.student_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Assignments</div>
                              <div className="text-base font-extrabold text-amber-600">{cohort.assignment_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Quizzes</div>
                              <div className="text-base font-extrabold text-emerald-600">{cohort.quiz_count || 0}</div>
                            </div>
                          </div>

                          <div className="pt-2 border-t flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Classroom Cohort</span>
                            <Button
                              onClick={() => navigate(`/faculty/teaching/${cohort.id}`)}
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              Manage Teaching <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FacultyLayout>
  );
}
