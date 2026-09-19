import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BookOpen,
  Plus,
  Users,
  Building2,
  GraduationCap,
  Search,
  Trash2,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TeachingAssignmentItem {
  id: string;
  faculty_id: string;
  classroom_id: string;
  subject_name: string;
  subject_code: string;
  created_at: string;
  faculty?: {
    name: string;
    faculty_id: string;
    department: string;
    designation: string;
  };
  classroom?: {
    name: string;
    course: string;
    branch: string;
    section: string;
  };
}

interface FacultyOption {
  id: string;
  name: string;
  faculty_id: string;
  department: string;
}

interface ClassroomOption {
  id: string;
  name: string;
  course: string;
  branch: string;
  section: string;
}

export default function AdminTeachingAssignmentsPage() {
  const [assignments, setAssignments] = useState<TeachingAssignmentItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [classroomList, setClassroomList] = useState<ClassroomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Assign Teacher Modal State
  const [openAssign, setOpenAssign] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch teaching assignments joined with faculty profile and classroom
      const { data: assignData, error: assignError } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          faculty_id,
          classroom_id,
          subject_name,
          subject_code,
          created_at,
          faculty:profiles!teaching_assignments_faculty_id_fkey(name, faculty_id, department, designation),
          classroom:classrooms!teaching_assignments_classroom_id_fkey(name, course, branch, section)
        `)
        .order("created_at", { ascending: false });

      if (assignError) throw assignError;
      setAssignments((assignData || []) as any[]);

      // 2. Fetch faculty options
      const { data: facData } = await supabase
        .from("profiles")
        .select("id, name, faculty_id, department")
        .eq("role", "faculty")
        .order("name", { ascending: true });
      setFacultyList((facData || []) as any[]);

      // 3. Fetch classroom options
      const { data: classData } = await supabase
        .from("classrooms")
        .select("id, name, course, branch, section")
        .order("name", { ascending: true });
      setClassroomList((classData || []) as any[]);
    } catch (err: any) {
      console.error("Failed to load teaching assignments:", err);
      toast.error("Failed to load teaching assignments: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId || !selectedClassroomId || !subjectName.trim() || !subjectCode.trim()) {
      toast.error("Please select a Faculty, Classroom, and provide Subject Name and Code.");
      return;
    }

    setAssignLoading(true);
    try {
      const cleanCode = subjectCode.trim().toUpperCase();
      const { error } = await supabase.from("teaching_assignments").insert({
        faculty_id: selectedFacultyId,
        classroom_id: selectedClassroomId,
        subject_name: subjectName.trim(),
        subject_code: cleanCode,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This faculty member is already assigned to this subject code in this classroom.");
        }
        throw error;
      }

      toast.success(`Assigned ${subjectName} to teacher successfully!`);
      setSubjectName("");
      setSubjectCode("");
      setSelectedFacultyId("");
      setSelectedClassroomId("");
      setOpenAssign(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create teaching assignment.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: string, subject: string) => {
    if (!confirm(`Are you sure you want to remove the teaching assignment for ${subject}?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("teaching_assignments").delete().eq("id", id);
      if (error) throw error;
      toast.success("Teaching assignment removed.");
      fetchData();
    } catch (err: any) {
      toast.error("Failed to delete teaching assignment: " + (err.message || "Unknown error"));
    }
  };

  const filtered = assignments.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.subject_name.toLowerCase().includes(q) ||
      a.subject_code.toLowerCase().includes(q) ||
      (a.faculty?.name && a.faculty.name.toLowerCase().includes(q)) ||
      (a.classroom?.name && a.classroom.name.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Teaching Assignments</h1>
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">
                Faculty ↔ Subject ↔ Classroom
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Authorize instructors to teach specific academic subjects in targeted classroom cohorts.
            </p>
          </div>

          <Dialog open={openAssign} onOpenChange={setOpenAssign}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25 text-xs font-semibold gap-1.5">
                <Plus className="h-4 w-4" />
                Assign Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">New Teaching Assignment</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Connect a faculty member to a specific subject and classroom cohort. The instructor will have subject-scoped access to this class.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateAssignment} className="space-y-3.5 py-3 text-xs">
                <div>
                  <Label className="text-xs font-medium">Select Faculty Member *</Label>
                  <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
                    <SelectTrigger className="mt-1 h-9 text-xs bg-card">
                      <SelectValue placeholder="Choose Instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyList.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name} ({f.faculty_id || "ID"}) • {f.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {facultyList.length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600">No faculty members found. Provision faculty first.</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium">Select Target Classroom *</Label>
                  <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
                    <SelectTrigger className="mt-1 h-9 text-xs bg-card">
                      <SelectValue placeholder="Choose Classroom Cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {classroomList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.course} {c.branch})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {classroomList.length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600">No classrooms found. Create classrooms first.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Subject Name *</Label>
                    <Input
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. DBMS"
                      className="mt-1 h-9 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Subject Code *</Label>
                    <Input
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      placeholder="e.g. CS301"
                      className="mt-1 h-9 text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpenAssign(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={assignLoading || facultyList.length === 0 || classroomList.length === 0}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                  >
                    {assignLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Confirm Assignment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Total Teaching Allocations</span>
                <div className="text-2xl font-bold mt-1 text-foreground">{assignments.length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Faculty on Duty</span>
                <div className="text-2xl font-bold mt-1 text-foreground">
                  {new Set(assignments.map((a) => a.faculty_id)).size}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Classrooms Covered</span>
                <div className="text-2xl font-bold mt-1 text-foreground">
                  {new Set(assignments.map((a) => a.classroom_id)).size}
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="p-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Allocated Teaching Assignments</CardTitle>
                <CardDescription className="text-xs">
                  {assignments.length} active subject authorizations across all cohorts
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search subject, faculty, class..."
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
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <BookOpen className="mx-auto h-9 w-9 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No teaching assignments found</p>
                <p className="text-xs mt-1">
                  Assign faculty to subjects and classrooms using the "Assign Teacher" button above.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="text-xs font-semibold">Subject & Code</TableHead>
                    <TableHead className="text-xs font-semibold">Target Classroom</TableHead>
                    <TableHead className="text-xs font-semibold">Assigned Faculty</TableHead>
                    <TableHead className="text-xs font-semibold">Department</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400 font-mono text-[10px]">
                            {item.subject_code}
                          </Badge>
                          <span>{item.subject_name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span>{item.classroom?.name || "Classroom"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground">{item.faculty?.name || "Instructor"}</div>
                          <div className="text-[11px] text-muted-foreground">
                            ID: <span className="font-mono">{item.faculty?.faculty_id || "N/A"}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {item.faculty?.department || "General"}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAssignment(item.id, `${item.subject_name} (${item.classroom?.name})`)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
