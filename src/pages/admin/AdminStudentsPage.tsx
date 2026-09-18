import { useEffect, useState } from "react";
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
  UserPlus,
  GraduationCap,
  Search,
  Download,
  Copy,
  Check,
  Shield,
  BookOpen,
  KeyRound,
  Loader2,
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
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Student Dialog
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRollNumber, setFormRollNumber] = useState("");
  const [formCourse, setFormCourse] = useState("B.Tech");
  const [formBranch, setFormBranch] = useState("Computer Science & Engineering");
  const [formYear, setFormYear] = useState("3rd Year");
  const [formSection, setFormSection] = useState("A");
  const [formPassword, setFormPassword] = useState("");

  // Success Credential Dialog
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    roll_number: string;
    course: string;
    branch: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, roll_number, course, branch, year, section, created_at")
        .eq("role", "student")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents((data as StudentMember[]) || []);
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

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRollNumber || !formPassword) {
      toast.error("Please fill in Name, Roll Number, and Password.");
      return;
    }

    setCreateLoading(true);
    try {
      const cleanRoll = formRollNumber.trim().toUpperCase();
      const { data, error } = await (supabase.rpc as any)("admin_create_student", {
        p_name: formName.trim(),
        p_roll_number: cleanRoll,
        p_course: formCourse,
        p_branch: formBranch,
        p_year: formYear,
        p_section: formSection,
        p_password: formPassword,
      });

      if (error) {
        throw error;
      }

      toast.success(`Student ${formName} successfully provisioned!`);

      setCreatedCredentials({
        name: formName.trim(),
        roll_number: cleanRoll,
        course: formCourse,
        branch: formBranch,
        password: formPassword,
      });

      // Reset form
      setFormName("");
      setFormRollNumber("");
      setFormPassword("");
      setOpenCreateDialog(false);

      // Refresh list
      fetchStudents();
    } catch (err: any) {
      console.error("Failed to create student:", err);
      toast.error(err.message || "Failed to create student account.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `SYNAPSE STUDENT LOGIN CREDENTIALS
Student Name: ${createdCredentials.name}
Roll Number / Login ID: ${createdCredentials.roll_number}
Course & Branch: ${createdCredentials.course} - ${createdCredentials.branch}
Initial Password: ${createdCredentials.password}
Portal URL: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
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
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold text-xs">
                Admin Provisioned
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create and provision institutional student accounts with Roll Number credentials.
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
              size="sm"
              onClick={() => {
                setFormPassword(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`);
                setOpenCreateDialog(true);
              }}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Student</span>
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
                    : "As Administrator, you provision all student accounts. Students will use their Roll Number to log in."}
                </p>
                {!searchTerm && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setFormPassword(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`);
                      setOpenCreateDialog(true);
                    }}
                    className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Create First Student</span>
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
                      <TableHead className="font-semibold text-xs">Course & Branch</TableHead>
                      <TableHead className="font-semibold text-xs">Year & Section</TableHead>
                      <TableHead className="font-semibold text-xs">Created Date</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog: Create Student */}
        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-rose-600" />
                <span>Create Student Account</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enter student details to generate login credentials. The student will sign in with their Roll Number and password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="s-name" className="text-xs font-semibold">Full Name *</Label>
                <Input
                  id="s-name"
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s-roll" className="text-xs font-semibold">Roll Number / Login ID *</Label>
                <Input
                  id="s-roll"
                  placeholder="e.g. 21BCE1001"
                  value={formRollNumber}
                  onChange={(e) => setFormRollNumber(e.target.value.toUpperCase())}
                  className="font-mono uppercase text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-course" className="text-xs font-semibold">Course</Label>
                  <Input
                    id="s-course"
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value)}
                    placeholder="B.Tech"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-branch" className="text-xs font-semibold">Branch</Label>
                  <Input
                    id="s-branch"
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    placeholder="CSE"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-year" className="text-xs font-semibold">Year</Label>
                  <Input
                    id="s-year"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="3rd Year"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-section" className="text-xs font-semibold">Section</Label>
                  <Input
                    id="s-section"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="A"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="s-password" className="text-xs font-semibold">Initial Password *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] text-rose-600 px-1.5"
                    onClick={() => setFormPassword(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`)}
                  >
                    Generate Random
                  </Button>
                </div>
                <Input
                  id="s-password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Enter initial password"
                  className="font-mono text-xs"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenCreateDialog(false)}
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                >
                  {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create Account</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog: Success Credentials */}
        <Dialog open={!!createdCredentials} onOpenChange={(open) => !open && setCreatedCredentials(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Check className="h-5 w-5" />
                <span>Student Account Provisioned</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Copy and share these credentials with the student. They will log in using their Roll Number.
              </DialogDescription>
            </DialogHeader>

            {createdCredentials && (
              <div className="space-y-3 py-2">
                <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Full Name:</span>
                    <span className="font-semibold text-foreground">{createdCredentials.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Roll Number (Login ID):</span>
                    <span className="font-mono font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {createdCredentials.roll_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Course & Branch:</span>
                    <span className="text-foreground">{createdCredentials.course} - {createdCredentials.branch}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Initial Password:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {createdCredentials.password}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Login URL:</span>
                    <span className="font-mono text-[11px] text-muted-foreground">/login</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "Copied to Clipboard!" : "Copy Student Credentials"}</span>
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreatedCredentials(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
