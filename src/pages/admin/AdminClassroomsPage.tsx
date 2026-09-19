import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Building2,
  Plus,
  Users,
  GraduationCap,
  BookOpen,
  Search,
  Trash2,
  Loader2,
  Layers,
  Sparkles,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ClassroomItem {
  id: string;
  name: string;
  course: string;
  branch: string;
  year: number;
  section: string;
  academic_year: string;
  created_at: string;
  student_count?: number;
  faculty_count?: number;
}

export default function AdminClassroomsPage() {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Classroom Modal State
  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [name, setName] = useState("");
  const [course, setCourse] = useState("B.Tech");
  const [branch, setBranch] = useState("CSE");
  const [year, setYear] = useState("3");
  const [section, setSection] = useState("A");
  const [academicYear, setAcademicYear] = useState("2026-27");

  // Auto-generate Classroom Name suggestion
  useEffect(() => {
    if (course && branch && year && section) {
      setName(`${course} ${branch} - ${year}${section}`);
    }
  }, [course, branch, year, section]);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const { data: classData, error: classError } = await supabase
        .from("classrooms")
        .select(`
          id,
          name,
          course,
          branch,
          year,
          section,
          academic_year,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (classError) throw classError;

      // Fetch student and faculty counts
      const [membersRes, teachingRes] = await Promise.all([
        supabase.from("classroom_members").select("classroom_id"),
        supabase.from("teaching_assignments").select("classroom_id"),
      ]);

      const studentCounts: Record<string, number> = {};
      (membersRes.data || []).forEach((m: any) => {
        studentCounts[m.classroom_id] = (studentCounts[m.classroom_id] || 0) + 1;
      });

      const facultyCounts: Record<string, number> = {};
      (teachingRes.data || []).forEach((t: any) => {
        facultyCounts[t.classroom_id] = (facultyCounts[t.classroom_id] || 0) + 1;
      });

      const enriched = (classData || []).map((c: any) => ({
        ...c,
        student_count: studentCounts[c.id] || 0,
        faculty_count: facultyCounts[c.id] || 0,
      }));

      setClassrooms(enriched);
    } catch (err: any) {
      console.error("Failed to load classrooms:", err);
      toast.error("Failed to load classrooms: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !course.trim() || !branch.trim() || !section.trim()) {
      toast.error("Please fill in all classroom details.");
      return;
    }

    setCreateLoading(true);
    try {
      const { error } = await supabase.from("classrooms").insert({
        name: name.trim(),
        course: course.trim(),
        branch: branch.trim().toUpperCase(),
        year: parseInt(year, 10) || 1,
        section: section.trim().toUpperCase(),
        academic_year: academicYear.trim() || "2026-27",
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error(`Classroom "${name.trim()}" already exists.`);
        }
        throw error;
      }

      toast.success(`Classroom "${name}" created successfully!`);
      setOpenCreate(false);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.message || "Failed to create classroom.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteClassroom = async (id: string, className: string) => {
    if (!confirm(`Are you sure you want to delete classroom "${className}"? This will unlink enrolled students and teaching assignments.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("classrooms").delete().eq("id", id);
      if (error) throw error;
      toast.success(`Classroom "${className}" deleted.`);
      fetchClassrooms();
    } catch (err: any) {
      toast.error("Failed to delete classroom: " + (err.message || "Unknown error"));
    }
  };

  const filteredClassrooms = classrooms.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.course.toLowerCase().includes(q) ||
      c.branch.toLowerCase().includes(q) ||
      c.academic_year.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Classroom Management</h1>
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">
                Cohorts & Sections
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Define official institutional classrooms to which students are assigned and faculty are allocated.
            </p>
          </div>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25 text-xs font-semibold gap-1.5">
                <Plus className="h-4 w-4" />
                Create Classroom
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Create Institutional Classroom</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Specify the academic degree, branch, year, and section. Students and teachers will be allocated to this cohort.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateClassroom} className="space-y-3.5 py-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Course / Degree *</Label>
                    <Input
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      placeholder="e.g. B.Tech"
                      className="mt-1 h-9 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Branch / Dept *</Label>
                    <Input
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="e.g. CSE or ECE"
                      className="mt-1 h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Year (Number) *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="6"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="mt-1 h-9 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Section *</Label>
                    <Input
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="e.g. A"
                      className="mt-1 h-9 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Academic Year</Label>
                    <Input
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="2026-27"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Generated Classroom Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. B.Tech CSE - 3A"
                    className="mt-1 h-9 text-xs font-semibold bg-muted/30"
                    required
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    This unique identifier appears on student dashboards and faculty rosters.
                  </p>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpenCreate(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createLoading}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                  >
                    {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Save Classroom
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Active Classrooms</span>
                <div className="text-2xl font-bold mt-1 text-foreground">{classrooms.length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Total Enrolled Students</span>
                <div className="text-2xl font-bold mt-1 text-foreground">
                  {classrooms.reduce((acc, c) => acc + (c.student_count || 0), 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Allocated Teaching Subjects</span>
                <div className="text-2xl font-bold mt-1 text-foreground">
                  {classrooms.reduce((acc, c) => acc + (c.faculty_count || 0), 0)}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Classroom Directory</CardTitle>
                <CardDescription className="text-xs">
                  {classrooms.length} institutional cohorts provisioned
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search classrooms..."
                  className="pl-8 h-8 text-xs bg-muted/30"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-rose-600" />
              </div>
            ) : filteredClassrooms.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Building2 className="mx-auto h-9 w-9 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No classrooms found</p>
                <p className="text-xs mt-1">
                  Create your first classroom cohort using the "Create Classroom" button above.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="text-xs font-semibold">Classroom Name</TableHead>
                    <TableHead className="text-xs font-semibold">Degree / Branch</TableHead>
                    <TableHead className="text-xs font-semibold">Year & Section</TableHead>
                    <TableHead className="text-xs font-semibold">Academic Year</TableHead>
                    <TableHead className="text-xs font-semibold">Enrolled Students</TableHead>
                    <TableHead className="text-xs font-semibold">Assigned Subjects</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClassrooms.map((cls) => (
                    <TableRow
                      key={cls.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/classrooms/${cls.id}`)}
                    >
                      <TableCell className="font-semibold text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          <span className="hover:underline text-rose-600 dark:text-rose-400 font-bold">{cls.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {cls.course} ({cls.branch})
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        Year {cls.year} - Section {cls.section}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {cls.academic_year}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px] gap-1 font-semibold">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span>{cls.student_count || 0} students</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px] gap-1 font-semibold">
                          <BookOpen className="h-3 w-3 text-emerald-500" />
                          <span>{cls.faculty_count || 0} subjects</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => navigate(`/admin/classrooms/${cls.id}`)}
                          >
                            <Eye className="h-3 w-3" />
                            <span>Manage</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClassroom(cls.id, cls.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
