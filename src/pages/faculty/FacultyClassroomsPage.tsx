import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Users,
  ClipboardList,
  ArrowRight,
  School,
  FileCheck2,
  CalendarCheck,
  Loader2,
  GraduationCap,
  Search,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AssignedClassroom {
  assignment_id: string;
  subject_name: string;
  subject_code: string | null;
  classroom_id: string;
  classroom_name: string;
  course: string;
  branch: string;
  year: number;
  section: string;
  academic_year: string;
  faculty_name: string;
  student_count: number;
  assignment_count: number;
  quiz_count: number;
}

export default function FacultyClassroomsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [classrooms, setClassrooms] = useState<AssignedClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const facultyName = profile?.name || "Faculty Member";

  const fetchAssignedClassrooms = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Query authorized teaching assignments for this faculty
      const { data: assignmentsData, error: assignErr } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          classroom_id,
          classroom:classrooms!teaching_assignments_classroom_id_fkey (
            id,
            name,
            course,
            branch,
            year,
            section,
            academic_year
          )
        `)
        .eq("faculty_id", user.id)
        .order("created_at", { ascending: false });

      if (assignErr) throw assignErr;

      const rawAssignments = (assignmentsData as any[]) || [];
      const classroomIds = [
        ...new Set(rawAssignments.map((a) => a.classroom_id).filter(Boolean)),
      ];

      // 2. Concurrently fetch student enrollment count from classroom_members
      let studentCounts: Record<string, number> = {};
      let assignmentCounts: Record<string, number> = {};
      let quizCounts: Record<string, number> = {};

      if (classroomIds.length > 0) {
        const [membersRes, asgRes, qzRes] = await Promise.all([
          supabase
            .from("classroom_members")
            .select("classroom_id")
            .in("classroom_id", classroomIds),
          supabase
            .from("assignments")
            .select("classroom_id")
            .in("classroom_id", classroomIds),
          supabase
            .from("quizzes")
            .select("classroom_id")
            .in("classroom_id", classroomIds),
        ]);

        (membersRes.data || []).forEach((m: any) => {
          studentCounts[m.classroom_id] = (studentCounts[m.classroom_id] || 0) + 1;
        });

        (asgRes.data || []).forEach((a: any) => {
          if (a.classroom_id) {
            assignmentCounts[a.classroom_id] = (assignmentCounts[a.classroom_id] || 0) + 1;
          }
        });

        (qzRes.data || []).forEach((q: any) => {
          if (q.classroom_id) {
            quizCounts[q.classroom_id] = (quizCounts[q.classroom_id] || 0) + 1;
          }
        });
      }

      // 3. Format assigned classrooms
      const formatted: AssignedClassroom[] = rawAssignments
        .filter((a) => a.classroom)
        .map((a) => ({
          assignment_id: a.id,
          subject_name: a.subject_name || "Assigned Subject",
          subject_code: a.subject_code || null,
          classroom_id: a.classroom.id,
          classroom_name: a.classroom.name || "Classroom",
          course: a.classroom.course || "B.Tech",
          branch: a.classroom.branch || "CSE",
          year: a.classroom.year || 1,
          section: a.classroom.section || "A",
          academic_year: a.classroom.academic_year || "2026-27",
          faculty_name: facultyName,
          student_count: studentCounts[a.classroom.id] || 0,
          assignment_count: assignmentCounts[a.classroom.id] || 0,
          quiz_count: quizCounts[a.classroom.id] || 0,
        }));

      setClassrooms(formatted);
    } catch (err: any) {
      console.error("Failed to load assigned classrooms:", err);
      setError("Unable to load your classrooms. Please try again.");
      toast.error("Failed to load classrooms: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedClassrooms();
  }, [user?.id]);

  const filteredClassrooms = classrooms.filter((cls) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cls.subject_name.toLowerCase().includes(q) ||
      (cls.subject_code && cls.subject_code.toLowerCase().includes(q)) ||
      cls.classroom_name.toLowerCase().includes(q) ||
      cls.branch.toLowerCase().includes(q) ||
      cls.section.toLowerCase().includes(q)
    );
  });

  return (
    <FacultyLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              My Classrooms
            </h1>
          </div>

          {/* Search Filter when multiple classrooms exist */}
          {classrooms.length > 1 && (
            <div className="w-full sm:w-72 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or section..."
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>
          )}
        </div>

        {/* CONTENT STATES */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-muted/20 rounded-2xl border border-dashed text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-foreground">Loading your classrooms...</p>
            <p className="text-xs text-muted-foreground">Retrieving authorized teaching assignments and rosters</p>
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <h3 className="text-base font-bold text-foreground">{error}</h3>
              <Button
                onClick={fetchAssignedClassrooms}
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          </Card>
        ) : classrooms.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center bg-muted/20">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <School className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">No classrooms assigned yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Your administrator will assign classrooms to you. Once assigned, your classrooms, students, and curriculum will appear here automatically.
                </p>
              </div>
            </div>
          </Card>
        ) : filteredClassrooms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-2xl bg-muted/10">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold text-foreground">No matching classrooms found</p>
            <p className="text-xs mt-1 text-muted-foreground">Try adjusting your search keywords.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredClassrooms.map((cls) => (
              <Card
                key={cls.assignment_id}
                className="shadow-card border border-border/80 hover:border-indigo-500/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {cls.subject_code && (
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs font-mono font-semibold">
                            {cls.subject_code}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs font-medium">
                          {cls.branch}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Year {cls.year} • Sec {cls.section}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                        {cls.subject_name} · {cls.classroom_name}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1.5 text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                        <span>Faculty: <strong className="text-foreground">{cls.faculty_name}</strong></span>
                      </CardDescription>
                    </div>
                    <Badge className="bg-indigo-600 text-white text-[10px] uppercase font-bold shrink-0">
                      Instructor
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Cohort Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/70 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Students</div>
                      <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                        {cls.student_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Assignments</div>
                      <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {cls.assignment_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Quizzes</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {cls.quiz_count}
                      </div>
                    </div>
                  </div>

                  {/* Feature Shortcuts */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <Link
                      to={`/faculty/teaching/${cls.assignment_id}`}
                      className="p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/60 text-center space-y-1 transition-colors"
                      title="View Student Roster"
                    >
                      <Users className="h-4 w-4 mx-auto text-indigo-600" />
                      <span className="font-semibold block text-[11px]">Students</span>
                    </Link>

                    <Link
                      to="/faculty/assignments"
                      className="p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/60 text-center space-y-1 transition-colors"
                      title="Manage Assignments"
                    >
                      <ClipboardList className="h-4 w-4 mx-auto text-amber-600" />
                      <span className="font-semibold block text-[11px]">Tasks</span>
                    </Link>

                    <Link
                      to="/faculty/quizzes"
                      className="p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/60 text-center space-y-1 transition-colors"
                      title="Quizzes & Assessments"
                    >
                      <FileCheck2 className="h-4 w-4 mx-auto text-emerald-600" />
                      <span className="font-semibold block text-[11px]">Quizzes</span>
                    </Link>

                    <Link
                      to="/faculty/attendance"
                      className="p-2 rounded-lg border border-border/70 bg-card hover:bg-muted/60 text-center space-y-1 transition-colors"
                      title="Record Classroom Attendance"
                    >
                      <CalendarCheck className="h-4 w-4 mx-auto text-purple-600" />
                      <span className="font-semibold block text-[11px]">Attendance</span>
                    </Link>
                  </div>

                  {/* Primary Action Button: Open Classroom */}
                  <div className="pt-3 border-t border-border/70 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Academic Year: {cls.academic_year}
                    </span>
                    <Button
                      onClick={() => navigate(`/faculty/teaching/${cls.assignment_id}`)}
                      size="sm"
                      className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm shadow-indigo-600/20"
                    >
                      <span>Open Classroom</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FacultyLayout>
  );
}
