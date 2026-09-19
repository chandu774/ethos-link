import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
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
  School,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassroomInfo {
  id: string;
  name: string;
  course: string;
  branch: string;
  year: number;
  section: string;
  academic_year: string;
}

interface SubjectAssignment {
  id: string;
  subject_name: string;
  subject_code: string | null;
  faculty_id: string;
  faculty?: {
    name: string;
    email: string;
  };
}

export default function ClassroomsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [subjects, setSubjects] = useState<SubjectAssignment[]>([]);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [classroomAssignments, setClassroomAssignments] = useState<any[]>([]);
  const [classroomQuizzes, setClassroomQuizzes] = useState<any[]>([]);

  const fetchStudentClassroomData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch student's classroom membership
      const { data: memberData, error: memberErr } = await supabase
        .from("classroom_members")
        .select(`
          id,
          classroom_id,
          classroom:classrooms!classroom_members_classroom_id_fkey(
            id,
            name,
            course,
            branch,
            year,
            section,
            academic_year
          )
        `)
        .eq("student_id", user.id)
        .maybeSingle();

      if (memberErr) throw memberErr;

      if (!memberData?.classroom) {
        setClassroom(null);
        setLoading(false);
        return;
      }

      const cls = memberData.classroom as any;
      setClassroom(cls);

      // 2. Fetch teaching assignments (Subjects + Faculty) for this classroom
      const { data: teachingData, error: tErr } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          faculty_id,
          faculty:profiles!teaching_assignments_faculty_id_fkey(
            name,
            email
          )
        `)
        .eq("classroom_id", cls.id);

      if (!tErr && teachingData) {
        setSubjects(teachingData as any[]);
      }

      // 3. Fetch classmates in this classroom
      const { data: matesData } = await supabase
        .from("classroom_members")
        .select(`
          id,
          student:profiles!classroom_members_student_id_fkey(
            id,
            name,
            roll_number,
            email
          )
        `)
        .eq("classroom_id", cls.id);

      if (matesData) {
        setClassmates(matesData.map((m: any) => m.student).filter(Boolean));
      }

      // 4. Fetch assignments for this classroom
      const { data: asgsData } = await supabase
        .from("assignments")
        .select("*")
        .eq("classroom_id", cls.id)
        .order("deadline", { ascending: true });

      if (asgsData) {
        setClassroomAssignments(asgsData);
      }

      // 5. Fetch quizzes for this classroom
      const { data: qzsData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("classroom_id", cls.id)
        .order("created_at", { ascending: false });

      if (qzsData) {
        setClassroomQuizzes(qzsData);
      }
    } catch (err: any) {
      console.error("Failed to load student classroom data:", err);
      toast.error("Failed to load classroom information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentClassroomData();
  }, [user]);

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-2 border-b pb-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Institutional Classroom Cohort
            </Badge>
            <span className="text-xs text-muted-foreground">• Auto-Enrolled</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {classroom ? classroom.name : "My Classroom"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {classroom
              ? `${classroom.course} in ${classroom.branch} • Year ${classroom.year}, Section ${classroom.section} • Academic Year ${classroom.academic_year}`
              : "Your officially assigned academic cohort and synchronized coursework."}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20 bg-muted/20 rounded-2xl border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : !classroom ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <School className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-bold text-foreground">No Classroom Assigned</h3>
                <p className="text-sm text-muted-foreground">
                  You have not been assigned to a classroom cohort yet.
                  Your institutional administrator assigns students directly to their classes during enrollment.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="shadow-card border-slate-200 dark:border-slate-800">
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Subjects</span>
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-3xl font-extrabold text-foreground">{subjects.length}</div>
                  <p className="text-xs text-muted-foreground">With assigned faculty members</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-slate-200 dark:border-slate-800">
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Classmates</span>
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-3xl font-extrabold text-foreground">{classmates.length}</div>
                  <p className="text-xs text-muted-foreground">Peers in {classroom.name}</p>
                </CardContent>
              </Card>

              <Card className="shadow-card border-slate-200 dark:border-slate-800">
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wider">Coursework & Quizzes</span>
                    <ClipboardList className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-3xl font-extrabold text-foreground">
                    {classroomAssignments.length + classroomQuizzes.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Published by your teachers</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs: Subjects, Assignments, Classmates */}
            <Tabs defaultValue="subjects" className="space-y-4">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="subjects" className="text-xs gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Subjects & Faculty ({subjects.length})</span>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="text-xs gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>Assignments ({classroomAssignments.length})</span>
                </TabsTrigger>
                <TabsTrigger value="quizzes" className="text-xs gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  <span>Quizzes ({classroomQuizzes.length})</span>
                </TabsTrigger>
                <TabsTrigger value="classmates" className="text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>Classmates ({classmates.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Subjects & Faculty Tab */}
              <TabsContent value="subjects" className="space-y-4">
                {subjects.length === 0 ? (
                  <Card className="border-dashed p-8 text-center bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                      No teaching assignments have been configured for this classroom yet.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {subjects.map((sub) => (
                      <Card key={sub.id} className="shadow-card border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge className="bg-indigo-600 text-white text-[10px] mb-1">
                                {sub.subject_code || "SUB"}
                              </Badge>
                              <CardTitle className="text-base font-bold text-foreground">
                                {sub.subject_name}
                              </CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                            <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                              Instructor
                            </span>
                            <div className="font-semibold text-sm text-foreground">
                              {sub.faculty?.name || "Assigned Faculty"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sub.faculty?.email || "—"}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="space-y-4">
                {classroomAssignments.length === 0 ? (
                  <Card className="border-dashed p-8 text-center bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                      No assignments posted for your classroom cohort yet.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {classroomAssignments.map((asg) => (
                      <Card key={asg.id} className="shadow-card border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-500/30">
                                  {asg.subject || "Coursework"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Due: {new Date(asg.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <CardTitle className="text-base font-bold mt-1">{asg.title}</CardTitle>
                              {asg.description && (
                                <CardDescription className="text-xs mt-0.5">{asg.description}</CardDescription>
                              )}
                            </div>
                            <Link to="/student/assignments">
                              <Button size="sm" variant="outline" className="text-xs">
                                View Assignment
                              </Button>
                            </Link>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Quizzes Tab */}
              <TabsContent value="quizzes" className="space-y-4">
                {classroomQuizzes.length === 0 ? (
                  <Card className="border-dashed p-8 text-center bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                      No quizzes published for your classroom cohort yet.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {classroomQuizzes.map((quiz) => (
                      <Card key={quiz.id} className="shadow-card border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-500/30">
                                  {quiz.subject || "Quiz"}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Topic: {quiz.topic || "General"}
                                </Badge>
                              </div>
                              <CardTitle className="text-base font-bold mt-1">{quiz.title}</CardTitle>
                            </div>
                            <Link to={`/student/quizzes/${quiz.id}`}>
                              <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                                Take Quiz
                              </Button>
                            </Link>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Classmates Tab */}
              <TabsContent value="classmates" className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {classmates.map((mate) => {
                    const initials = mate.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={mate.id}
                        className="flex items-center gap-3 p-3 rounded-xl border bg-card shadow-sm"
                      >
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback className="text-xs font-bold bg-indigo-500/10 text-indigo-600">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <div className="text-sm font-semibold text-foreground truncate">
                            {mate.name} {mate.id === user?.id && "(You)"}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {mate.roll_number}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
