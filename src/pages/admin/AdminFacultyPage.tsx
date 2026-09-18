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
  Users,
  Search,
  Download,
  Copy,
  Check,
  Shield,
  Building,
  Mail,
  KeyRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FacultyMember {
  id: string;
  name: string;
  email: string;
  faculty_id: string;
  department: string;
  designation: string;
  created_at: string;
}

export default function AdminFacultyPage() {
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Create Dialog
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formFacultyId, setFormFacultyId] = useState("");
  const [formDepartment, setFormDepartment] = useState("Computer Science & Engineering");
  const [formDesignation, setFormDesignation] = useState("Associate Professor");

  // Success Credential Dialog
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    faculty_id: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, faculty_id, department, designation, created_at")
        .eq("role", "faculty")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (data) {
        setFacultyList(data as FacultyMember[]);
      } else {
        setFacultyList([]);
      }
    } catch (err: any) {
      console.error("Failed to load faculty:", err);
      toast.error("Failed to load faculty roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPassword || !formName || !formFacultyId) {
      toast.error("Please fill in Name, Faculty ID, and Password");
      return;
    }

    setCreateLoading(true);
    try {
      const cleanFacultyId = formFacultyId.trim().toUpperCase();
      const { data, error } = await supabase.rpc("admin_create_faculty", {
        p_name: formName.trim(),
        p_faculty_id: cleanFacultyId,
        p_department: formDepartment,
        p_designation: formDesignation,
        p_password: formPassword,
        p_email: formEmail.trim() ? formEmail.trim() : null,
      });

      if (error) {
        toast.error("Failed to create faculty: " + error.message);
        return;
      }

      toast.success(`Faculty account created for ${formName}!`);
      setCreatedCredentials({
        name: formName,
        email: formEmail.trim() || `${cleanFacultyId.toLowerCase()}@faculty.synapse.local`,
        faculty_id: cleanFacultyId,
        password: formPassword,
      });

      // Reset form
      setFormEmail("");
      setFormPassword("");
      setFormName("");
      setFormFacultyId("");
      setOpenCreateDialog(false);

      // Refresh roster
      fetchFaculty();
    } catch (err: any) {
      toast.error("Unexpected error: " + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `SYNAPSE FACULTY CREDENTIALS\nName: ${createdCredentials.name}\nFaculty ID / Login ID: ${createdCredentials.faculty_id}\nInitial Password: ${createdCredentials.password}\nLogin Portal: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    if (!facultyList.length) return;
    const headers = ["Faculty ID", "Name", "Email", "Department", "Designation", "Created At"];
    const rows = facultyList.map((f) => [
      `"${f.faculty_id || ""}"`,
      `"${f.name || ""}"`,
      `"${f.email || ""}"`,
      `"${f.department || ""}"`,
      `"${f.designation || ""}"`,
      `"${new Date(f.created_at).toLocaleDateString()}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `synapse_faculty_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Faculty roster CSV exported");
  };

  const filtered = facultyList.filter(
    (f) =>
      f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.faculty_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Faculty Account Management</h1>
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs">
                Tier 2 Authorities
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Only Administrators can provision faculty accounts. Faculty members are authorized to create classrooms and student accounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Roster CSV
            </Button>
            <Button
              onClick={() => setOpenCreateDialog(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25 text-xs font-semibold"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              + Create Faculty Account
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search faculty by name, ID, or department..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Badge variant="outline" className="text-xs py-1.5 px-3 text-muted-foreground">
            {filtered.length} Faculty Member{filtered.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Faculty Roster Table */}
        <Card className="border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead>Faculty ID</TableHead>
                <TableHead>Name & Contact</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Role Authority</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <span className="text-xs text-muted-foreground mt-2 block">Loading faculty roster...</span>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs space-y-2">
                    {facultyList.length === 0 ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground text-sm">No faculty accounts provisioned yet</p>
                        <p className="text-xs text-muted-foreground">Click "+ Create Faculty Account" above to create the first institutional instructor.</p>
                      </div>
                    ) : (
                      <p>No faculty accounts found matching "{searchTerm}".</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((faculty) => (
                  <TableRow key={faculty.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-semibold text-xs text-indigo-600 dark:text-indigo-400">
                      {faculty.faculty_id || "FAC-101"}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground text-xs">{faculty.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />
                        {faculty.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{faculty.department || "Computer Science"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{faculty.designation || "Faculty"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800">
                        Course Instructor
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(faculty.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Modal: Create Faculty Account */}
        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-rose-600" />
                Create Official Faculty Account
              </DialogTitle>
              <DialogDescription className="text-xs">
                Creates an institutional faculty account. The faculty member can sign in using their Faculty ID and password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateFaculty} className="space-y-3.5 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Faculty ID *</Label>
                  <Input
                    value={formFacultyId}
                    onChange={(e) => setFormFacultyId(e.target.value)}
                    placeholder="FAC-CS-105"
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Prof. Jane Doe"
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Official Email <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="jane.doe@synapse.edu (Optional)"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Initial Password *</Label>
                <Input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Input
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Designation</Label>
                  <Input
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="Assistant / Associate Prof"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenCreateDialog(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                  disabled={createLoading}
                >
                  {createLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Provision Faculty Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Credentials Ready for Delivery */}
        <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base text-emerald-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Faculty Account Created Successfully
              </DialogTitle>
              <DialogDescription className="text-xs">
                Deliver these credentials to the faculty member so they can access the Faculty Portal.
              </DialogDescription>
            </DialogHeader>

            {createdCredentials && (
              <div className="p-3.5 rounded-xl border bg-muted/50 space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground font-sans">Name:</span>
                  <span className="font-semibold">{createdCredentials.name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground font-sans">Faculty ID:</span>
                  <span className="font-semibold text-indigo-600">{createdCredentials.faculty_id}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground font-sans">Email:</span>
                  <span>{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground font-sans">Password:</span>
                  <span className="text-rose-600 font-bold">{createdCredentials.password}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground font-sans">Portal URL:</span>
                  <span className="text-primary truncate">/faculty/login</span>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCredentials}
                className="flex-1 text-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copied ? "Copied!" : "Copy Credentials"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setCreatedCredentials(null)}
                className="text-xs"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
