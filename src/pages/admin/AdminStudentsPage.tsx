import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  GraduationCap,
  Search,
  Download,
  Shield,
  BookOpen,
  KeyRound,
  Loader2,
  School,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StudentMember {
  id: string;
  name: string;
  email?: string;
  roll_number?: string;
  course?: string;
  branch?: string;
  year?: string;
  section?: string;
  created_at: string;
  classroom_name?: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Reset Password Dialog
  const [resetStudent, setResetStudent] = useState<StudentMember | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [studentsRes, membersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, email, roll_number, course, branch, year, section, created_at")
          .eq("role", "student")
          .order("created_at", { ascending: false }),
        supabase
          .from("classroom_members")
          .select("student_id, classroom_id, classroom:classrooms(name)"),
      ]);

      if (studentsRes.error) throw studentsRes.error;

      const classMap: Record<string, string> = {};
      (membersRes.data || []).forEach((m: any) => {
        if (m.classroom?.name) {
          classMap[m.student_id] = m.classroom.name;
        }
      });

      const enriched = (studentsRes.data || []).map((s: any) => ({
        ...s,
        classroom_name: classMap[s.id] || "",
      }));

      setStudents(enriched);
    } catch (err: any) {
      console.error("Failed to load students:", err);
      toast.error("Failed to load students list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStudent || !resetPasswordValue) return;

    if (resetPasswordValue.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await (supabase.rpc as any)("admin_reset_password", {
        p_user_id: resetStudent.id,
        p_new_password: resetPasswordValue,
      });

      if (error) throw error;

      toast.success(`Password updated for ${resetStudent.name} (${resetStudent.roll_number})`);
      setResetStudent(null);
      setResetPasswordValue("");
    } catch (err: any) {
      console.error("Failed to reset password:", err);
      toast.error(err.message || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const query = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(query) ||
      s.roll_number?.toLowerCase().includes(query) ||
      s.branch?.toLowerCase().includes(query) ||
      s.course?.toLowerCase().includes(query)
    );
  });

  const handleExportCSV = () => {
    if (students.length === 0) {
      toast.info("No students to export");
      return;
    }

    const headers = ["Roll Number", "Name", "Course", "Branch", "Year", "Section", "Created At"];
    const rows = students.map((s) => [
      s.roll_number || "",
      `"${s.name || ""}"`,
      `"${s.course || ""}"`,
      `"${s.branch || ""}"`,
      `"${s.year || ""}"`,
      `"${s.section || ""}"`,
      new Date(s.created_at).toLocaleDateString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `synapse_students_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Student roster exported to CSV");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Stats & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Management</h1>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-semibold text-xs">
                Classroom Cohorts
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Institutional student roster. Students are created and enrolled directly within their respective classrooms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={students.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Link to="/admin/classrooms">
                <School className="h-4 w-4" />
                <span>Enroll via Classrooms</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Enrolled Students</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{students.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <GraduationCap className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branches Represented</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {new Set(students.map((s) => s.branch).filter(Boolean)).size}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auth Method</p>
                <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  Roll Number + Password
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <KeyRound className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Student Roster Table */}
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Active Student Roster</CardTitle>
                <CardDescription className="text-xs">
                  All provisioned students in the institutional database.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Roll No, name, branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                <p className="text-sm text-muted-foreground">Loading student roster...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-base text-foreground">
                  {searchTerm ? "No students match your search" : "No student accounts created yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                  {searchTerm
                    ? "Try adjusting your search terms or clear the filter."
                    : "Students are enrolled and provisioned directly inside their assigned classrooms. Navigate to classrooms to add students."}
                </p>
                {!searchTerm && (
                  <Button
                    asChild
                    size="sm"
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Link to="/admin/classrooms">
                      <School className="h-4 w-4" />
                      <span>Open Classrooms to Add Students</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="w-[140px] font-semibold text-xs">Roll Number</TableHead>
                      <TableHead className="font-semibold text-xs">Student Name</TableHead>
                      <TableHead className="font-semibold text-xs">Assigned Classroom</TableHead>
                      <TableHead className="font-semibold text-xs">Course & Branch</TableHead>
                      <TableHead className="font-semibold text-xs">Year & Section</TableHead>
                      <TableHead className="font-semibold text-xs">Created Date</TableHead>
                      <TableHead className="text-right font-semibold text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono font-bold text-xs text-foreground">
                          <span className="bg-muted px-2 py-1 rounded-md border text-primary">
                            {s.roll_number || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{s.name}</div>
                          {s.email && <div className="text-[11px] text-muted-foreground">{s.email}</div>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.classroom_name ? (
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] font-semibold">
                              {s.classroom_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium text-foreground">{s.course || "B.Tech"}</span>
                          <span className="text-muted-foreground"> • {s.branch || "General"}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="secondary" className="text-[10px] font-medium mr-1.5">
                            {s.year || "Year 1"}
                          </Badge>
                          <span className="text-muted-foreground text-[11px]">Sec {s.section || "A"}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(s.created_at).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => {
                              setResetStudent(s);
                              setResetPasswordValue(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`);
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5 text-rose-500" />
                            <span>Reset Password</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>



        {/* Dialog: Reset Student Password */}
        <Dialog open={!!resetStudent} onOpenChange={(open) => !open && setResetStudent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-rose-600" />
                <span>Reset Student Password</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update password for {resetStudent?.name} ({resetStudent?.roll_number}). The student can log in with this new password.
              </DialogDescription>
            </DialogHeader>

            {resetStudent && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reset-pw" className="text-xs font-semibold">New Password *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] text-rose-600 px-1.5"
                      onClick={() => setResetPasswordValue(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`)}
                    >
                      Generate Random
                    </Button>
                  </div>
                  <Input
                    id="reset-pw"
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="font-mono text-sm"
                    required
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResetStudent(null)}
                    disabled={resetLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={resetLoading}
                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                  >
                    {resetLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
