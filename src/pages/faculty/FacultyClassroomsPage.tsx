import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Users,
  ClipboardList,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Award,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ClassroomData {
  id: string;
  title: string;
  code: string;
  department: string;
  semester?: string;
  course?: string;
  branch?: string;
  year?: string;
  section?: string;
  description?: string;
  teacher_id?: string;
  instructor_name?: string;
  created_at: string;
  students_count?: number;
}

export default function FacultyClassroomsPage() {
  const { user, profile } = useAuth();
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Classroom Modal State
  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState(profile?.department || "Computer Science & Engineering");
  const [course, setCourse] = useState("B.Tech");
  const [branch, setBranch] = useState("CSE");
  const [year, setYear] = useState("3rd Year");
  const [section, setSection] = useState("Section A");
  const [semester, setSemester] = useState("Semester 5");
  const [description, setDescription] = useState("");

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      // Query real classrooms from public.courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;

      // Query student enrollment count for each course from course_members
      const { data: membersData } = await supabase
        .from("course_members")
        .select("course_id, role")
        .eq("role", "student");

      const studentCounts: Record<string, number> = {};
      if (membersData) {
        membersData.forEach((m) => {
          studentCounts[m.course_id] = (studentCounts[m.course_id] || 0) + 1;
        });
      }

      const formatted: ClassroomData[] = (coursesData || []).map((c: any) => ({
        ...c,
        students_count: studentCounts[c.id] || 0,
      }));

      setClassrooms(formatted);
    } catch (err: any) {
      console.error("Failed to load classrooms:", err);
      toast.error("Failed to load classrooms: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      toast.error("Course title and code are required");
      return;
    }

    setCreateLoading(true);
    try {
      const { data: newCourse, error } = await supabase
        .from("courses")
        .insert({
          title: title.trim(),
          code: code.trim().toUpperCase(),
          department: department.trim(),
          course: course.trim(),
          branch: branch.trim(),
          year: year.trim(),
          section: section.trim(),
          semester: semester.trim(),
          description: description.trim(),
          teacher_id: user?.id,
          instructor_name: profile?.name || user?.email || "Instructor",
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically enroll instructor in course_members as faculty
      if (user?.id && newCourse?.id) {
        await supabase
          .from("course_members")
          .insert({
            course_id: newCourse.id,
            user_id: user.id,
            role: "faculty",
          })
          .maybeSingle();
      }

      toast.success(`Classroom "${title}" created successfully!`);
      setTitle("");
      setCode("");
      setDescription("");
      setOpenCreate(false);
      fetchClassrooms();
    } catch (err: any) {
      console.error("Create classroom error:", err);
      toast.error("Failed to create classroom: " + err.message);
    } finally {
      setCreateLoading(false);
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
                Academic Cohort Management
              </Badge>
              <span className="text-xs text-muted-foreground">• Active Instruction Portfolios</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              My Classrooms
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage classroom content, organize student rosters, publish synchronized coursework, and inspect diagnostic performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setOpenCreate(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm shadow-indigo-600/20"
            >
              <Plus className="h-4 w-4" />
              + Create Classroom
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-sm text-muted-foreground">Loading institutional classrooms...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center shadow-none bg-muted/20">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No classrooms created yet</h3>
                <p className="text-xs text-muted-foreground">
                  Create your first academic cohort to organize your curriculum, enroll students, and publish official assignments.
                </p>
              </div>
              <Button
                onClick={() => setOpenCreate(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Create First Classroom
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {classrooms.map((cls) => (
              <Card key={cls.id} className="shadow-card border hover:border-indigo-500/40 transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs font-mono">
                          Code: {cls.code}
                        </Badge>
                        {cls.branch && (
                          <Badge variant="secondary" className="text-xs">
                            {cls.branch}
                          </Badge>
                        )}
                        {cls.year && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {cls.year}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl font-bold text-foreground">{cls.title}</CardTitle>
                      <CardDescription>
                        {cls.description || `${cls.department} • ${cls.section || "Cohort"}`}
                      </CardDescription>
                    </div>
                    <Badge className="bg-indigo-600 text-white text-xs">Instructor</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Cohort Key Numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 border text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">Enrolled Students</div>
                      <div className="text-lg font-bold text-foreground">{cls.students_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Semester</div>
                      <div className="text-lg font-bold text-indigo-600">{cls.semester || "Active"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Department</div>
                      <div className="text-xs font-semibold text-foreground truncate mt-1">
                        {cls.department?.split(" ")[0] || "Engg"}
                      </div>
                    </div>
                  </div>

                  {/* Quick links to classroom features */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <Link
                      to="/faculty/students"
                      className="p-2.5 rounded-xl border bg-card hover:bg-muted text-center space-y-1 transition-colors"
                    >
                      <Users className="h-4 w-4 mx-auto text-indigo-600" />
                      <span className="font-semibold block">Students</span>
                    </Link>

                    <Link
                      to="/faculty/assignments"
                      className="p-2.5 rounded-xl border bg-card hover:bg-muted text-center space-y-1 transition-colors"
                    >
                      <ClipboardList className="h-4 w-4 mx-auto text-blue-600" />
                      <span className="font-semibold block">Assignments</span>
                    </Link>

                    <Link
                      to="/faculty/quizzes"
                      className="p-2.5 rounded-xl border bg-card hover:bg-muted text-center space-y-1 transition-colors"
                    >
                      <FileCheck2 className="h-4 w-4 mx-auto text-purple-600" />
                      <span className="font-semibold block">Quizzes</span>
                    </Link>

                    <Link
                      to="/faculty/analytics"
                      className="p-2.5 rounded-xl border bg-card hover:bg-muted text-center space-y-1 transition-colors"
                    >
                      <Award className="h-4 w-4 mx-auto text-emerald-600" />
                      <span className="font-semibold block">Insights</span>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                    <span>Created: {new Date(cls.created_at).toLocaleDateString()}</span>
                    <Link to="/faculty/students">
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 hover:text-indigo-700 font-semibold gap-1">
                        Manage Cohort
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Create Classroom */}
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Create Official Academic Classroom
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set up a new course cohort to manage assignments, quizzes, and enrolled students.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateClassroom} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Course / Subject Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Database Management Systems"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Course Code *</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS301"
                    className="text-xs font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Department *</Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Program / Course</Label>
                  <Input
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. B.Tech"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Branch</Label>
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. CSE"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Academic Year</Label>
                  <Input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 3rd Year"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Section / Cohort</Label>
                  <Input
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. Section A"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Course Description / Learning Objectives</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of curriculum, concepts covered, and key outcomes..."
                  className="text-xs h-20"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenCreate(false)}
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  disabled={createLoading}
                >
                  {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Create Classroom
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
